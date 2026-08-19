import type { TrackmanClubId } from './clubs.js';

/* full launch output consumed by RK4 downstream
 OTTOM1, 19.08.2026 */
export interface TrackmanLaunch {
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
  sideSpinRPM: number;
  launchDirectionDeg: number;
  effectiveMassKg: number;
  maxHeightM: number;
  landingAngleDeg: number;
}


// optional fields the estimator might send. 
// OTTOM1, 19.08.2026 

export interface PartialTrackmanEntry {
  ballSpeedMs?: number | null;
  launchAngleDeg?: number | null;
  spinRPM?: number | null;
  spinAxisDeg?: number | null;
  launchDirectionDeg?: number | null;
  maxHeightM?: number | null;
  landingAngleDeg?: number | null;
  carryM?: number | null;
}

export type TrackmanProfileMap = Partial<Record<TrackmanClubId, PartialTrackmanEntry>>;

export type TrackmanField =
  | 'ballSpeedMs'
  | 'launchAngleDeg'
  | 'spinRPM'
  | 'spinAxisDeg'
  | 'launchDirectionDeg'
  | 'maxHeightM'
  | 'landingAngleDeg'
  | 'carryM';






export type FullClubDefault = Omit<
  TrackmanLaunch,
  'maxHeightM' | 'landingAngleDeg' | 'sideSpinRPM' | 'launchDirectionDeg'
> & {
  stockCarryM: number;
  maxHeightM: number;
  landingAngleDeg: number;
  spinAxisDeg: number;
  launchDirectionDeg: number;
};

export type PersonalizedDefaults = Record<TrackmanClubId, FullClubDefault>;





export interface AnchorClubProfile extends TrackmanLaunch {
  clubId: TrackmanClubId;
  carryM: number;
  spinAxisDeg: number;
  confidence: number;
  lowConfidence: boolean;
  source: 'trackman' | 'estimated' | 'carry_only' | 'partial';

  solvedFields?: Array<'ballSpeedMs' | 'launchAngleDeg' | 'spinRPM'>;
  apexResidualM?: number | null;
  landingResidualDeg?: number | null;
}

export type AnchorBagProfile = Partial<Record<TrackmanClubId, AnchorClubProfile>>;
