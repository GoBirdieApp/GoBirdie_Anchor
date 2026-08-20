import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKMAN } from '../../src/constants/defaults.js';
import { MPH_TO_MPS } from '../../src/constants/units.js';
import { validateEstimationParams } from '../../src/estimation/validateParams.js';
import { runPartialMethod } from '../Partial_Method.js';
import {
  runAnchorPipeline,
  runAnchorPipelineStrict,
  ShotFeasibilityValidationError,
} from '../../src/pipeline/runAnchorPipeline.js';
import { derivePersonalizedDefaults } from '../../src/utils/personalization.js';
import { pgaPairEntry, partialFlightFields, pgaSevenIron } from '../../src/__tests__/fixtures/partialEntries.js';
import { hcp5Player, hcp54Player, stockCarryPlayer } from '../../src/__tests__/fixtures/playerProfiles.js';

describe('partial TrackMan mode', () => {
  it('fills finite positive launch values from every single known field', () => {
    const personalized = derivePersonalizedDefaults(stockCarryPlayer);

    for (const field of partialFlightFields) {
      const profile = runPartialMethod(
        '7-iron',
        { [field]: pgaSevenIron[field] },
        personalized,
        stockCarryPlayer.clubDistancesM,
        stockCarryPlayer.handicap,
      );

      expect(profile.ballSpeedMs, field).toBeGreaterThan(0);
      expect(profile.launchAngleDeg, field).toBeGreaterThan(0);
      expect(profile.spinRPM, field).toBeGreaterThan(0);
      expect(profile.maxHeightM, field).toBeGreaterThan(0);
      expect(profile.landingAngleDeg, field).toBeGreaterThan(0);
      expect(Number.isFinite(profile.sideSpinRPM), field).toBe(true);
    }
  });

  it('keeps every PGA two-field pair feasible after inference', () => {
    for (let i = 0; i < partialFlightFields.length; i += 1) {
      for (let j = i + 1; j < partialFlightFields.length; j += 1) {
        const first = partialFlightFields[i]!;
        const second = partialFlightFields[j]!;
        const result = runAnchorPipeline({
          selectedClubIds: ['7-iron'],
          hasTrackmanData: false,
          trackmanProfiles: { '7-iron': pgaPairEntry(first, second) },
          player: stockCarryPlayer,
        });

        expect(result.profiles['7-iron']?.source, `${first}+${second}`).toBe('partial');
        expect(result.feasibilityByClub['7-iron']?.feasible, `${first}+${second}`).toBe(true);
      }
    }
  });

  it('counts carry as a partial constraint only when a ball-flight field is present', () => {
    const validation = validateEstimationParams({
      ballSpeedMs: pgaSevenIron.ballSpeedMs,
      carryM: pgaSevenIron.carryM,
    });

    expect(validation.meetsMinimum).toBe(true);
    expect(validation.validFields).toEqual(expect.arrayContaining(['ballSpeedMs', 'carryM']));

    const result = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      trackmanProfiles: { '7-iron': { ballSpeedMs: pgaSevenIron.ballSpeedMs } },
      player: stockCarryPlayer,
    });

    expect(result.profiles['7-iron']?.source).toBe('partial');
    expect(result.validationByClub['7-iron']?.validFields).toContain('carryM');
  });

  it('skips a one-field partial entry when no carry is known', () => {
    const result = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      trackmanProfiles: { '7-iron': { ballSpeedMs: pgaSevenIron.ballSpeedMs } },
      player: { handicap: 12 },
    });

    expect(result.profiles['7-iron']).toBeUndefined();
    expect(result.validationByClub['7-iron']?.meetsMinimum).toBe(false);
  });

  it('flags contradictory partial inputs and lowers confidence', () => {
    const pga = DEFAULT_TRACKMAN['7-iron'];
    const result = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      trackmanProfiles: {
        '7-iron': {
          ballSpeedMs: 110 * MPH_TO_MPS,
          launchAngleDeg: pga.launchAngleDeg,
          spinRPM: pga.spinRPM,
        },
      },
      player: stockCarryPlayer,
    });

    expect(result.feasibilityByClub['7-iron']?.feasible).toBe(false);
    expect(result.profiles['7-iron']?.lowConfidence).toBe(true);
    expect(result.profiles['7-iron']?.confidence).toBeLessThanOrEqual(0.25);
  });

  it('throws a feasibility error in strict mode for contradictory partial inputs', () => {
    const pga = DEFAULT_TRACKMAN['7-iron'];

    expect(() =>
      runAnchorPipelineStrict({
        selectedClubIds: ['7-iron'],
        hasTrackmanData: false,
        trackmanProfiles: {
          '7-iron': {
            ballSpeedMs: 110 * MPH_TO_MPS,
            launchAngleDeg: pga.launchAngleDeg,
            spinRPM: pga.spinRPM,
          },
        },
        player: stockCarryPlayer,
      }),
    ).toThrow(ShotFeasibilityValidationError);
  });

  it('validates clubs marked estimated inside a mixed TrackMan bag', () => {
    const pga = DEFAULT_TRACKMAN['7-iron'];

    expect(() =>
      runAnchorPipelineStrict({
        selectedClubIds: ['Driver', '7-iron'],
        hasTrackmanData: true,
        dataSourceByClub: { Driver: 'trackman', '7-iron': 'estimated' },
        trackmanProfiles: {
          Driver: {
            ballSpeedMs: DEFAULT_TRACKMAN.Driver.ballSpeedMs,
            launchAngleDeg: DEFAULT_TRACKMAN.Driver.launchAngleDeg,
            spinRPM: DEFAULT_TRACKMAN.Driver.spinRPM,
            carryM: DEFAULT_TRACKMAN.Driver.stockCarryM,
          },
          '7-iron': {
            ballSpeedMs: 110 * MPH_TO_MPS,
            launchAngleDeg: pga.launchAngleDeg,
            spinRPM: pga.spinRPM,
          },
        },
        player: stockCarryPlayer,
      }),
    ).toThrow(ShotFeasibilityValidationError);
  });

  it('lets handicap affect inferred partial launch values when carry and ball speed are known', () => {
    const lowHcp = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      trackmanProfiles: { '7-iron': { ballSpeedMs: pgaSevenIron.ballSpeedMs } },
      player: hcp5Player,
    }).profiles['7-iron']!;

    const highHcp = runAnchorPipeline({
      selectedClubIds: ['7-iron'],
      hasTrackmanData: false,
      trackmanProfiles: { '7-iron': { ballSpeedMs: pgaSevenIron.ballSpeedMs } },
      player: hcp54Player,
    }).profiles['7-iron']!;

    expect(highHcp.source).toBe('partial');
    expect(highHcp.launchAngleDeg).toBeGreaterThan(lowHcp.launchAngleDeg);
    expect(highHcp.spinRPM).toBeLessThan(lowHcp.spinRPM);
  });
});
