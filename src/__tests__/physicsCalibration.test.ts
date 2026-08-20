import { describe, expect, it } from 'vitest';
import { M_TO_YD } from '../constants/units.js';
import { PGA_ANCHOR_PROFILE } from '../methods/PGA_Anchor.js';
import { LPGA_ANCHOR_PROFILE } from '../methods/LPGA_Anchor.js';
import { simulateFlight } from '../physics/trajectory.js';
import { TRACKMAN_CLUB_IDS } from '../types/clubs.js';

describe('aerodynamic calibration against tour anchors', () => {
  const PGA_CARRY_TOLERANCE_YD = 8;
  const PGA_APEX_TOLERANCE_M = 5;
  const PGA_LANDING_TOLERANCE_DEG = 9;

  it('reproduces every measured PGA anchor within tolerance', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const anchor = PGA_ANCHOR_PROFILE[clubId];
      const flight = simulateFlight(anchor);

      expect(Math.abs(flight.carryM - anchor.stockCarryM) * M_TO_YD, `${clubId} carry`).toBeLessThan(
        PGA_CARRY_TOLERANCE_YD,
      );
      expect(Math.abs(flight.apexM - anchor.maxHeightM), `${clubId} apex`).toBeLessThan(
        PGA_APEX_TOLERANCE_M,
      );
      expect(
        Math.abs(flight.landingAngleDeg - anchor.landingAngleDeg),
        `${clubId} landing`,
      ).toBeLessThan(PGA_LANDING_TOLERANCE_DEG);
    }
  });

  it('keeps the mean PGA carry residual small and unbiased enough to trust', () => {
    const residualsYd = TRACKMAN_CLUB_IDS.map((clubId) => {
      const anchor = PGA_ANCHOR_PROFILE[clubId];
      return (simulateFlight(anchor).carryM - anchor.stockCarryM) * M_TO_YD;
    });

    const mean = residualsYd.reduce((sum, r) => sum + r, 0) / residualsYd.length;
    const rms = Math.sqrt(
      residualsYd.reduce((sum, r) => sum + r * r, 0) / residualsYd.length,
    );

    expect(Math.abs(mean)).toBeLessThan(2);
    expect(rms).toBeLessThan(4);
  });

  it('flies LPGA anchor launch conditions past their listed carry', () => {
    const driver = LPGA_ANCHOR_PROFILE.Driver;
    const flight = simulateFlight(driver);

    expect(flight.carryM).toBeGreaterThan(driver.stockCarryM);
    expect((flight.carryM - driver.stockCarryM) * M_TO_YD).toBeLessThan(24);
  });

  it('keeps every anchor row physically self-consistent in apex and landing', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const anchor = PGA_ANCHOR_PROFILE[clubId];
      const flight = simulateFlight(anchor);

      expect(flight.apexM, `${clubId} apex`).toBeGreaterThan(0);
      expect(flight.landingAngleDeg, `${clubId} landing`).toBeGreaterThan(anchor.launchAngleDeg);
    }
  });
});
