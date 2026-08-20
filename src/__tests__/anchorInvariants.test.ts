import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKMAN } from '../constants/defaults.js';
import { M_TO_YD, YD_TO_M } from '../constants/units.js';
import { runAnchorPipeline } from '../pipeline/runAnchorPipeline.js';
import { TRACKMAN_CLUB_IDS } from '../types/clubs.js';
import { getAnchorCarryM } from '../utils/carry.js';
import {
  derivePersonalizedDefaults,
  deriveSkillFactor,
  normalizeHandicap,
} from '../utils/personalization.js';
import { clubLaunchBand } from '../methods/launchBands.js';

describe('anchor invariants', () => {
  it('keeps reference launch and spin values inside each club band', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const band = clubLaunchBand(clubId);
      const anchor = DEFAULT_TRACKMAN[clubId];

      expect(anchor.launchAngleDeg, `${clubId} launch low`).toBeGreaterThanOrEqual(
        band.launchMinDeg,
      );
      expect(anchor.launchAngleDeg, `${clubId} launch high`).toBeLessThanOrEqual(
        band.launchMaxDeg,
      );
      expect(anchor.spinRPM, `${clubId} spin low`).toBeGreaterThanOrEqual(band.spinMinRpm);
      expect(anchor.spinRPM, `${clubId} spin high`).toBeLessThanOrEqual(band.spinMaxRpm);
      expect(band.launchMinDeg, `${clubId} launch span`).toBeLessThan(band.launchMaxDeg);
      expect(band.spinMinRpm, `${clubId} spin span`).toBeLessThan(band.spinMaxRpm);
    }
  });

  it('applies one skill ratio to non-driver stock carries', () => {
    const driverCarryM = DEFAULT_TRACKMAN.Driver.stockCarryM * 1.08;
    const player = {
      handicap: 12,
      clubDistancesM: {
        Driver: driverCarryM,
      },
    };
    const personalized = derivePersonalizedDefaults(player);
    const skill = deriveSkillFactor(driverCarryM);

    for (const clubId of TRACKMAN_CLUB_IDS.filter((id) => id !== 'Driver')) {
      const actualRatio = personalized[clubId].stockCarryM / DEFAULT_TRACKMAN[clubId].stockCarryM;

      expect(actualRatio, clubId).toBeCloseTo(skill, 10);
    }
  });

  it('lets explicit club carry override driver-ratio personalization', () => {
    const personalized = derivePersonalizedDefaults({
      handicap: 12,
      clubDistancesM: {
        Driver: 300 * YD_TO_M,
        '7-iron': 150 * YD_TO_M,
      },
    });

    expect(personalized['7-iron'].stockCarryM * M_TO_YD).toBeCloseTo(150, 6);
    expect(personalized['7-iron'].stockCarryM).not.toBeCloseTo(
      DEFAULT_TRACKMAN['7-iron'].stockCarryM * deriveSkillFactor(300 * YD_TO_M),
      10,
    );
  });

  it('uses finite positive carries and falls back for invalid values', () => {
    expect(getAnchorCarryM({ Driver: '230.5' }, 'Driver')).toBeCloseTo(230.5, 10);
    expect(getAnchorCarryM({ Driver: 0 }, 'Driver')).toBe(DEFAULT_TRACKMAN.Driver.stockCarryM);
    expect(getAnchorCarryM({ Driver: -10 }, 'Driver')).toBe(DEFAULT_TRACKMAN.Driver.stockCarryM);
    expect(getAnchorCarryM({ Driver: ' ' }, 'Driver')).toBe(DEFAULT_TRACKMAN.Driver.stockCarryM);
    expect(getAnchorCarryM({ Driver: Number.NaN }, 'Driver')).toBe(
      DEFAULT_TRACKMAN.Driver.stockCarryM,
    );
  });

  it('clamps handicap inputs to the supported range', () => {
    expect(normalizeHandicap(null)).toBe(10);
    expect(normalizeHandicap('scratch')).toBe(10);
    expect(normalizeHandicap(-4)).toBe(0);
    expect(normalizeHandicap(72)).toBe(54);
    expect(normalizeHandicap('18.5')).toBe(18.5);
  });

  it('keeps measured and estimated clubs separated in a mixed bag', () => {
    const result = runAnchorPipeline({
      selectedClubIds: ['Driver', '7-iron'],
      hasTrackmanData: true,
      dataSourceByClub: {
        Driver: 'trackman',
        '7-iron': 'estimated',
      },
      trackmanProfiles: {
        Driver: {
          ballSpeedMs: DEFAULT_TRACKMAN.Driver.ballSpeedMs,
          launchAngleDeg: DEFAULT_TRACKMAN.Driver.launchAngleDeg,
          spinRPM: DEFAULT_TRACKMAN.Driver.spinRPM,
          carryM: DEFAULT_TRACKMAN.Driver.stockCarryM,
        },
      },
      player: {
        handicap: 12,
        clubDistancesM: {
          '7-iron': 155 * YD_TO_M,
        },
      },
    });

    expect(result.profiles.Driver?.source).toBe('trackman');
    expect(result.profiles['7-iron']?.source).toBe('carry_only');
    expect(result.exportPayload.clubs.find((club) => club.clubId === 'Driver')?.estimated).toBe(
      false,
    );
    expect(result.exportPayload.clubs.find((club) => club.clubId === '7-iron')?.estimated).toBe(
      true,
    );
  });
});
