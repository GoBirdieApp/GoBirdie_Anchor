import type { TrackmanClubId } from '../types/clubs.js';
import type { TrackmanProfileMap } from '../types/shot.js';
import { DEFAULT_TRACKMAN } from '../constants/defaults.js';

export function getAnchorCarryM(
  clubDistancesM: Readonly<Record<string, string | number | null | undefined>> | undefined,
  clubId: TrackmanClubId,
  profiles?: TrackmanProfileMap | null,
  fallback: number = DEFAULT_TRACKMAN[clubId].stockCarryM,
): number {
  const fromMap = clubDistancesM?.[clubId];
  if (typeof fromMap === 'number' && Number.isFinite(fromMap) && fromMap > 0) {
    return fromMap;
  }
  if (typeof fromMap === 'string' && fromMap.trim() !== '') {
    const n = parseFloat(fromMap);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const legacy = profiles?.[clubId]?.carryM;
  if (typeof legacy === 'number' && Number.isFinite(legacy) && legacy > 0) {
    return legacy;
  }
  return fallback;
}

/* side spin from backspin + spin axis (might tweak later)
 OTTOM1, 17.07.2026 */
export function sideSpinRpmFromSpinAxis(backspinRpm: number, spinAxisDeg: number): number {
  const rad = (spinAxisDeg * Math.PI) / 180;
  return backspinRpm * Math.tan(rad);
}
