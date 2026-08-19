import type { TrackmanClubId } from '../src/types/clubs.js';
import { HCP_BASELINE } from '../src/constants/defaults.js';
import { MPH_TO_MPS, M_TO_YD, YD_TO_M } from '../src/constants/units.js';
import { solveBallSpeedForCarry } from '../src/physics/solve.js';
import { simulateFlight } from '../src/physics/trajectory.js';
import { clamp } from '../src/utils/math.js';
import { normalizeHandicap } from '../src/utils/personalization.js';
import { clampToBand, clubLaunchBand } from '../src/methods/launchBands.js';
import { LPGA_ANCHOR_PROFILE } from '../src/methods/LPGA_Anchor.js';
import { PGA_ANCHOR_PROFILE } from '../src/methods/PGA_Anchor.js';

export interface AnchorHarness {
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
  spinAxisDeg: number;
  launchDirectionDeg: number;
  effectiveMassKg: number;
  maxHeightM: number;
  landingAngleDeg: number;
  stockCarryM: number;
}

/* Beat pga stock by 6+ yd -> skip the hcp gradient. OTTOM1, 14.08.2026 */

export const PGA_EXCEED_MARGIN_YD = 6;

/** Modern low-spin/distance gear: per 3 hcp above scratch. OTTOM1, 14.08.2026 */
const HCP_SHAPE_STEP = 3;
const SPIN_DROP_PER_HCP_STEP_RPM = 150;
const LAUNCH_GAIN_PER_HCP_STEP_DEG = 0.5;
const APEX_DROP_PER_HCP_STEP_M = 0.2;
const LANDING_DROP_PER_HCP_STEP_DEG = 0.3;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface HandicapFlightAdjustments {
  spinDeltaRpm: number;
  launchDeltaDeg: number;
  apexDeltaM: number;
  landingDeltaDeg: number;
}

function handicapShapeSteps(hcp: number): number {
  const h = normalizeHandicap(hcp);
  if (h <= 0) return 0;
  return Math.floor(h / HCP_SHAPE_STEP);
}

/**
 * Carry stays fixed; higher hcp -> less spin, more launch, lower apex/landing (penetrating flight).
 * Ball speed is solved afterward so the flight still matches carry.
 * 
 * OTTOM1, 19.08.2026
 */
export function handicapFlightAdjustments(
  hcp: number = HCP_BASELINE,
): HandicapFlightAdjustments {
  const steps = handicapShapeSteps(hcp);
  if (steps === 0) {
    return { spinDeltaRpm: 0, launchDeltaDeg: 0, apexDeltaM: 0, landingDeltaDeg: 0 };
  }
  return {
    spinDeltaRpm: -SPIN_DROP_PER_HCP_STEP_RPM * steps,
    launchDeltaDeg: LAUNCH_GAIN_PER_HCP_STEP_DEG * steps,
    apexDeltaM: -APEX_DROP_PER_HCP_STEP_M * steps,
    landingDeltaDeg: -LANDING_DROP_PER_HCP_STEP_DEG * steps,
  };
}

export interface HandicapLaunchSpinAdjustments {
  spinDeltaRpm: number;
  launchDeltaDeg: number;
}

export function handicapLaunchSpinAdjustments(
  hcp: number = HCP_BASELINE,
): HandicapLaunchSpinAdjustments {
  const adj = handicapFlightAdjustments(hcp);
  return { spinDeltaRpm: adj.spinDeltaRpm, launchDeltaDeg: adj.launchDeltaDeg };
}

function applyHandicapLaunchSpinShape(
  launchAngleDeg: number,
  spinRPM: number,
  hcp: number,
): { launchAngleDeg: number; spinRPM: number } {
  const adj = handicapFlightAdjustments(hcp);
  return {
    launchAngleDeg: launchAngleDeg + adj.launchDeltaDeg,
    spinRPM: spinRPM + adj.spinDeltaRpm,
  };
}

function applyHandicapFlightMetrics(
  scratchMaxHeightM: number,
  scratchLandingAngleDeg: number,
  hcp: number,
): { maxHeightM: number; landingAngleDeg: number } {
  const adj = handicapFlightAdjustments(hcp);
  return {
    maxHeightM: scratchMaxHeightM + adj.apexDeltaM,
    landingAngleDeg: scratchLandingAngleDeg + adj.landingDeltaDeg,
  };
}

