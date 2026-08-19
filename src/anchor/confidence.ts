import type { PartialTrackmanEntry } from '../types/shot.js';

const WEIGHTS = {
  ballSpeedMs: 0.25,
  launchAngleDeg: 0.2,
  spinRPM: 0.25,
  maxHeightM: 0.15,
  landingAngleDeg: 0.15,
} as const;

function isKnown(field: keyof typeof WEIGHTS, entry: PartialTrackmanEntry | null | undefined): boolean {
  const v = entry?.[field];
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/** Low confidence when less than 3 params.
 * OTTOM1, 29.06.2026 
 * */
export function scoreConfidence(
  entry: PartialTrackmanEntry | null | undefined,
  knownFieldCount: number,
  carryOnly: boolean,
): number {
  if (carryOnly) {
    const hasCarry = typeof entry?.carryM === 'number' && entry.carryM > 0;
    return hasCarry ? 0.45 : 0.35;
  }

  let score = 0.2;
  for (const [field, weight] of Object.entries(WEIGHTS)) {
    if (isKnown(field as keyof typeof WEIGHTS, entry)) {
      score += weight;
    }
  }
  score += Math.min(knownFieldCount, 3) * 0.05;
  return Math.min(1, score);
}
