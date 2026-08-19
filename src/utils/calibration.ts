import { TRACKMAN_CLUB_IDS } from '../types/clubs.js';
import type { TrackmanProfileMap } from '../types/shot.js';
import { TRACKMAN_COMPLETENESS_FIELDS } from '../constants/validation.js';

export function getTrackmanEngineCalibrationPercent(
  profiles: TrackmanProfileMap,
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>,
): number {
  let filled = 0;
  const total = TRACKMAN_CLUB_IDS.length * TRACKMAN_COMPLETENESS_FIELDS.length;

  for (const clubId of TRACKMAN_CLUB_IDS) {
    const entry = profiles[clubId];
    for (const field of TRACKMAN_COMPLETENESS_FIELDS) {
      let isFilled = false;
      if (field === 'carryM') {
        const fromMap = clubDistancesM?.[clubId];
        if (typeof fromMap === 'number' && Number.isFinite(fromMap) && fromMap > 0) {
          isFilled = true;
        } else if (typeof fromMap === 'string' && fromMap.trim() !== '') {
          const n = parseFloat(fromMap);
          if (Number.isFinite(n) && n > 0) isFilled = true;
        } else if (
          typeof entry?.carryM === 'number' &&
          Number.isFinite(entry.carryM) &&
          entry.carryM > 0
        ) {
          isFilled = true;
        }
      } else {
        const v = entry?.[field];
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) isFilled = true;
      }
      if (isFilled) filled += 1;
    }
  }
  return Math.min(100, Math.round((filled / total) * 100));
}
