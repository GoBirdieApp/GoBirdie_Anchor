import type { TrackmanClubId } from '../src/types/clubs.js';
import type { PartialTrackmanEntry, PersonalizedDefaults, TrackmanLaunch } from '../src/types/shot.js';
import { HCP_BASELINE } from '../src/constants/defaults.js';
import { DEFAULT_TRACKMAN } from '../src/constants/defaults.js';
import { deriveCarryOnlyLaunch } from '../carry_onlyGate/anchorBlend.js';
import { getAnchorCarryM, sideSpinRpmFromSpinAxis } from '../src/utils/carry.js';
import { normalizeHandicap } from '../src/utils/personalization.js';
import { clubLaunchBand } from '../src/methods/launchBands.js';
import { reconcileLaunch, type CoreField, type PartialObservation } from './reconcile.js';

/*
 Partial gate driver spin read 5-10% low vs LM reality. (lazy scaling :D)
 OTTOM1, 19.08.2026 */
const DRIVER_PARTIAL_SPIN_BIAS = 1.07;

export interface PartialMethodResult extends TrackmanLaunch {
  carryM: number;
  spinAxisDeg: number;
  knownFieldCount: number;
  solvedFields: CoreField[];
  apexResidualM: number | null;

  landingResidualDeg: number | null;
}