function shapeLaunchSpinForCarry(
  clubId: TrackmanClubId,
  carryM: number,
  handicap: number,
): { launchAngleDeg: number; spinRPM: number } {
  const harness = buildAnchorHarness(clubId, carryM);
  const band = clubLaunchBand(clubId);
  const hcpShaped = applyHandicapLaunchSpinShape(
    harness.launchAngleDeg,
    harness.spinRPM,
    handicap,
  );

  let { launchAngleDeg, spinRPM } = clampToBand(band, hcpShaped.launchAngleDeg, hcpShaped.spinRPM);
  ({ launchAngleDeg, spinRPM } = applyLongCarryShape(clubId, carryM, launchAngleDeg, spinRPM));
  ({ launchAngleDeg, spinRPM } = applyIronCarryExcessShape(clubId, carryM, launchAngleDeg, spinRPM));
  ({ launchAngleDeg, spinRPM } = applyIronShortCarryShape(clubId, carryM, launchAngleDeg, spinRPM));
  ({ launchAngleDeg, spinRPM } = clampToBand(band, launchAngleDeg, spinRPM));
  return { launchAngleDeg, spinRPM };
}

function resolveScratchFlightMetrics(
  clubId: TrackmanClubId,
  carryM: number,
  launchAngleDeg: number,
  spinRPM: number,
): { maxHeightM: number; landingAngleDeg: number } {
  const carryYd = carryM * M_TO_YD;
  const pga = PGA_ANCHOR_PROFILE[clubId];
  const band = clubLaunchBand(clubId);

  if (clubId === 'Driver' && carryYd <= LONG_DRIVER_EMPIRICAL_MAX_YD) {
    const ballSpeedMs = tourCalibratedDriverSpeedMs(carryYd, launchAngleDeg, spinRPM, carryM);
    const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM });
    return {
      maxHeightM: flight.apexM * APEX_CALIBRATION,
      landingAngleDeg: flight.landingAngleDeg,
    };
  }

  if (isMidIron(clubId)) {
    const pgaCarryYd = pga.stockCarryM * M_TO_YD;
    const stockApexM = ironStockReferenceApexM(clubId, 0);
    const pgaShape = shapedIronLaunchSpin(clubId, pga.stockCarryM, 0, false);

    let ballSpeedMs = solveBallSpeedForCarry(carryM, launchAngleDeg, spinRPM);
    const scaledSpin = clampToBand(
      band,
      launchAngleDeg,
      spinScaledToBallSpeed(spinRPM, ballSpeedMs, pga.ballSpeedMs),
    ).spinRPM;
    ballSpeedMs = solveBallSpeedForCarry(carryM, launchAngleDeg, scaledSpin);
    const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM: scaledSpin });

    const maxHeightM =
      carryYd > pgaCarryYd
        ? ironGradualApexM(
            carryYd,
            pgaCarryYd,
            stockApexM,
            scaledSpin,
            pgaShape.spinRPM,
            launchAngleDeg,
            pgaShape.launchAngleDeg,
          )
        : flight.apexM * APEX_CALIBRATION;

    return { maxHeightM, landingAngleDeg: flight.landingAngleDeg };
  }

  const ballSpeedMs = solveBallSpeedForCarry(carryM, launchAngleDeg, spinRPM);
  const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM });
  return {
    maxHeightM: flight.apexM * APEX_CALIBRATION,
    landingAngleDeg: flight.landingAngleDeg,
  };
}

function referenceClubForLpgaFallback(clubId: TrackmanClubId): TrackmanClubId {
  if (clubId === 'Driver' || clubId.endsWith('Wood') || clubId === 'Hybrid') return 'Driver';
  if (clubId.endsWith('Wedge') || clubId.includes('°')) return 'P-Wedge';
  return '7-iron';
}

