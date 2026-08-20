import { DEFAULT_TRACKMAN } from '../../constants/defaults.js';
import { TRACKMAN_CLUB_IDS, type TrackmanClubId } from '../../types/clubs.js';
import type { PartialTrackmanEntry, TrackmanProfileMap } from '../../types/shot.js';

export function pgaAverageEntry(clubId: TrackmanClubId): Required<PartialTrackmanEntry> {
  const anchor = DEFAULT_TRACKMAN[clubId];
  return {
    ballSpeedMs: anchor.ballSpeedMs,
    launchAngleDeg: anchor.launchAngleDeg,
    spinRPM: anchor.spinRPM,
    spinAxisDeg: anchor.spinAxisDeg,
    launchDirectionDeg: anchor.launchDirectionDeg,
    maxHeightM: anchor.maxHeightM,
    landingAngleDeg: anchor.landingAngleDeg,
    carryM: anchor.stockCarryM,
  };
}

export const pgaAverageProfiles: TrackmanProfileMap = Object.fromEntries(
  TRACKMAN_CLUB_IDS.map((clubId) => [clubId, pgaAverageEntry(clubId)]),
) as TrackmanProfileMap;

