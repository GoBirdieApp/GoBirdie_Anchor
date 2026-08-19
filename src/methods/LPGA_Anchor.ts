/* Duplicate unit helpers — yeah, lazy. OTTOM1, 20.06.2026 */

const MPH_TO_MPS = 0.44704 as const;
const YD_TO_M = 0.9144 as const;
const M_TO_YD = 1.09361 as const;
const MPS_TO_MPH = 2.23694 as const;


export const TRACKMAN_CLUB_IDS = [
  'Driver',
  '3-Wood',
  '5-Wood',
  'Hybrid',
  '1-iron',
  '2-iron',
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



const _mph = (v: number): number => v * MPH_TO_MPS;
const _yd  = (v: number): number => v * YD_TO_M;

export function sideSpinRpmFromSpinAxis(backspinRpm: number, spinAxisDeg: number): number {
  const rad = (spinAxisDeg * Math.PI) / 180;
  return backspinRpm * Math.tan(rad);
}

type AnchorClubEntry = {
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
  spinAxisDeg: number;
  launchDirectionDeg: number;
  effectiveMassKg: number;
  maxHeightM: number;
  landingAngleDeg: number;
  stockCarryM: number;
};


// 2023 LPGA Tour averages (1-2 irons missing, must be filled as in the GB native shell). OTTOM1, 02.06.2026
export const LPGA_ANCHOR_PROFILE = {
  Driver: {
    ballSpeedMs: _mph(143),
    launchAngleDeg: 12.6,
    spinRPM: 2506,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.198,
    maxHeightM: 24,
    landingAngleDeg: 36,
    stockCarryM: _yd(204),
  },

  '3-Wood': {
    ballSpeedMs: _mph(135),
    launchAngleDeg: 11.6,
    spinRPM: 2595,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.205,
    maxHeightM: 23,
    landingAngleDeg: 38,
    stockCarryM: _yd(183),
  },

  '5-Wood': {
    ballSpeedMs: _mph(130),
    launchAngleDeg: 12.3,
    spinRPM: 4320,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.210,
    maxHeightM: 23,
    landingAngleDeg: 43,
    stockCarryM: _yd(173),
  },

  Hybrid: {
    ballSpeedMs: _mph(125),
    launchAngleDeg: 13.9,
    spinRPM: 4504,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.215,
    maxHeightM: 23,
    landingAngleDeg: 45,
    stockCarryM: _yd(163),
  },
'1-iron': { ballSpeedMs: _mph(129), launchAngleDeg: 11.5, spinRPM: 4200, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.213, maxHeightM: 24, landingAngleDeg: 37, stockCarryM: _yd(194) },

'2-iron': { ballSpeedMs: _mph(125), launchAngleDeg: 12.5, spinRPM: 4400, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.214, maxHeightM: 24, landingAngleDeg: 39, stockCarryM: _yd(186) },

'3-iron': { ballSpeedMs: _mph(121), launchAngleDeg: 13.5, spinRPM: 4600, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.214, maxHeightM: 23, landingAngleDeg: 41, stockCarryM: _yd(175) },



  '4-iron': {
    ballSpeedMs: _mph(118),
    launchAngleDeg: 13.9,
    spinRPM: 4608,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.222,
    maxHeightM: 23,
    landingAngleDeg: 43,
    stockCarryM: _yd(160),
  },

  '5-iron': {
    ballSpeedMs: _mph(114),
    launchAngleDeg: 14.6,
    spinRPM: 4966,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.225,
    maxHeightM: 23,
    landingAngleDeg: 45,
    stockCarryM: _yd(152),
  },

  '6-iron': {
    ballSpeedMs: _mph(111),
    launchAngleDeg: 16.7,
    spinRPM: 5904,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.228,
    maxHeightM: 23,
    landingAngleDeg: 46,
    stockCarryM: _yd(142),
  },

  '7-iron': {
    ballSpeedMs: _mph(106),
    launchAngleDeg: 18.5,
    spinRPM: 6630,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.230,
    maxHeightM: 24,
    landingAngleDeg: 47,
    stockCarryM: _yd(131),
  },

  '8-iron': {
    ballSpeedMs: _mph(102),
    launchAngleDeg: 20.8,
    spinRPM: 7413,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.233,
    maxHeightM: 25,
    landingAngleDeg: 47,
    stockCarryM: _yd(122),
  },

  '9-iron': {
    ballSpeedMs: _mph(95),
    launchAngleDeg: 23.5,
    spinRPM: 7605,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.236,
    maxHeightM: 25,
    landingAngleDeg: 48,
    stockCarryM: _yd(112),
  },

  'P-Wedge': {
    ballSpeedMs: _mph(88),
    launchAngleDeg: 25.2,
    spinRPM: 8465,
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
    effectiveMassKg: 0.240,
    maxHeightM: 25,
    landingAngleDeg: 48,
    stockCarryM: _yd(101),
  },
} as const satisfies Partial<Record<TrackmanClubId, AnchorClubEntry>>;

export { MPH_TO_MPS, MPS_TO_MPH, YD_TO_M, M_TO_YD };