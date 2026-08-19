import type { TrackmanClubId } from '../types/clubs.js';
import type { FullClubDefault } from '../types/shot.js';
import { MPH_TO_MPS, YD_TO_M } from './units.js';

const mph = (v: number): number => v * MPH_TO_MPS;
const yd = (v: number): number => v * YD_TO_M;

/* 2023/4 PGA Tour averages with fallback anchor from GoBirdie.
 OTTOM1, 17.08.2026 */

export const DEFAULT_TRACKMAN: Record<TrackmanClubId, FullClubDefault> = {

  Driver: { ballSpeedMs: mph(171), launchAngleDeg: 10.4, spinRPM: 2545, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.198, maxHeightM: 32, landingAngleDeg: 39, stockCarryM: yd(282) },
  '3-Wood': { ballSpeedMs: mph(162), launchAngleDeg: 9.3, spinRPM: 3663, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.205, maxHeightM: 29, landingAngleDeg: 44, stockCarryM: yd(249) },
  '5-Wood': { ballSpeedMs: mph(156), launchAngleDeg: 9.7, spinRPM: 4322, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.210, maxHeightM: 30, landingAngleDeg: 48, stockCarryM: yd(236) },
  
  Hybrid: { ballSpeedMs: mph(149), launchAngleDeg: 10.2, spinRPM: 4587, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.215, maxHeightM: 28, landingAngleDeg: 49, stockCarryM: yd(231) },
 
  '3-iron': { ballSpeedMs: mph(145), launchAngleDeg: 10.3, spinRPM: 4404, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.220, maxHeightM: 27, landingAngleDeg: 48, stockCarryM: yd(218) },
  '4-iron': { ballSpeedMs: mph(140), launchAngleDeg: 10.8, spinRPM: 4782, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.222, maxHeightM: 28, landingAngleDeg: 49, stockCarryM: yd(209) },
  '5-iron': { ballSpeedMs: mph(135), launchAngleDeg: 11.9, spinRPM: 5280, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.225, maxHeightM: 30, landingAngleDeg: 50, stockCarryM: yd(199) },
  '6-iron': { ballSpeedMs: mph(130), launchAngleDeg: 14.0, spinRPM: 6204, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.228, maxHeightM: 29, landingAngleDeg: 50, stockCarryM: yd(188) },
  '7-iron': { ballSpeedMs: mph(123), launchAngleDeg: 16.1, spinRPM: 7124, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.230, maxHeightM: 31, landingAngleDeg: 51, stockCarryM: yd(176) },
  '8-iron': { ballSpeedMs: mph(118), launchAngleDeg: 17.8, spinRPM: 8078, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.233, maxHeightM: 30, landingAngleDeg: 51, stockCarryM: yd(164) },
  '9-iron': { ballSpeedMs: mph(112), launchAngleDeg: 20.0, spinRPM: 8793, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.236, maxHeightM: 29, landingAngleDeg: 52, stockCarryM: yd(152) },
  'P-Wedge': { ballSpeedMs: mph(104), launchAngleDeg: 23.7, spinRPM: 9316, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.240, maxHeightM: 29, landingAngleDeg: 52, stockCarryM: yd(142) },
  
  /*
   * S-Wedge + 60deg were extrapolated linearly off P-Wedge speed: way too slow for the carry
   * OTTOM1, 19.08.2026
   */

  'S-Wedge': { ballSpeedMs: mph(92.2), launchAngleDeg: 28.0, spinRPM: 9800, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.242, maxHeightM: 26.8, landingAngleDeg: 50.4, stockCarryM: yd(116) },
  '60°-Wedge': { ballSpeedMs: mph(89.1), launchAngleDeg: 31.0, spinRPM: 10700, spinAxisDeg: 0, launchDirectionDeg: 0, effectiveMassKg: 0.245, maxHeightM: 27.8, landingAngleDeg: 52.4, stockCarryM: yd(108) },
};

export const HCP_BASELINE = 10;
export const SPIN_FACTOR_PER_HCP = 0.010;
export const LAUNCH_FACTOR_PER_HCP = 0.005;
export const SPIN_FACTOR_RANGE: readonly [number, number] = [0.85, 1.30];
export const LAUNCH_FACTOR_RANGE: readonly [number, number] = [0.95, 1.10];
export const CH_SPEED_RANGE_MPH: readonly [number, number] = [70, 130];

/* min params for carry-only pipeline gate

OTTOM1, 18.08.2026 */

export const MIN_VALID_ESTIMATION_PARAMS = 2;

export const CONFIDENCE_THRESHOLD = 0.55;
