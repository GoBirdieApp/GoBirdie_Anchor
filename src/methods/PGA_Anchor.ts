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

// 2024 PGA Tour averages. OTTOM1, 01.06.2026
// (1-2 irons missing, must be filled as in the GB native shell). OTTOM1, 02.06.2026


export const PGA_ANCHOR_PROFILE = {
  
Driver:      { ballSpeedMs: _mph(171), launchAngleDeg: 10.4, spinRPM: 2545, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.198, maxHeightM: 32, landingAngleDeg: 39, stockCarryM: _yd(282) },

'3-Wood':    { ballSpeedMs: _mph(162), launchAngleDeg: 9.3,  spinRPM: 3663, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.205, maxHeightM: 29, landingAngleDeg: 44, stockCarryM:  _yd(249) },

'5-Wood':    { ballSpeedMs: _mph(156), launchAngleDeg: 9.7,  spinRPM: 4322, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.210, maxHeightM: 30, landingAngleDeg: 48, stockCarryM:  _yd(236) },

Hybrid:      { ballSpeedMs: _mph(157), launchAngleDeg: 9.7, spinRPM: 3487, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.211, maxHeightM: 25, landingAngleDeg: 45, stockCarryM:  _yd(239) },
 '1-iron':    { ballSpeedMs: _mph(152), launchAngleDeg: 10, spinRPM: 3900, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.214, maxHeightM: 26, landingAngleDeg: 46, stockCarryM:  _yd(230) },

 '2-iron':    { ballSpeedMs: _mph(152), launchAngleDeg: 10, spinRPM: 3900, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.214, maxHeightM: 26, landingAngleDeg: 46, stockCarryM:  _yd(230) },

'3-iron':    { ballSpeedMs: _mph(145), launchAngleDeg: 10.3, spinRPM: 4404, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.220, maxHeightM: 27, landingAngleDeg: 48, stockCarryM:  _yd(218) },

'4-iron':    { ballSpeedMs: _mph(140), launchAngleDeg: 10.8, spinRPM: 4782, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.222, maxHeightM: 28, landingAngleDeg: 49, stockCarryM:  _yd(209) },

'5-iron':    { ballSpeedMs: _mph(135), launchAngleDeg: 11.9, spinRPM: 5280, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.225, maxHeightM: 30, landingAngleDeg: 50, stockCarryM:  _yd(199) },

'6-iron':    { ballSpeedMs: _mph(130), launchAngleDeg: 14.0, spinRPM: 6204, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.228, maxHeightM: 29, landingAngleDeg: 50, stockCarryM:  _yd(188) },

'7-iron':    { ballSpeedMs: _mph(123), launchAngleDeg: 16.1, spinRPM: 7124, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.230, maxHeightM: 31, landingAngleDeg: 51, stockCarryM:  _yd(176) },

'8-iron':    { ballSpeedMs: _mph(118), launchAngleDeg: 17.8, spinRPM: 8078, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.233, maxHeightM: 30, landingAngleDeg: 51, stockCarryM:  _yd(164) },

'9-iron':    { ballSpeedMs: _mph(112), launchAngleDeg: 20.0, spinRPM: 8793, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.236, maxHeightM: 29, landingAngleDeg: 52, stockCarryM:  _yd(152) },

'P-Wedge':   { ballSpeedMs: _mph(104), launchAngleDeg: 23.7, spinRPM: 9316, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.240, maxHeightM: 29, landingAngleDeg: 52, stockCarryM:  _yd(142) },
// Ball speed re-derived from the trajectory model
// OTTOM1, 18.08.2026
'S-Wedge':   { ballSpeedMs: _mph( 92.2), launchAngleDeg: 28.0, spinRPM: 9800, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.242, maxHeightM: 26.8, landingAngleDeg: 50.4, stockCarryM: _yd( 116) },
  '60°-Wedge': { ballSpeedMs: _mph( 89.1), launchAngleDeg: 31.0, spinRPM: 10700, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.245, maxHeightM: 27.8, landingAngleDeg: 52.4, stockCarryM: _yd( 108) },
};



export { MPH_TO_MPS, MPS_TO_MPH, YD_TO_M, M_TO_YD };