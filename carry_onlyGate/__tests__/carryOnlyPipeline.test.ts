import { describe, expect, it } from 'vitest';
import { APEX_CALIBRATION, deriveCarryOnlyLaunch, handicapFlightAdjustments } from '../anchorBlend.js';
import { simulateFlight } from '../../src/physics/trajectory.js';
import { runAnchorPipeline } from '../../src/pipeline/runAnchorPipeline.js';
import { TRACKMAN_CLUB_IDS } from '../../src/types/clubs.js';
import { hcp5Player, hcp54Player, stockCarryPlayer } from '../../src/__tests__/fixtures/playerProfiles.js';

describe('carry-only pipeline', () => {
  it('produces a feasible full-bag profile with sane carry gapping', () => {
    const result = runAnchorPipeline({
      selectedClubIds: [...TRACKMAN_CLUB_IDS],
      hasTrackmanData: false,
      player: stockCarryPlayer,
    });

    for (const clubId of TRACKMAN_CLUB_IDS) {
      const profile = result.profiles[clubId];

      expect(profile?.source, clubId).toBe('carry_only');
      expect(profile?.carryM, clubId).toBeGreaterThan(0);
      expect(profile?.ballSpeedMs, clubId).toBeGreaterThan(0);
      expect(profile?.launchAngleDeg, clubId).toBeGreaterThan(0);
      expect(profile?.spinRPM, clubId).toBeGreaterThan(0);
      expect(profile?.maxHeightM, clubId).toBeGreaterThan(0);
      expect(profile?.landingAngleDeg, clubId).toBeGreaterThan(0);
      expect(result.feasibilityByClub[clubId]?.feasible, clubId).toBe(true);
    }

    for (let i = 1; i < TRACKMAN_CLUB_IDS.length; i += 1) {
      const previous = result.profiles[TRACKMAN_CLUB_IDS[i - 1]!]!;
      const current = result.profiles[TRACKMAN_CLUB_IDS[i]!]!;

      expect(current.carryM, `${previous.clubId} > ${current.clubId}`).toBeLessThan(previous.carryM);
    }
  });

  it('drops spin and lifts launch as handicap rises at equal carry', () => {
    const lowHcp = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      player: hcp5Player,
    }).profiles['7-iron']!;

    const highHcp = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      player: hcp54Player,
    }).profiles['7-iron']!;

    expect(highHcp.carryM).toBeCloseTo(lowHcp.carryM, 1);
    expect(highHcp.launchAngleDeg).toBeGreaterThan(lowHcp.launchAngleDeg);
    expect(highHcp.spinRPM).toBeLessThan(lowHcp.spinRPM);
    expect(highHcp.launchAngleDeg - lowHcp.launchAngleDeg).toBeCloseTo(8.5, 0);
    expect(lowHcp.spinRPM - highHcp.spinRPM).toBeGreaterThan(2000);
  });

  it('emits profiles that fly the carry they are labelled with', () => {
    const result = runAnchorPipeline({
      selectedClubIds: [...TRACKMAN_CLUB_IDS],
      hasTrackmanData: false,
      player: stockCarryPlayer,
    });

    for (const clubId of TRACKMAN_CLUB_IDS) {
      const profile = result.profiles[clubId]!;
      const flight = simulateFlight(profile);
      const hcpAdj = handicapFlightAdjustments(stockCarryPlayer.handicap ?? 12);
      const scratch = deriveCarryOnlyLaunch(clubId, profile.carryM, 0);

      if (clubId !== 'Driver') {
        expect(flight.carryM, `${clubId} carry`).toBeCloseTo(profile.carryM, 1);
      }
      expect(profile.maxHeightM, `${clubId} apex`).toBeCloseTo(
        scratch.maxHeightM + hcpAdj.apexDeltaM,
        1,
      );
      expect(profile.landingAngleDeg, `${clubId} landing`).toBeCloseTo(
        scratch.landingAngleDeg + hcpAdj.landingDeltaDeg,
        1,
      );
    }
  });
});
