import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKMAN } from '../../src/constants/defaults.js';
import { MPH_TO_MPS, YD_TO_M } from '../../src/constants/units.js';
import { runPartialMethod } from '../Partial_Method.js';
import { clubLaunchBand } from '../../src/methods/launchBands.js';
import { reconcileLaunch } from '../reconcile.js';
import { simulateFlight } from '../../src/physics/trajectory.js';
import { TRACKMAN_CLUB_IDS } from '../../src/types/clubs.js';
import type { PartialTrackmanEntry } from '../../src/types/shot.js';
import { derivePersonalizedDefaults } from '../../src/utils/personalization.js';
import { stockCarryPlayer } from '../../src/__tests__/fixtures/playerProfiles.js';

const personalized = derivePersonalizedDefaults(stockCarryPlayer);

const CORE_FIELDS = ['ballSpeedMs', 'launchAngleDeg', 'spinRPM'] as const;
const DERIVED_FIELDS = ['maxHeightM', 'landingAngleDeg'] as const;
const ALL_FIELDS = [...CORE_FIELDS, ...DERIVED_FIELDS] as const;

function fieldSubsets(): (typeof ALL_FIELDS)[number][][] {
  const subsets: (typeof ALL_FIELDS)[number][][] = [];
  for (let mask = 0; mask < 1 << ALL_FIELDS.length; mask += 1) {
    subsets.push(ALL_FIELDS.filter((_, i) => (mask & (1 << i)) !== 0));
  }
  return subsets;
}

function entryFrom(
  clubId: (typeof TRACKMAN_CLUB_IDS)[number],
  fields: readonly (typeof ALL_FIELDS)[number][],
): PartialTrackmanEntry {
  const stock = DEFAULT_TRACKMAN[clubId];
  const entry: PartialTrackmanEntry = {};
  for (const field of fields) entry[field] = stock[field];
  return entry;
}

