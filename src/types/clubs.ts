export const TRACKMAN_CLUB_IDS = [
  'Driver',
  '3-Wood',
  '5-Wood',
  'Hybrid',
  '3-iron',
  '4-iron',
  '5-iron',
  '6-iron',
  '7-iron',
  '8-iron',
  '9-iron',
  'P-Wedge',
  'S-Wedge',
  '60°-Wedge',
] as const;

export type TrackmanClubId = (typeof TRACKMAN_CLUB_IDS)[number];

export function isTrackmanClubId(value: string): value is TrackmanClubId {
  return (TRACKMAN_CLUB_IDS as readonly string[]).includes(value);
}
