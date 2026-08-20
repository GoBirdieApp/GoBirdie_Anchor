import { DEFAULT_TRACKMAN } from '../../constants/defaults.js';
import type { PartialTrackmanEntry } from '../../types/shot.js';

export const partialFlightFields = [
  'ballSpeedMs',
  'launchAngleDeg',
  'spinRPM',
  'maxHeightM',
  'landingAngleDeg',
] as const satisfies ReadonlyArray<keyof PartialTrackmanEntry>;

export type PartialFlightField = (typeof partialFlightFields)[number];

export const pgaSevenIron = {
  ballSpeedMs: DEFAULT_TRACKMAN['7-iron'].ballSpeedMs,
  launchAngleDeg: DEFAULT_TRACKMAN['7-iron'].launchAngleDeg,
  spinRPM: DEFAULT_TRACKMAN['7-iron'].spinRPM,
  maxHeightM: DEFAULT_TRACKMAN['7-iron'].maxHeightM,
  landingAngleDeg: DEFAULT_TRACKMAN['7-iron'].landingAngleDeg,
  carryM: DEFAULT_TRACKMAN['7-iron'].stockCarryM,
} satisfies PartialTrackmanEntry;

export function pgaPairEntry(
  first: PartialFlightField,
  second: PartialFlightField,
): PartialTrackmanEntry {
  return {
    [first]: pgaSevenIron[first],
    [second]: pgaSevenIron[second],
  };
}
