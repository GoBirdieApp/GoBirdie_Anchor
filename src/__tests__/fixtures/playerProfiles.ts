import { DEFAULT_TRACKMAN } from '../../constants/defaults.js';
import { TRACKMAN_CLUB_IDS } from '../../types/clubs.js';
import type { PlayerProfile } from '../../types/player.js';

const stockCarryMap = Object.fromEntries(
  TRACKMAN_CLUB_IDS.map((clubId) => [clubId, DEFAULT_TRACKMAN[clubId].stockCarryM]),
);

export const hcp5Player: PlayerProfile = {
  handicap: 5,
  clubDistancesM: stockCarryMap,
};

export const hcp54Player: PlayerProfile = {
  handicap: 54,
  clubDistancesM: stockCarryMap,
};

export const stockCarryPlayer: PlayerProfile = {
  handicap: 12,
  clubDistancesM: stockCarryMap,
};