function scalePgaToLpgaTier(clubId: TrackmanClubId): AnchorHarness {
  const pga = PGA_ANCHOR_PROFILE[clubId];
  const refClub = referenceClubForLpgaFallback(clubId);
  const pgaRef = PGA_ANCHOR_PROFILE[refClub];
  const lpgaRef = LPGA_ANCHOR_PROFILE[refClub as keyof typeof LPGA_ANCHOR_PROFILE];

  const speedR = lpgaRef.ballSpeedMs / pgaRef.ballSpeedMs;
  const carryR = lpgaRef.stockCarryM / pgaRef.stockCarryM;
  const spinR = lpgaRef.spinRPM / pgaRef.spinRPM;
  const heightR = lpgaRef.maxHeightM / pgaRef.maxHeightM;

  return {
    ballSpeedMs: pga.ballSpeedMs * speedR,
    launchAngleDeg: pga.launchAngleDeg + (lpgaRef.launchAngleDeg - pgaRef.launchAngleDeg),
    spinRPM: pga.spinRPM * spinR,
    spinAxisDeg: pga.spinAxisDeg,
    launchDirectionDeg: pga.launchDirectionDeg,
    effectiveMassKg: pga.effectiveMassKg,
    maxHeightM: pga.maxHeightM * heightR,
    landingAngleDeg: pga.landingAngleDeg + (lpgaRef.landingAngleDeg - pgaRef.landingAngleDeg),
    stockCarryM: pga.stockCarryM * carryR,
  };
}

function getLpgaAnchor(clubId: TrackmanClubId): AnchorHarness {
  if (clubId in LPGA_ANCHOR_PROFILE) {
    return { ...LPGA_ANCHOR_PROFILE[clubId as keyof typeof LPGA_ANCHOR_PROFILE] };
  }
  return scalePgaToLpgaTier(clubId);
}

/* Blend LPGA→PGA by where carry sits between their stock numbers. OTTOM1, 18.08.2026 */
export function buildAnchorHarness(clubId: TrackmanClubId, carryM: number): AnchorHarness {
  const pga = PGA_ANCHOR_PROFILE[clubId];
  const lpga = getLpgaAnchor(clubId);

  const span = pga.stockCarryM - lpga.stockCarryM;
  const t = span > 1e-6 ? clamp((carryM - lpga.stockCarryM) / span, 0, 1) : 1;

  return {
    ballSpeedMs: lerp(lpga.ballSpeedMs, pga.ballSpeedMs, t),
    launchAngleDeg: lerp(lpga.launchAngleDeg, pga.launchAngleDeg, t),
    spinRPM: lerp(lpga.spinRPM, pga.spinRPM, t),
    maxHeightM: lerp(lpga.maxHeightM, pga.maxHeightM, t),
    landingAngleDeg: lerp(lpga.landingAngleDeg, pga.landingAngleDeg, t),
    stockCarryM: lerp(lpga.stockCarryM, pga.stockCarryM, t),
    spinAxisDeg: pga.spinAxisDeg,
    launchDirectionDeg: pga.launchDirectionDeg,
    effectiveMassKg: pga.effectiveMassKg,
  };
}

export function exceedsPgaCarryMargin(carryM: number, pgaCarryM: number): boolean {
  return carryM > pgaCarryM + PGA_EXCEED_MARGIN_YD * YD_TO_M;
}

/*
 * Long-drive shape from measured tour bombs (fix.md)
 * OTTOM1, 17.08.2026
 */
const LONG_BOMB_CARRY_YD = 323;
const LONG_BOMB_LAUNCH_DEG = 9.8;
const LONG_BOMB_SPIN_RPM = 2223;


const BOMB_SHAPE_FULL_EXCESS_YD = LONG_BOMB_CARRY_YD - 282;

function longCarryShapeWeight(clubId: TrackmanClubId): number {
  if (clubId === 'Driver') return 1;
  if (clubId.endsWith('Wood')) return 0.45;
  if (clubId === 'Hybrid') return 0.25;
  return 0;
}

const MID_IRON_IDS = ['4-iron', '5-iron', '6-iron', '7-iron', '8-iron', '9-iron'] as const;

function isMidIron(clubId: TrackmanClubId): clubId is (typeof MID_IRON_IDS)[number] {
  return (MID_IRON_IDS as readonly string[]).includes(clubId);
}



/*
 Mid-iron past stock: spin tracks speed and apex barely moves (0.2 m) unless spin+launch go wild
 * OTTOM1, 17.08.2026
 */

