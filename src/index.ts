/*
 * GoBirdie Anchor
 carry-only profile generation for the native shell.
 * OTTOM1, 28.07.2026
 */

export {
  runAnchorPipeline,
  runAnchorPipelineStrict,
  EstimationValidationError,
  ShotFeasibilityValidationError,
} from './pipeline/index.js';

export { buildAnchorProfile, scoreConfidence } from './anchor/index.js';

export {
  validateEstimationParams,
  hasExtraBallFlightData,
  validateShotFeasibility,
  ballSpeedFloorForCarryMs,
  carryCeilingYd,
} from './estimation/index.js';

export {
  simulateFlight,
  solveBallSpeedForCarry,
  maxCarryInBand,
  minBallSpeedForCarry,
  CALIBRATED_AERO,
  STANDARD_CONDITIONS,
  STANDARD_AIR_DENSITY_KG_M3,
  type FlightResult,
  type LaunchConditions,
  type LaunchBand,
} from './physics/index.js';

export { clubLaunchBand } from './methods/launchBands.js';

export { runDefaultMethod, runPartialMethod } from './methods/index.js';

export {
  derivePersonalizedDefaults,
  deriveSkillFactor,
  normalizeHandicap,
  clubheadSpeedMsFromDriverCarry,
  getAnchorCarryM,
  sideSpinRpmFromSpinAxis,
  getTrackmanEngineCalibrationPercent,
} from './utils/index.js';

export { exportToTrackmanScreen } from './export/index.js';

export type {
  TrackmanClubId,
  TrackmanLaunch,
  PartialTrackmanEntry,
  TrackmanProfileMap,
  TrackmanField,
  FullClubDefault,
  PersonalizedDefaults,
  AnchorClubProfile,
  AnchorBagProfile,
  PlayerProfile,
  AnchorPipelineInput,
  AnchorPipelineResult,
  EstimationValidationResult,
  ShotFeasibilityResult,
  ShotFeasibilityIssue,
  TrackmanScreenExport,
  TrackmanScreenClubEntry,
  DataSource,
} from './types/index.js';

export {
  TRACKMAN_CLUB_IDS,
  isTrackmanClubId,
  DEFAULT_TRACKMAN,
  TRACKMAN_FIELD_META,
  TRACKMAN_COMPLETENESS_FIELDS,
  ESTIMATION_VALIDATION_FIELDS,
  MIN_VALID_ESTIMATION_PARAMS,
  CONFIDENCE_THRESHOLD,
  MPH_TO_MPS,
  MPS_TO_MPH,
  YD_TO_M,
  M_TO_YD,
  SHOT_SHAPE_PRESETS,
  SHOT_SHAPE_BUTTON_IDS,
  type ShotShapeId,
  type ShotShapePreset,
} from './constants/index.js';

export { TRACKMAN_CLUB_IDS as CLUB_IDS } from './types/clubs.js';
