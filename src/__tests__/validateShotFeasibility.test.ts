import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKMAN } from '../constants/defaults.js';
import { MPH_TO_MPS, YD_TO_M } from '../constants/units.js';
import { validateShotFeasibility } from '../estimation/validateShotFeasibility.js';
import { TRACKMAN_CLUB_IDS } from '../types/clubs.js';
import { pgaAverageEntry } from './fixtures/pgaAverages.js';

describe('validateShotFeasibility', () => {
  it('accepts every PGA average anchor', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const result = validateShotFeasibility(pgaAverageEntry(clubId));

      expect(result.feasible, clubId).toBe(true);
      expect(result.issues.filter((issue) => issue.severity === 'error'), clubId).toEqual([]);
    }
  });

  it('rejects a 7-iron with too much carry for 110 mph ball speed', () => {
    const pga = DEFAULT_TRACKMAN['7-iron'];
    const result = validateShotFeasibility(
      {
        ballSpeedMs: 110 * MPH_TO_MPS,
        launchAngleDeg: pga.launchAngleDeg,
        spinRPM: pga.spinRPM,
        carryM: pga.stockCarryM,
      },
      { clubId: '7-iron' },
    );

    expect(result.feasible).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'carry_exceeds_max')).toBe(true);
  });

  it('rejects PGA launch numbers with a carry 50 yards short', () => {
    const pga = DEFAULT_TRACKMAN['7-iron'];
    const result = validateShotFeasibility({
      ballSpeedMs: pga.ballSpeedMs,
      launchAngleDeg: pga.launchAngleDeg,
      spinRPM: pga.spinRPM,
      carryM: pga.stockCarryM - 50 * YD_TO_M,
    });

    expect(result.feasible).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'carry_below_expected')).toBe(true);
  });
});

