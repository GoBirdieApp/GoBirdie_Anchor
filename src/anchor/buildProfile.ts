import type { TrackmanClubId } from '../types/clubs.js';
import type { AnchorClubProfile, PartialTrackmanEntry, PersonalizedDefaults } from '../types/shot.js';
import { CONFIDENCE_THRESHOLD } from '../constants/defaults.js';
import { hasExtraBallFlightData } from '../estimation/validateParams.js';
import { runPartialMethod } from '../../partial_dataGate/Partial_Method.js';
import { runDefaultMethod } from '../methods/index.js';
import { getAnchorCarryM, sideSpinRpmFromSpinAxis } from '../utils/carry.js';
import { scoreConfidence } from './confidence.js';

export interface AnchorCalcInput {
  clubId: TrackmanClubId;
  entry?: PartialTrackmanEntry | null;
  personalized: PersonalizedDefaults;
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>;
  fromTrackman?: boolean;
  handicap?: number | string | null;
}

const positive = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

function countKnownFields(entry: PartialTrackmanEntry | null | undefined): number {
  let count = 0;
  for (const value of [
    entry?.ballSpeedMs,
    entry?.launchAngleDeg,
    entry?.spinRPM,
    entry?.maxHeightM,
    entry?.landingAngleDeg,
    entry?.carryM,
  ]) {
    if (positive(value)) count += 1;
  }
  return count;
}

/** Merge measured LM rows over a carry-only baseline.
 *  OTTOM1, 12.07.2026 */
function buildTrackmanProfile(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry,
  personalized: PersonalizedDefaults,
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>,
  handicap?: number | string | null,
): Omit<AnchorClubProfile, 'confidence' | 'lowConfidence'> {
  const baseline = runDefaultMethod(clubId, entry, personalized, clubDistancesM, handicap);
  const ballSpeedMs = positive(entry.ballSpeedMs) ? entry.ballSpeedMs : baseline.ballSpeedMs;
  const launchAngleDeg = positive(entry.launchAngleDeg) ? entry.launchAngleDeg : baseline.launchAngleDeg;
  const spinRPM = positive(entry.spinRPM) ? entry.spinRPM : baseline.spinRPM;
  const spinAxisDeg = positive(entry.spinAxisDeg) ? entry.spinAxisDeg : baseline.spinAxisDeg;
  const launchDirectionDeg = positive(entry.launchDirectionDeg)
    ? entry.launchDirectionDeg
    : baseline.launchDirectionDeg;
  const maxHeightM = positive(entry.maxHeightM) ? entry.maxHeightM : baseline.maxHeightM;
  const landingAngleDeg = positive(entry.landingAngleDeg) ? entry.landingAngleDeg : baseline.landingAngleDeg;
  const carryM = positive(entry.carryM)
    ? entry.carryM
    : getAnchorCarryM(clubDistancesM, clubId, { [clubId]: entry }, baseline.carryM);

  return {
    clubId,
    carryM,
    ballSpeedMs,
    launchAngleDeg,
    spinRPM,
    sideSpinRPM: sideSpinRpmFromSpinAxis(spinRPM, spinAxisDeg),
    spinAxisDeg,
    launchDirectionDeg,
    effectiveMassKg: baseline.effectiveMassKg,
    maxHeightM,
    landingAngleDeg,
    source: 'trackman',
  };
}

/* 
Carry-only gate for estimated profiles; direct passthrough for LM.

OTTOM1, 12.07.2026 */

export function buildAnchorProfile(input: AnchorCalcInput): AnchorClubProfile {
  const { clubId, entry, personalized, clubDistancesM, fromTrackman = false, handicap } = input;

  if (fromTrackman && entry) {
    const profile = buildTrackmanProfile(clubId, entry, personalized, clubDistancesM, handicap);
    const confidence = scoreConfidence(entry, countKnownFields(entry), false);
    const lowConfidence = confidence < CONFIDENCE_THRESHOLD;
    return { ...profile, confidence, lowConfidence };
  }

  if (entry && hasExtraBallFlightData(entry)) {
    const partial = runPartialMethod(
      clubId,
      entry,
      personalized,
      clubDistancesM,
      handicap,
    );
    const confidence = scoreConfidence(entry, partial.knownFieldCount, false);
    const lowConfidence = confidence < CONFIDENCE_THRESHOLD;

    return {
      clubId,
      carryM: partial.carryM,
      ballSpeedMs: partial.ballSpeedMs,
      launchAngleDeg: partial.launchAngleDeg,
      spinRPM: partial.spinRPM,
      sideSpinRPM: partial.sideSpinRPM,
      spinAxisDeg: partial.spinAxisDeg,
      launchDirectionDeg: partial.launchDirectionDeg,
      effectiveMassKg: partial.effectiveMassKg,
      maxHeightM: partial.maxHeightM,
      landingAngleDeg: partial.landingAngleDeg,
      confidence,
      lowConfidence,
      source: 'partial',
      solvedFields: partial.solvedFields,
      apexResidualM: partial.apexResidualM,
      landingResidualDeg: partial.landingResidualDeg,
    };
  }

  const carryOnly = runDefaultMethod(clubId, entry, personalized, clubDistancesM, handicap);
  const confidence = scoreConfidence(entry, 0, true);
  const lowConfidence = confidence < CONFIDENCE_THRESHOLD;

  return {
    clubId,
    carryM: carryOnly.carryM,
    ballSpeedMs: carryOnly.ballSpeedMs,
    launchAngleDeg: carryOnly.launchAngleDeg,
    spinRPM: carryOnly.spinRPM,
    sideSpinRPM: sideSpinRpmFromSpinAxis(carryOnly.spinRPM, carryOnly.spinAxisDeg),
    spinAxisDeg: carryOnly.spinAxisDeg,
    launchDirectionDeg: carryOnly.launchDirectionDeg,
    effectiveMassKg: carryOnly.effectiveMassKg,
    maxHeightM: carryOnly.maxHeightM,
    landingAngleDeg: carryOnly.landingAngleDeg,
    confidence,
    lowConfidence,
    source: 'carry_only',
  };
}
