import type { TrackmanClubId } from '../types/clubs.js';
import type {
  AnchorBagProfile,
  AnchorPipelineInput,
  AnchorPipelineResult,
  EstimationValidationResult,
  ShotFeasibilityResult,
} from '../types/index.js';
import type { AnchorClubProfile, PartialTrackmanEntry } from '../types/shot.js';
import { buildAnchorProfile } from '../anchor/buildProfile.js';
import { hasExtraBallFlightData, validateEstimationParams } from '../estimation/validateParams.js';
import { validateShotFeasibility } from '../estimation/validateShotFeasibility.js';
import { exportToTrackmanScreen } from '../export/toTrackmanScreen.js';
import { getAnchorCarryM } from '../utils/carry.js';
import { derivePersonalizedDefaults } from '../utils/personalization.js';

const positive = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

function hasOnboardingCarry(
  clubId: TrackmanClubId,
  input: AnchorPipelineInput,
): boolean {
  const fromDistances = input.player?.clubDistancesM?.[clubId];
  if (typeof fromDistances === 'number' && Number.isFinite(fromDistances) && fromDistances > 0) {
    return true;
  }
  if (typeof fromDistances === 'string' && fromDistances.trim() !== '') {
    const n = parseFloat(fromDistances);
    if (Number.isFinite(n) && n > 0) return true;
  }
  const fromProfile = input.trackmanProfiles?.[clubId]?.carryM;
  return typeof fromProfile === 'number' && Number.isFinite(fromProfile) && fromProfile > 0;
}

function shouldSkipEstimatedClub(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry | null | undefined,
  input: AnchorPipelineInput,
  validation: EstimationValidationResult,
): boolean {
  if (hasExtraBallFlightData(entry)) return !validation.meetsMinimum;

  return !hasOnboardingCarry(clubId, input);
}

function validationWithCarryContext(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry | null | undefined,
  input: AnchorPipelineInput,
): EstimationValidationResult {
  const validation = validateEstimationParams(entry);
  if (
    !hasExtraBallFlightData(entry) ||
    !hasOnboardingCarry(clubId, input) ||
    validation.validFields.includes('carryM')
  ) {
    return validation;
  }

  const validFields = [...validation.validFields, 'carryM'];
  return {
    validFields,
    missingFields: validation.missingFields.filter((field) => field !== 'carryM'),
    validParamCount: validFields.length,
    meetsMinimum: validFields.length >= 2,
  };
}

/**
 * Feasibility checks the player's claims
 * 
 * OTTOM1, 21.06.2026
 */
function feasibilitySubject(
  clubId: TrackmanClubId,
  entry: PartialTrackmanEntry | null | undefined,
  input: AnchorPipelineInput,
  profile: AnchorClubProfile,
): PartialTrackmanEntry {
  const claimedCarryM = hasOnboardingCarry(clubId, input)
    ? getAnchorCarryM(
        input.player?.clubDistancesM,
        clubId,
        entry ? { [clubId]: entry } : null,
        profile.carryM,
      )
    : profile.carryM;

  return {
    ballSpeedMs: positive(entry?.ballSpeedMs) ? entry.ballSpeedMs : profile.ballSpeedMs,
    launchAngleDeg: positive(entry?.launchAngleDeg) ? entry.launchAngleDeg : profile.launchAngleDeg,
    spinRPM: positive(entry?.spinRPM) ? entry.spinRPM : profile.spinRPM,
    maxHeightM: positive(entry?.maxHeightM) ? entry.maxHeightM : profile.maxHeightM,
    landingAngleDeg: positive(entry?.landingAngleDeg)
      ? entry.landingAngleDeg
      : profile.landingAngleDeg,
    carryM: claimedCarryM,
  };
}

export class EstimationValidationError extends Error {
  constructor(
    readonly clubId: TrackmanClubId,
    readonly validation: EstimationValidationResult,
  ) {
    super(
      `Club ${clubId}: need at least 2 valid estimation params (got ${validation.validParamCount}).`,
    );
    this.name = 'EstimationValidationError';
  }
}

export class ShotFeasibilityValidationError extends Error {
  constructor(
    readonly clubId: TrackmanClubId,
    readonly feasibility: ShotFeasibilityResult,
  ) {
    super(
      `Club ${clubId}: shot inputs are not physically feasible (${feasibility.issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.code)
        .join(', ')}).`,
    );
    this.name = 'ShotFeasibilityValidationError';
  }
}

/* Full bag pipeline 
OTTOM1, 21.06.2026 */
export function runAnchorPipeline(input: AnchorPipelineInput): AnchorPipelineResult {
  const personalized = derivePersonalizedDefaults(input.player);
  const profiles: AnchorBagProfile = {};
  const validationByClub: Partial<Record<TrackmanClubId, EstimationValidationResult>> = {};
  const feasibilityByClub: Partial<Record<TrackmanClubId, ShotFeasibilityResult>> = {};

  for (const clubId of input.selectedClubIds) {
    const entry = input.trackmanProfiles?.[clubId];
    const fromTrackman =
      input.hasTrackmanData && input.dataSourceByClub?.[clubId] !== 'estimated';

    if (!fromTrackman) {
      const validation = validationWithCarryContext(clubId, entry, input);
      validationByClub[clubId] = validation;
      if (shouldSkipEstimatedClub(clubId, entry, input, validation)) {
        continue;
      }
    }

    const profile = buildAnchorProfile({
      clubId,
      entry,
      personalized,
      clubDistancesM: input.player?.clubDistancesM,
      fromTrackman,
      handicap: input.player?.handicap,
    });
    profiles[clubId] = profile;

    if (!fromTrackman) {
      const feasibility = validateShotFeasibility(
        feasibilitySubject(clubId, entry, input, profile),
        { clubId },
      );
      feasibilityByClub[clubId] = feasibility;
      if (!feasibility.feasible) {
        profile.confidence = Math.min(profile.confidence, 0.25);
        profile.lowConfidence = true;
      }
    }
  }

  return {
    profiles,
    validationByClub,
    feasibilityByClub,
    exportPayload: exportToTrackmanScreen(profiles, input.player?.clubDistancesM),
  };
}


/* strict mode throws on failed estimation/feasibility
 OTTOM1, 21.06.2026 */

export function runAnchorPipelineStrict(input: AnchorPipelineInput): AnchorPipelineResult {
  const result = runAnchorPipeline(input);

  for (const clubId of input.selectedClubIds) {
    const entry = input.trackmanProfiles?.[clubId];
    const validation = result.validationByClub[clubId];
    if (!validation) continue;
    if (shouldSkipEstimatedClub(clubId, entry, input, validation)) {
      throw new EstimationValidationError(clubId, validation);
    }
  }

  for (const [clubId, feasibility] of Object.entries(result.feasibilityByClub) as [
    TrackmanClubId,
    ShotFeasibilityResult,
  ][]) {
    if (!feasibility.feasible) {
      throw new ShotFeasibilityValidationError(clubId, feasibility);
    }
  }

  return result;
}