const SIGNED = (v: number | null | undefined, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function isPositive(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/** Carry the player actually gave us, not stock fallback. 
 * OTTOM1, 10.08.2026 */
function claimedCarryM(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry | null | undefined,
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>,
): number | null {
  const fromMap = clubDistancesM?.[clubId];
  if (typeof fromMap === 'number' && Number.isFinite(fromMap) && fromMap > 0) return fromMap;
  if (typeof fromMap === 'string' && fromMap.trim() !== '') {
    const parsed = parseFloat(fromMap);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return isPositive(entry?.carryM) ? entry.carryM : null;
}

/*
  junk stripped so the solver only sees real numbers

 OTTOM1, 18.08.2026 */
function observationFrom(entry: PartialTrackmanEntry | null | undefined): PartialObservation {
  const observed: PartialObservation = {};
  if (isPositive(entry?.ballSpeedMs)) observed.ballSpeedMs = entry.ballSpeedMs;
  if (isPositive(entry?.launchAngleDeg)) observed.launchAngleDeg = entry.launchAngleDeg;
  if (isPositive(entry?.spinRPM)) observed.spinRPM = entry.spinRPM;
  if (isPositive(entry?.maxHeightM)) observed.maxHeightM = entry.maxHeightM;
  if (isPositive(entry?.landingAngleDeg)) observed.landingAngleDeg = entry.landingAngleDeg;
  return observed;
}

function hasCompleteCoreTriple(entry: PartialTrackmanEntry | null | undefined): boolean {
  return (
    isPositive(entry?.ballSpeedMs) &&
    isPositive(entry?.launchAngleDeg) &&
    isPositive(entry?.spinRPM)
  );
}

function applyDriverPartialSpinBias(
  clubId: TrackmanClubId,
  spinRPM: number,
  band: ReturnType<typeof clubLaunchBand>,
): number {
  if (clubId !== 'Driver') return spinRPM;
  return Math.min(band.spinMaxRpm, spinRPM * DRIVER_PARTIAL_SPIN_BIAS);
}

function reconcilePartialLaunch(
  clubId: TrackmanClubId,
  observed: PartialObservation,
  prior: { ballSpeedMs: number; launchAngleDeg: number; spinRPM: number },
  band: ReturnType<typeof clubLaunchBand>,
  biasDriverSpin: boolean,
) {
  const priorForReconcile = {
    ballSpeedMs: prior.ballSpeedMs,
    launchAngleDeg: prior.launchAngleDeg,
    spinRPM: biasDriverSpin
      ? applyDriverPartialSpinBias(clubId, prior.spinRPM, band)
      : prior.spinRPM,
  };

  const observedForReconcile = { ...observed };
  if (biasDriverSpin && isPositive(observedForReconcile.spinRPM)) {
    observedForReconcile.spinRPM = applyDriverPartialSpinBias(
      clubId,
      observedForReconcile.spinRPM,
      band,
    );
  }

  let solved = reconcileLaunch({
    observed: observedForReconcile,
    prior: priorForReconcile,
    band,
  });

  if (biasDriverSpin && solved.solvedFields.includes('spinRPM')) {
    solved = reconcileLaunch({
      observed: {
        ...observedForReconcile,
        spinRPM: applyDriverPartialSpinBias(clubId, solved.spinRPM, band),
      },
      prior: priorForReconcile,
      band,
    });
  }

  return solved;
}

/**
 * Partial-data gate:
 *  User input = constraints; sim finds the triple that fits.
 No more ratio-scaled apex nonsense.
 * OTTOM1, 18.08.2026
 */
export function runPartialMethod(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry | null | undefined,
  personalized: PersonalizedDefaults,
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>,
  handicap: number | string | null | undefined = HCP_BASELINE,
): PartialMethodResult {
  const base = personalized[clubId] ?? DEFAULT_TRACKMAN[clubId];
  const carryM = getAnchorCarryM(clubDistancesM, clubId, entry ? { [clubId]: entry } : null, base.stockCarryM);

  const prior = deriveCarryOnlyLaunch(clubId, carryM, normalizeHandicap(handicap));
  const band = clubLaunchBand(clubId);
  const biasDriverSpin = clubId === 'Driver' && !hasCompleteCoreTriple(entry);

  const observed = observationFrom(entry);
  const claimedCarry = claimedCarryM(clubId, entry, clubDistancesM);
  if (claimedCarry != null) observed.carryM = claimedCarry;

  const solved = reconcilePartialLaunch(
    clubId,
    observed,
    {
      ballSpeedMs: prior.ballSpeedMs,
      launchAngleDeg: prior.launchAngleDeg,
      spinRPM: prior.spinRPM,
    },
    band,
    biasDriverSpin,
  );

  const spinAxisDeg = SIGNED(entry?.spinAxisDeg, prior.spinAxisDeg);
  const launchDirectionDeg = SIGNED(entry?.launchDirectionDeg, prior.launchDirectionDeg);

  let knownFieldCount = 0;
  for (const value of [
    entry?.ballSpeedMs,
    entry?.launchAngleDeg,
    entry?.spinRPM,
    entry?.maxHeightM,
    entry?.landingAngleDeg,
    entry?.carryM,
  ]) {
    if (isPositive(value)) knownFieldCount += 1;
  }

  return {
    carryM: solved.flight.carryM,
    ballSpeedMs: solved.ballSpeedMs,
    launchAngleDeg: solved.launchAngleDeg,
    spinRPM: solved.spinRPM,
    sideSpinRPM: sideSpinRpmFromSpinAxis(solved.spinRPM, spinAxisDeg),
    spinAxisDeg,
    launchDirectionDeg,
    effectiveMassKg: prior.effectiveMassKg,
    maxHeightM: solved.flight.apexM,
    landingAngleDeg: solved.flight.landingAngleDeg,
    knownFieldCount,
    solvedFields: solved.solvedFields,
    apexResidualM: solved.residuals.maxHeightM ?? null,
    landingResidualDeg: solved.residuals.landingAngleDeg ?? null,
  };
}

/*
 Merge partial overrides into a full LM
 
 OTTOM1, 18.08.2026 */
 
export function resolveTrackmanLaunch(
  clubId: TrackmanClubId,
  override: PartialTrackmanEntry | null | undefined,
  personalized?: PersonalizedDefaults | null,
): TrackmanLaunch {
  const partial = runPartialMethod(clubId, override, personalized ?? DEFAULT_TRACKMAN as PersonalizedDefaults);
  return {
    ballSpeedMs: partial.ballSpeedMs,
    launchAngleDeg: partial.launchAngleDeg,
    spinRPM: partial.spinRPM,
    sideSpinRPM: partial.sideSpinRPM,
    launchDirectionDeg: partial.launchDirectionDeg,
    effectiveMassKg: partial.effectiveMassKg,
    maxHeightM: partial.maxHeightM,
    landingAngleDeg: partial.landingAngleDeg,
  };
}