const IRON_EXCESS_START_YD = PGA_EXCEED_MARGIN_YD;
const IRON_EXCESS_FULL_YD = 40;
const IRON_EXCESS_SPIN_GAIN = 0.04;
const IRON_SHORT_DEFICIT_FULL_YD = 30;
const IRON_SHORT_SPIN_DROP = 0.09;
const IRON_SHORT_LAUNCH_GAIN = 0.018;
const SPIN_SPEED_EXPONENT = 0.17;
const IRON_APEX_PER_EXCESS_YD = 0.2;
const IRON_APEX_EXTREME_SPIN_RPM = 700;
const IRON_APEX_EXTREME_LAUNCH_DEG = 0.75;
const IRON_APEX_EXTREME_BONUS_M = 5;
const IRON_APEX_BASE_CAP_M = 37;
const IRON_APEX_EXTENDED_CAP_M = 39;

function ironApexCapM(carryYd: number, pgaCarryYd: number): number {
  const excessYd = carryYd - pgaCarryYd;
  if (excessYd <= 30) return IRON_APEX_BASE_CAP_M;
  if (excessYd >= 45) return IRON_APEX_EXTENDED_CAP_M;
  return lerp(IRON_APEX_BASE_CAP_M, IRON_APEX_EXTENDED_CAP_M, (excessYd - 30) / 15);
}

function shapedIronLaunchSpin(
  clubId: TrackmanClubId,
  carryM: number,
  handicap: number,
  includeExcessShape: boolean,
): { launchAngleDeg: number; spinRPM: number } {
  const harness = buildAnchorHarness(clubId, carryM);
  const band = clubLaunchBand(clubId);
  const hcpShaped = applyHandicapLaunchSpinShape(
    harness.launchAngleDeg,
    harness.spinRPM,
    handicap,
  );
  let { launchAngleDeg, spinRPM } = clampToBand(
    band,
    hcpShaped.launchAngleDeg,
    hcpShaped.spinRPM,
  );
  if (includeExcessShape) {
    ({ launchAngleDeg, spinRPM } = applyIronCarryExcessShape(clubId, carryM, launchAngleDeg, spinRPM));
    ({ launchAngleDeg, spinRPM } = applyIronShortCarryShape(clubId, carryM, launchAngleDeg, spinRPM));
    ({ launchAngleDeg, spinRPM } = clampToBand(band, launchAngleDeg, spinRPM));
  }
  return { launchAngleDeg, spinRPM };
}

function ironStockReferenceApexM(clubId: TrackmanClubId, handicap: number): number {
  const pga = PGA_ANCHOR_PROFILE[clubId];
  const { launchAngleDeg, spinRPM } = shapedIronLaunchSpin(clubId, pga.stockCarryM, handicap, false);
  const ballSpeedMs = solveBallSpeedForCarry(pga.stockCarryM, launchAngleDeg, spinRPM);
  const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM });
  return flight.apexM * APEX_CALIBRATION;
}

function ironGradualApexM(
  carryYd: number,
  pgaCarryYd: number,
  stockApexM: number,
  spinRPM: number,
  pgaSpinRPM: number,
  launchAngleDeg: number,
  pgaLaunchDeg: number,
): number {
  const excessYd = carryYd - pgaCarryYd;
  let apexM = stockApexM + IRON_APEX_PER_EXCESS_YD * excessYd;

  const spinDelta = spinRPM - pgaSpinRPM;
  const launchDelta = launchAngleDeg - pgaLaunchDeg;
  if (spinDelta > IRON_APEX_EXTREME_SPIN_RPM && launchDelta > IRON_APEX_EXTREME_LAUNCH_DEG) {
    const spinT = clamp((spinDelta - IRON_APEX_EXTREME_SPIN_RPM) / 1500, 0, 1);
    const launchT = clamp((launchDelta - IRON_APEX_EXTREME_LAUNCH_DEG) / 2.5, 0, 1);
    apexM += IRON_APEX_EXTREME_BONUS_M * spinT * launchT;
  }

  return Math.min(apexM, ironApexCapM(carryYd, pgaCarryYd));
}

/** Past PGA stock by 6 yd: extra spin, launch stays put. OTTOM1, 18.08.2026 */
function applyIronCarryExcessShape(
  clubId: TrackmanClubId,
  carryM: number,
  launchAngleDeg: number,
  spinRPM: number,
): { launchAngleDeg: number; spinRPM: number } {
  if (!isMidIron(clubId)) return { launchAngleDeg, spinRPM };

  const pga = PGA_ANCHOR_PROFILE[clubId];
  const excessYd = carryM * M_TO_YD - pga.stockCarryM * M_TO_YD;
  if (excessYd <= IRON_EXCESS_START_YD) return { launchAngleDeg, spinRPM };

  const t = clamp((excessYd - IRON_EXCESS_START_YD) / IRON_EXCESS_FULL_YD, 0, 1);
  return {
    launchAngleDeg,
    spinRPM: spinRPM * (1 + IRON_EXCESS_SPIN_GAIN * t),
  };
}

