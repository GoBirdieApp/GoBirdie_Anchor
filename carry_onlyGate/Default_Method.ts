import type { TrackmanClubId } from '../src/types/clubs.js';
import type { PartialTrackmanEntry } from '../src/types/shot.js';
import type { FullClubDefault, PersonalizedDefaults } from '../src/types/shot.js';
import { HCP_BASELINE } from '../src/constants/defaults.js';
import { DEFAULT_TRACKMAN } from '../src/constants/defaults.js';
import { getAnchorCarryM } from '../src/utils/carry.js';
import { normalizeHandicap } from '../src/utils/personalization.js';
import { deriveCarryOnlyLaunch } from './anchorBlend.js';

/**
 * Carry-only path: LPGA to PGA gradient, hcp steps (−150 rpm / +0.5deg per 3 hcp), 6 yd override past PGA stock.
 * OTTOM1, 29.07.2026
 */

export interface CarryOnlyResult {
  carryM: number;
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
  maxHeightM: number;
  landingAngleDeg: number;
  spinAxisDeg: number;
  launchDirectionDeg: number;
  effectiveMassKg: number;
  requestedCarryM: number;

  carrySaturated: boolean;
}

export function runDefaultMethod(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry | null | undefined,
  personalized: PersonalizedDefaults,
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>,
  handicap: number | string | null | undefined = HCP_BASELINE,
): CarryOnlyResult {
  const base = personalized[clubId] ?? DEFAULT_TRACKMAN[clubId];
  const carryM = getAnchorCarryM(
    clubDistancesM,
    clubId,
    entry ? { [clubId]: entry } : null,
    base.stockCarryM,
  );

  const solved = deriveCarryOnlyLaunch(clubId, carryM, normalizeHandicap(handicap));

  const spinAxisDeg =
    typeof entry?.spinAxisDeg === 'number' && Number.isFinite(entry.spinAxisDeg)
      ? entry.spinAxisDeg
      : solved.spinAxisDeg;
  const launchDirectionDeg =
    typeof entry?.launchDirectionDeg === 'number' && Number.isFinite(entry.launchDirectionDeg)
      ? entry.launchDirectionDeg
      : solved.launchDirectionDeg;

  return {
    carryM: solved.carryM,
    requestedCarryM: carryM,
    carrySaturated: solved.carrySaturated,
    ballSpeedMs: solved.ballSpeedMs,
    launchAngleDeg: solved.launchAngleDeg,
    spinRPM: solved.spinRPM,
    maxHeightM: solved.maxHeightM,
    landingAngleDeg: solved.landingAngleDeg,
    effectiveMassKg: solved.effectiveMassKg,
    spinAxisDeg,
    launchDirectionDeg,
  };
}

export type { FullClubDefault };
