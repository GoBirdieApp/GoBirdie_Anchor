

import type { LaunchBand } from '../physics/solve.js';
import type { TrackmanClubId } from '../types/clubs.js';
import { clamp } from '../utils/math.js';
import { LPGA_ANCHOR_PROFILE } from './LPGA_Anchor.js';
import { PGA_ANCHOR_PROFILE } from './PGA_Anchor.js';

/** Hard floor/ceiling: no club goes outside these.
 *  OTTOM1, 12.08.2026 */
const LAUNCH_FLOOR_DEG = 4;
const LAUNCH_CEILING_DEG = 42;
const SPIN_FLOOR_RPM = 1400;
const SPIN_CEILING_RPM = 13000;

interface BandRatios {
  launchLow: number;
  launchHigh: number;
  spinLow: number;
  spinHigh: number;
}

/**
 *  Woods spread wide 
 *  wedges tight (loft).
 *  OTTOM1, 12.08.2026 */
const WOOD_RATIOS: BandRatios = { launchLow: 0.72, launchHigh: 1.28, spinLow: 0.78, spinHigh: 1.55 };
const IRON_RATIOS: BandRatios = { launchLow: 0.72, launchHigh: 1.38, spinLow: 0.68, spinHigh: 1.50 };
const WEDGE_RATIOS: BandRatios = { launchLow: 0.80, launchHigh: 1.22, spinLow: 0.70, spinHigh: 1.35 };

function ratiosFor(clubId: TrackmanClubId): BandRatios {
  if (clubId === 'Driver' || clubId.endsWith('Wood') || clubId === 'Hybrid') return WOOD_RATIOS;
  if (clubId.endsWith('Wedge')) return WEDGE_RATIOS;
  return IRON_RATIOS;
}




export function clubLaunchBand(clubId: TrackmanClubId): LaunchBand {
  const pga = PGA_ANCHOR_PROFILE[clubId];
  const lpga =
    clubId in LPGA_ANCHOR_PROFILE
      ? LPGA_ANCHOR_PROFILE[clubId as keyof typeof LPGA_ANCHOR_PROFILE]
      : pga;
  const ratios = ratiosFor(clubId);

  const launchLow = Math.min(pga.launchAngleDeg, lpga.launchAngleDeg);
  const launchHigh = Math.max(pga.launchAngleDeg, lpga.launchAngleDeg);
  const spinLow = Math.min(pga.spinRPM, lpga.spinRPM);
  const spinHigh = Math.max(pga.spinRPM, lpga.spinRPM);

  return {
    launchMinDeg: clamp(launchLow * ratios.launchLow, LAUNCH_FLOOR_DEG, LAUNCH_CEILING_DEG),
    launchMaxDeg: clamp(launchHigh * ratios.launchHigh, LAUNCH_FLOOR_DEG, LAUNCH_CEILING_DEG),
    spinMinRpm: clamp(spinLow * ratios.spinLow, SPIN_FLOOR_RPM, SPIN_CEILING_RPM),
    spinMaxRpm: clamp(spinHigh * ratios.spinHigh, SPIN_FLOOR_RPM, SPIN_CEILING_RPM),
  };
}

/** clamp launch/spin into the club band
 *  OTTOM1, 13.08.2026 */
export function clampToBand(
  band: LaunchBand,
  launchAngleDeg: number,
  spinRPM: number,
): { launchAngleDeg: number; spinRPM: number } {
  return {
    launchAngleDeg: clamp(launchAngleDeg, band.launchMinDeg, band.launchMaxDeg),
    spinRPM: clamp(spinRPM, band.spinMinRpm, band.spinMaxRpm),
  };
}