function applyIronShortCarryShape(
  clubId: TrackmanClubId,
  carryM: number,
  launchAngleDeg: number,
  spinRPM: number,
): { launchAngleDeg: number; spinRPM: number } {
  if (!isMidIron(clubId)) return { launchAngleDeg, spinRPM };

  const pga = PGA_ANCHOR_PROFILE[clubId];
  const deficitYd = pga.stockCarryM * M_TO_YD - carryM * M_TO_YD;
  if (deficitYd <= 0) return { launchAngleDeg, spinRPM };

  const t = clamp(deficitYd / IRON_SHORT_DEFICIT_FULL_YD, 0, 1);
  return {
    launchAngleDeg: launchAngleDeg * (1 + IRON_SHORT_LAUNCH_GAIN * t),
    spinRPM: spinRPM * (1 - IRON_SHORT_SPIN_DROP * t),
  };
}

/*
 Faster ball = more spin (200 yd 7i > 180 yd 7i). 
 OTTOM1, 18.08.2026 */


function spinScaledToBallSpeed(spinRPM: number, ballSpeedMs: number, referenceSpeedMs: number): number {
  if (!(referenceSpeedMs > 0)) return spinRPM;
  return spinRPM * Math.pow(ballSpeedMs / referenceSpeedMs, SPIN_SPEED_EXPONENT);
}


function applyLongCarryShape(
  clubId: TrackmanClubId,
  carryM: number,
  launchAngleDeg: number,
  spinRPM: number,
): { launchAngleDeg: number; spinRPM: number } {
  const weight = longCarryShapeWeight(clubId);
  if (weight <= 0) return { launchAngleDeg, spinRPM };

  const pga = PGA_ANCHOR_PROFILE[clubId];
  const excessYd = carryM * M_TO_YD - pga.stockCarryM * M_TO_YD;
  if (excessYd <= 0) return { launchAngleDeg, spinRPM };

  const carryProgress = clamp(excessYd / BOMB_SHAPE_FULL_EXCESS_YD, 0, 1);
  const targetLaunch = lerp(pga.launchAngleDeg, LONG_BOMB_LAUNCH_DEG, carryProgress);
  const targetSpin = lerp(pga.spinRPM, LONG_BOMB_SPIN_RPM, carryProgress);

  return {
    launchAngleDeg: lerp(launchAngleDeg, targetLaunch, weight * carryProgress),
    spinRPM: lerp(spinRPM, targetSpin, weight * carryProgress),
  };
}

const TOUR_SHORT_DRIVE_CARRY_YD = 275;
const TOUR_SHORT_DRIVE_YPM = 275 / 167;
const TOUR_LONG_DRIVE_CARRY_YD = 323;
const TOUR_LONG_DRIVE_YPM = 323 / 188;

const LONG_DRIVER_EMPIRICAL_MAX_YD = 350;

/*
 * Integrator runs hot on apex vs fix.md drives; 0.9 lands closer to actual research.

 * OTTOM1, 18.08.2026
 */
export const APEX_CALIBRATION = 0.9;

function tourYardsPerMph(carryYd: number): number {
  if (carryYd <= TOUR_SHORT_DRIVE_CARRY_YD) return TOUR_SHORT_DRIVE_YPM;
  if (carryYd >= TOUR_LONG_DRIVE_CARRY_YD) {
    const slope =
      (TOUR_LONG_DRIVE_YPM - TOUR_SHORT_DRIVE_YPM) /
      (TOUR_LONG_DRIVE_CARRY_YD - TOUR_SHORT_DRIVE_CARRY_YD);
    return TOUR_LONG_DRIVE_YPM + slope * (carryYd - TOUR_LONG_DRIVE_CARRY_YD) * 0.35;
  }
  const t = (carryYd - TOUR_SHORT_DRIVE_CARRY_YD) / (TOUR_LONG_DRIVE_CARRY_YD - TOUR_SHORT_DRIVE_CARRY_YD);
  return lerp(TOUR_SHORT_DRIVE_YPM, TOUR_LONG_DRIVE_YPM, t);
}

