import type { PlayerProfile } from '../types/player.js';
import type { PersonalizedDefaults } from '../types/shot.js';
import { TRACKMAN_CLUB_IDS } from '../types/clubs.js';
import {
  CH_SPEED_RANGE_MPH,
  DEFAULT_TRACKMAN,
  HCP_BASELINE,
  LAUNCH_FACTOR_PER_HCP,
  LAUNCH_FACTOR_RANGE,
  SPIN_FACTOR_PER_HCP,
  SPIN_FACTOR_RANGE,
} from '../constants/defaults.js';
import { MPH_TO_MPS, M_TO_YD } from '../constants/units.js';
import { clamp } from './math.js';
import { getAnchorCarryM } from './carry.js';

export function normalizeHandicap(raw: number | string | null | undefined): number {
  if (raw == null) return HCP_BASELINE;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(n)) return HCP_BASELINE;
  return clamp(n, 0, 54);
}

export function clubheadSpeedMsFromDriverCarry(carryM: number): number {
  const carryYd = carryM * M_TO_YD;
  const vChMph = clamp(0.437 * carryYd - 11.25, CH_SPEED_RANGE_MPH[0], CH_SPEED_RANGE_MPH[1]);
  return vChMph * MPH_TO_MPS;
}

export function handicapSpinFactor(hcp: number): number {
  return clamp(
    1 + (hcp - HCP_BASELINE) * SPIN_FACTOR_PER_HCP,
    SPIN_FACTOR_RANGE[0],
    SPIN_FACTOR_RANGE[1],
  );
}

export function handicapLaunchFactor(hcp: number): number {
  return clamp(
    1 + (hcp - HCP_BASELINE) * LAUNCH_FACTOR_PER_HCP,
    LAUNCH_FACTOR_RANGE[0],
    LAUNCH_FACTOR_RANGE[1],
  );
}

export function deriveSkillFactor(driverCarryM: number): number {
  const userCH = clubheadSpeedMsFromDriverCarry(driverCarryM);
  const defaultCH = clubheadSpeedMsFromDriverCarry(DEFAULT_TRACKMAN.Driver.stockCarryM);
  return userCH / defaultCH;
}


export function derivePersonalizedDefaults(player: PlayerProfile = {}): PersonalizedDefaults {
  const driverCarryM = getAnchorCarryM(
    player.clubDistancesM,
    'Driver',
    null,
    DEFAULT_TRACKMAN.Driver.stockCarryM,
  );
  const skill = deriveSkillFactor(driverCarryM);
  const hcp = normalizeHandicap(player.handicap);
  const spinF = handicapSpinFactor(hcp);
  const launchF = handicapLaunchFactor(hcp);

  const out = {} as PersonalizedDefaults;
  for (const clubId of TRACKMAN_CLUB_IDS) {
    const base = DEFAULT_TRACKMAN[clubId];
    const personalisedStockCarryM = base.stockCarryM * skill;
    const carryM = getAnchorCarryM(
      player.clubDistancesM,
      clubId,
      null,
      personalisedStockCarryM,
    );

    out[clubId] = {
      ballSpeedMs: base.ballSpeedMs * skill,
      launchAngleDeg: base.launchAngleDeg * launchF,
      spinRPM: base.spinRPM * spinF,
      spinAxisDeg: base.spinAxisDeg,
      launchDirectionDeg: base.launchDirectionDeg,
      effectiveMassKg: base.effectiveMassKg,
      maxHeightM: base.maxHeightM,
      landingAngleDeg: base.landingAngleDeg,
      stockCarryM: carryM,
    };
  }
  return out;
}
