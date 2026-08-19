import { MPS_TO_MPH, M_TO_YD, YD_TO_M } from '../constants/units.js';
import { clubLaunchBand } from '../methods/launchBands.js';
import { maxCarryInBand, type LaunchBand } from '../physics/solve.js';
import { simulateFlight } from '../physics/trajectory.js';
import type { TrackmanClubId } from '../types/clubs.js';
import type { PartialTrackmanEntry } from '../types/shot.js';
import type { ShotFeasibilityIssue, ShotFeasibilityResult } from '../types/pipeline.js';

/**
 Tolerances loose on purpose; tour avg rows aren't single trajectories.

carry past physical ceiling by more than 5% = hard fail.
 *  OTTOM1, 28.07.2026 
 * */

const CARRY_CEILING_MARGIN = 0.05;

const CARRY_RELATIVE_TOLERANCE = 0.08;
const CARRY_ABSOLUTE_TOLERANCE_YD = 12;

const APEX_RELATIVE_TOLERANCE = 0.2;
const APEX_ABSOLUTE_TOLERANCE_M = 6;
const APEX_WARN_TOLERANCE_M = 3;

const LANDING_TOLERANCE_DEG = 9;
const LANDING_WARN_TOLERANCE_DEG = 5;

/** 
 * Nothing is allowed to climbs higher than this in std conditions.
 *  OTTOM1, 19.08.2026 */
const APEX_ABSOLUTE_MAX_M = 60;


const ANY_CLUB_BAND: LaunchBand = {
  launchMinDeg: 4,
  launchMaxDeg: 40,
  spinMinRpm: 1400,
  spinMaxRpm: 12000,
};

function positive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export interface ShotFeasibilityOptions {

  clubId?: TrackmanClubId;
}

