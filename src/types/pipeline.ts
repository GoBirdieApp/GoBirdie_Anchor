import type { TrackmanClubId } from './clubs.js';
import type { AnchorBagProfile } from './shot.js';
import type { PlayerProfile } from './player.js';
import type { TrackmanProfileMap } from './shot.js';

export type DataSource = 'trackman' | 'estimated';


export interface AnchorPipelineInput {
  selectedClubIds: TrackmanClubId[];

  hasTrackmanData: boolean;

  trackmanProfiles?: TrackmanProfileMap;

  player?: PlayerProfile;
  dataSourceByClub?: Partial<Record<TrackmanClubId, DataSource>>;
}


export interface EstimationValidationResult {
  validParamCount: number;
  meetsMinimum: boolean;
  validFields: string[];
  missingFields: string[];
}

export interface ShotFeasibilityIssue {
  code:
    | 'carry_exceeds_max'
    | 'carry_exceeds_expected'
    | 'carry_below_expected'
    | 'launch_unusual'
    | 'spin_unusual'
    | 'apex_exceeds_absolute'
    | 'apex_exceeds_expected'
    | 'apex_exceeds_carry'
    | 'apex_unusual'
    | 'landing_unusual';
  severity: 'error' | 'warn';
  message: string;
}

export interface ShotFeasibilityResult {
  feasible: boolean;
  issues: ShotFeasibilityIssue[];
  reference?: {
    ballSpeedMph: number;
    carryMaxYd: number;
    carryExpectedYd?: number;

    launchOptDeg: number;
    spinOptRpm: number;
    apexExpectedM?: number;
    landingExpectedDeg?: number;
  };
}

export interface AnchorPipelineResult {
  profiles: AnchorBagProfile;
  validationByClub: Partial<Record<TrackmanClubId, EstimationValidationResult>>;
  feasibilityByClub: Partial<Record<TrackmanClubId, ShotFeasibilityResult>>;
  exportPayload: TrackmanScreenExport;
}

/* LM export shape for GB shell. OTTOM1, 19.08.2026 */
export interface TrackmanScreenClubEntry {
  clubId: TrackmanClubId;
  carryM: number;
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
  spinAxisDeg: number;
  launchDirectionDeg: number;
  maxHeightM: number;
  landingAngleDeg: number;
  confidence: number;
  lowConfidence: boolean;
  estimated: boolean;
}

export interface TrackmanScreenExport {
  clubs: TrackmanScreenClubEntry[];
  calibrationPercent: number;
}