describe('partial-data gate', () => {
  it('emits a self-consistent profile for every combination of supplied fields', () => {
    for (const clubId of ['Driver', '7-iron', 'P-Wedge'] as const) {
      for (const fields of fieldSubsets()) {
        const label = `${clubId}: ${fields.join('+') || 'none'}`;
        const profile = runPartialMethod(
          clubId,
          entryFrom(clubId, fields),
          personalized,
          stockCarryPlayer.clubDistancesM,
          stockCarryPlayer.handicap,
        );

        const flight = simulateFlight({
          ballSpeedMs: profile.ballSpeedMs,
          launchAngleDeg: profile.launchAngleDeg,
          spinRPM: profile.spinRPM,
        });

        expect(flight.carryM, label).toBeCloseTo(profile.carryM, 6);
        expect(flight.apexM, label).toBeCloseTo(profile.maxHeightM, 6);
        expect(flight.landingAngleDeg, label).toBeCloseTo(profile.landingAngleDeg, 6);
        expect(profile.maxHeightM, label).toBeGreaterThan(0);
        expect(profile.landingAngleDeg, label).toBeGreaterThan(profile.launchAngleDeg * 0.9);
      }
    }
  });

  it('holds every supplied core field exactly as entered', () => {
    for (const fields of fieldSubsets()) {
      const entry = entryFrom('7-iron', fields);
      const profile = runPartialMethod(
        '7-iron',
        entry,
        personalized,
        stockCarryPlayer.clubDistancesM,
        stockCarryPlayer.handicap,
      );

      for (const field of CORE_FIELDS) {
        if (fields.includes(field)) {
          expect(profile[field], `${fields.join('+')} / ${field}`).toBeCloseTo(entry[field]!, 10);
        }
      }
      expect(profile.solvedFields).toEqual(CORE_FIELDS.filter((f) => !fields.includes(f)));
    }
  });

  it('reproduces the known carry whenever ball speed is free to absorb it', () => {
    const carryM = 165 * YD_TO_M;

    for (const fields of fieldSubsets().filter((f) => !f.includes('ballSpeedMs'))) {
      const profile = runPartialMethod(
        '7-iron',
        entryFrom('7-iron', fields),
        personalized,
        { '7-iron': carryM },
        12,
      );

      expect(profile.carryM, fields.join('+')).toBeCloseTo(carryM, 1);
    }
  });

  it('bends launch and spin toward a supplied apex instead of reporting it blindly', () => {
    const stock = DEFAULT_TRACKMAN['7-iron'];
    const base = { ballSpeedMs: stock.ballSpeedMs, spinRPM: stock.spinRPM };

    const flat = runPartialMethod('7-iron', { ...base, maxHeightM: 24 }, personalized, undefined, 12);
    const steep = runPartialMethod('7-iron', { ...base, maxHeightM: 36 }, personalized, undefined, 12);
    expect(steep.launchAngleDeg).toBeGreaterThan(flat.launchAngleDeg);
    expect(steep.maxHeightM).toBeGreaterThan(flat.maxHeightM);
    expect(Math.abs(steep.maxHeightM - 36)).toBeLessThan(1.5);
    expect(Math.abs(flat.maxHeightM - 24)).toBeLessThan(1.5);
  });

  it('bends launch toward a supplied landing angle', () => {
    const stock = DEFAULT_TRACKMAN['7-iron'];
    const base = { ballSpeedMs: stock.ballSpeedMs, spinRPM: stock.spinRPM };

    const shallow = runPartialMethod('7-iron', { ...base, landingAngleDeg: 38 }, personalized, undefined, 12);
    const steep = runPartialMethod('7-iron', { ...base, landingAngleDeg: 52 }, personalized, undefined, 12);

    expect(steep.landingAngleDeg).toBeGreaterThan(shallow.landingAngleDeg + 5);
    expect(steep.launchAngleDeg).toBeGreaterThan(shallow.launchAngleDeg);
  });

  it('keeps solved launch and spin inside the club band', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const band = clubLaunchBand(clubId);
      const profile = runPartialMethod(
        clubId,
        { maxHeightM: DEFAULT_TRACKMAN[clubId].maxHeightM },
        personalized,
        stockCarryPlayer.clubDistancesM,
        stockCarryPlayer.handicap,
      );

      expect(profile.launchAngleDeg, clubId).toBeGreaterThanOrEqual(band.launchMinDeg - 1e-6);
      expect(profile.launchAngleDeg, clubId).toBeLessThanOrEqual(band.launchMaxDeg + 1e-6);
      expect(profile.spinRPM, clubId).toBeGreaterThanOrEqual(band.spinMinRpm - 1e-6);
      expect(profile.spinRPM, clubId).toBeLessThanOrEqual(band.spinMaxRpm + 1e-6);
    }
  });

  it('reports an honest residual when a claim cannot be flown', () => {
    const stock = DEFAULT_TRACKMAN['7-iron'];
    const profile = runPartialMethod(
      '7-iron',
      { ballSpeedMs: stock.ballSpeedMs, spinRPM: stock.spinRPM, maxHeightM: 60 },
      personalized,
      undefined,
      12,
    );

    expect(profile.maxHeightM).toBeLessThan(60);
    expect(profile.apexResidualM).not.toBeNull();
    expect(profile.apexResidualM!).toBeGreaterThan(5);
  });

  it('passes a full launch monitor row straight through', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const stock = DEFAULT_TRACKMAN[clubId];
      const profile = runPartialMethod(
        clubId,
        {
          ballSpeedMs: stock.ballSpeedMs,
          launchAngleDeg: stock.launchAngleDeg,
          spinRPM: stock.spinRPM,
        },
        personalized,
        stockCarryPlayer.clubDistancesM,
        stockCarryPlayer.handicap,
      );

      expect(profile.ballSpeedMs, clubId).toBeCloseTo(stock.ballSpeedMs, 10);
      expect(profile.launchAngleDeg, clubId).toBeCloseTo(stock.launchAngleDeg, 10);
      expect(profile.spinRPM, clubId).toBeCloseTo(stock.spinRPM, 10);
      expect(profile.solvedFields, clubId).toEqual([]);
    }
  });

  it('never spends more than the evaluation budget on one club', () => {
    const solved = reconcileLaunch({
      observed: { carryM: 200 * YD_TO_M, maxHeightM: 40, landingAngleDeg: 45 },
      prior: { ballSpeedMs: 70, launchAngleDeg: 12, spinRPM: 2600 },
      band: clubLaunchBand('Driver'),
    });

    expect(solved.evaluations).toBeLessThanOrEqual(220);
  });

  it('resolves a whole bag of partial entries fast enough for a request path', () => {
    const started = Date.now();

    for (const clubId of TRACKMAN_CLUB_IDS) {
      runPartialMethod(
        clubId,
        { maxHeightM: DEFAULT_TRACKMAN[clubId].maxHeightM, landingAngleDeg: DEFAULT_TRACKMAN[clubId].landingAngleDeg },
        personalized,
        stockCarryPlayer.clubDistancesM,
        stockCarryPlayer.handicap,
      );
    }

    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('does not let a contradictory ball speed silently produce the claimed carry', () => {
    const stock = DEFAULT_TRACKMAN['7-iron'];
    const profile = runPartialMethod(
      '7-iron',
      {
        ballSpeedMs: 110 * MPH_TO_MPS,
        launchAngleDeg: stock.launchAngleDeg,
        spinRPM: stock.spinRPM,
      },
      personalized,
      stockCarryPlayer.clubDistancesM,
      12,
    );

    expect(profile.carryM).toBeLessThan(stock.stockCarryM - 5);
  });
});