/*
 Floor driver speed from tour yd/mph curve (integrator wants too much)
 
 OTTOM1, 18.08.2026 
 */
function tourCalibratedDriverSpeedMs(carryYd: number, launchAngleDeg: number, spinRPM: number, carryM: number): number {
  const tourMs = (carryYd / tourYardsPerMph(carryYd)) * MPH_TO_MPS;
  const physicsMs = solveBallSpeedForCarry(carryM, launchAngleDeg, spinRPM);
  return Math.min(tourMs, physicsMs);
}

const CARRY_SATURATION_TOLERANCE_M = 0.5;

export interface CarryOnlyLaunch extends Omit<AnchorHarness, 'stockCarryM'> {

  carryM: number;
  carrySaturated: boolean;
}


export function deriveCarryOnlyLaunch(
  clubId: TrackmanClubId,
  carryM: number,
  handicap: number = HCP_BASELINE,
): CarryOnlyLaunch {
  const harness = buildAnchorHarness(clubId, carryM);
  const band = clubLaunchBand(clubId);
  let { launchAngleDeg, spinRPM } = shapeLaunchSpinForCarry(clubId, carryM, handicap);
  const scratchShape = shapeLaunchSpinForCarry(clubId, carryM, 0);
  const scratchMetrics = resolveScratchFlightMetrics(
    clubId,
    carryM,
    scratchShape.launchAngleDeg,
    scratchShape.spinRPM,
  );
  const flightMetrics = applyHandicapFlightMetrics(
    scratchMetrics.maxHeightM,
    scratchMetrics.landingAngleDeg,
    handicap,
  );

  const carryYd = carryM * M_TO_YD;
  const pga = PGA_ANCHOR_PROFILE[clubId];

  /*
   * Driver: tour yd/mph floor + scaled apex. Mid-irons: physics speed, spin rescaled, apex capped.
   * Else: physics speed, same apex scale.
   * OTTOM1, 18.08.2026
   */
  if (clubId === 'Driver' && carryYd <= LONG_DRIVER_EMPIRICAL_MAX_YD) {
    const ballSpeedMs = tourCalibratedDriverSpeedMs(carryYd, launchAngleDeg, spinRPM, carryM);
    return {
      ballSpeedMs,
      launchAngleDeg,
      spinRPM,
      maxHeightM: flightMetrics.maxHeightM,
      landingAngleDeg: flightMetrics.landingAngleDeg,
      spinAxisDeg: harness.spinAxisDeg,
      launchDirectionDeg: harness.launchDirectionDeg,
      effectiveMassKg: harness.effectiveMassKg,
      carryM: carryM,
      carrySaturated: false,
    };
  }

  if (isMidIron(clubId)) {
    let ballSpeedMs = solveBallSpeedForCarry(carryM, launchAngleDeg, spinRPM);
    spinRPM = clampToBand(
      band,
      launchAngleDeg,
      spinScaledToBallSpeed(spinRPM, ballSpeedMs, pga.ballSpeedMs),
    ).spinRPM;
    ballSpeedMs = solveBallSpeedForCarry(carryM, launchAngleDeg, spinRPM);
    const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM });

    return {
      ballSpeedMs,
      launchAngleDeg,
      spinRPM,
      maxHeightM: flightMetrics.maxHeightM,
      landingAngleDeg: flightMetrics.landingAngleDeg,
      spinAxisDeg: harness.spinAxisDeg,
      launchDirectionDeg: harness.launchDirectionDeg,
      effectiveMassKg: harness.effectiveMassKg,
      carryM: flight.carryM,
      carrySaturated: flight.carryM < carryM - CARRY_SATURATION_TOLERANCE_M,
    };
  }

  const ballSpeedMs = solveBallSpeedForCarry(carryM, launchAngleDeg, spinRPM);
  const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM });

  return {
    ballSpeedMs,
    launchAngleDeg,
    spinRPM,
    maxHeightM: flightMetrics.maxHeightM,
    landingAngleDeg: flightMetrics.landingAngleDeg,
    spinAxisDeg: harness.spinAxisDeg,
    launchDirectionDeg: harness.launchDirectionDeg,
    effectiveMassKg: harness.effectiveMassKg,
    carryM: flight.carryM,
    carrySaturated: flight.carryM < carryM - CARRY_SATURATION_TOLERANCE_M,
  };
}