export function validateShotFeasibility(
  entry: PartialTrackmanEntry | null | undefined,
  options: ShotFeasibilityOptions = {},
): ShotFeasibilityResult {
  const issues: ShotFeasibilityIssue[] = [];

  if (!positive(entry?.ballSpeedMs)) {
    return { feasible: true, issues };
  }

  const ballSpeedMs = entry.ballSpeedMs;
  const ballSpeedMph = ballSpeedMs * MPS_TO_MPH;
  const carryM = positive(entry.carryM) ? entry.carryM : undefined;
  const carryYd = carryM != null ? carryM * M_TO_YD : undefined;
  const launchDeg = positive(entry.launchAngleDeg) ? entry.launchAngleDeg : undefined;
  const spinRpm = positive(entry.spinRPM) ? entry.spinRPM : undefined;
  const apexM = positive(entry.maxHeightM) ? entry.maxHeightM : undefined;
  const landingDeg = positive(entry.landingAngleDeg) ? entry.landingAngleDeg : undefined;

  const band = options.clubId ? clubLaunchBand(options.clubId) : ANY_CLUB_BAND;
  const ceiling = maxCarryInBand(ballSpeedMs, band);
  const carryCeilingYd = ceiling.flight.carryM * M_TO_YD;

  
  //  no launch condition can carry this far at this ball speed

  if (carryYd != null && carryYd > carryCeilingYd * (1 + CARRY_CEILING_MARGIN)) {
    issues.push({
      code: 'carry_exceeds_max',
      severity: 'error',
      message: `Carry ${Math.round(carryYd)} yd is beyond the ${Math.round(carryCeilingYd)} yd ceiling for ${Math.round(ballSpeedMph)} mph ball speed at any launch and spin`,
    });
  }

  //launch and spin outside what the club produces
  if (launchDeg != null && (launchDeg < band.launchMinDeg || launchDeg > band.launchMaxDeg)) {
    issues.push({
      code: 'launch_unusual',
      severity: 'warn',
      message: `Launch ${launchDeg.toFixed(1)}° is outside the ${band.launchMinDeg.toFixed(1)}-${band.launchMaxDeg.toFixed(1)}° band${options.clubId ? ` for a ${options.clubId}` : ''}`,
    });
  }

  if (spinRpm != null && (spinRpm < band.spinMinRpm || spinRpm > band.spinMaxRpm)) {
    issues.push({
      code: 'spin_unusual',
      severity: 'warn',
      message: `Spin ${Math.round(spinRpm)} rpm is outside the ${Math.round(band.spinMinRpm)}-${Math.round(band.spinMaxRpm)} rpm band${options.clubId ? ` for a ${options.clubId}` : ''}`,
    });
  }

  //the flight this launch triple actually produces

  let predicted: ReturnType<typeof simulateFlight> | undefined;
  if (launchDeg != null && spinRpm != null) {
    predicted = simulateFlight({ ballSpeedMs, launchAngleDeg: launchDeg, spinRPM: spinRpm });
    const predictedCarryYd = predicted.carryM * M_TO_YD;
    const carryTolerance = Math.max(
      CARRY_ABSOLUTE_TOLERANCE_YD,
      predictedCarryYd * CARRY_RELATIVE_TOLERANCE,
    );

    if (carryYd != null && carryYd > predictedCarryYd + carryTolerance) {
      issues.push({
        code: 'carry_exceeds_expected',
        severity: 'error',
        message: `Carry ${Math.round(carryYd)} yd is too long for ${Math.round(ballSpeedMph)} mph at ${launchDeg.toFixed(1)}° / ${Math.round(spinRpm)} rpm, which flies ${Math.round(predictedCarryYd)} yd`,
      });
    } else if (carryYd != null && carryYd < predictedCarryYd - carryTolerance) {
      issues.push({
        code: 'carry_below_expected',
        severity: 'error',
        message: `Carry ${Math.round(carryYd)} yd is too short for ${Math.round(ballSpeedMph)} mph at ${launchDeg.toFixed(1)}° / ${Math.round(spinRpm)} rpm, which flies ${Math.round(predictedCarryYd)} yd`,
      });
    }

    if (landingDeg != null) {
      const landingDelta = Math.abs(landingDeg - predicted.landingAngleDeg);
      if (landingDelta > LANDING_TOLERANCE_DEG) {
        issues.push({
          code: 'landing_unusual',
          severity: 'error',
          message: `Landing angle ${landingDeg.toFixed(1)}° does not match the ${predicted.landingAngleDeg.toFixed(1)}° this flight descends at`,
        });
      } else if (landingDelta > LANDING_WARN_TOLERANCE_DEG) {
        issues.push({
          code: 'landing_unusual',
          severity: 'warn',
          message: `Landing angle ${landingDeg.toFixed(1)}° is off the ${predicted.landingAngleDeg.toFixed(1)}° this flight descends at`,
        });
      }
    }
  }

  // apex, which is what a launch monitor pins down most tightly
  if (apexM != null) {
    if (apexM > APEX_ABSOLUTE_MAX_M) {
      issues.push({
        code: 'apex_exceeds_absolute',
        severity: 'error',
        message: `Apex ${apexM.toFixed(1)} m exceeds the ${APEX_ABSOLUTE_MAX_M} m absolute maximum`,
      });
    }

    const apexReference = predicted ?? ceiling.flight;
    const apexTolerance = Math.max(
      APEX_ABSOLUTE_TOLERANCE_M,
      apexReference.apexM * APEX_RELATIVE_TOLERANCE,
    );
    const apexDelta = apexM - apexReference.apexM;

    if (predicted != null && Math.abs(apexDelta) > apexTolerance) {
      issues.push({
        code: apexDelta > 0 ? 'apex_exceeds_expected' : 'apex_unusual',
        severity: 'error',
        message: `Apex ${apexM.toFixed(1)} m does not match the ${apexReference.apexM.toFixed(1)} m this flight climbs to at ${Math.round(ballSpeedMph)} mph / ${launchDeg!.toFixed(1)}° / ${Math.round(spinRpm!)} rpm`,
      });
    } else if (predicted != null && Math.abs(apexDelta) > APEX_WARN_TOLERANCE_M) {
      issues.push({
        code: 'apex_unusual',
        severity: 'warn',
        message: `Apex ${apexM.toFixed(1)} m is off the ${apexReference.apexM.toFixed(1)} m this flight climbs to`,
      });
    } else if (predicted == null && apexM > ceiling.flight.apexM + apexTolerance) {
      issues.push({
        code: 'apex_exceeds_expected',
        severity: 'error',
        message: `Apex ${apexM.toFixed(1)} m is beyond anything ${Math.round(ballSpeedMph)} mph can climb to`,
      });
    }
  }

  return {
    feasible: !issues.some((issue) => issue.severity === 'error'),
    issues,
    reference: {
      ballSpeedMph,
      carryMaxYd: carryCeilingYd,
      carryExpectedYd: predicted != null ? predicted.carryM * M_TO_YD : undefined,
      launchOptDeg: ceiling.launchAngleDeg,
      spinOptRpm: ceiling.spinRPM,
      apexExpectedM: predicted?.apexM,
      landingExpectedDeg: predicted?.landingAngleDeg,
    },
  };
}

/** Max carry UI hint,
 *  OTTOM1, 18.08.2026 */
export function carryCeilingYd(ballSpeedMs: number, clubId?: TrackmanClubId): number {
  const band = clubId ? clubLaunchBand(clubId) : ANY_CLUB_BAND;
  return maxCarryInBand(ballSpeedMs, band).flight.carryM * M_TO_YD;
}

/** Min speed, UI hint */
export function ballSpeedFloorForCarryMs(carryYd: number, clubId?: TrackmanClubId): number {
  const band = clubId ? clubLaunchBand(clubId) : ANY_CLUB_BAND;
  let low = 5;
  let high = 120;
  const targetM = carryYd * YD_TO_M;
  for (let i = 0; i < 30; i += 1) {
    const mid = (low + high) / 2;
    if (maxCarryInBand(mid, band).flight.carryM < targetM) low = mid;
    else high = mid;
  }
  return high;
}
