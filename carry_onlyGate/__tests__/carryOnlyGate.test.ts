import { describe, expect, it } from 'vitest';
import { MPS_TO_MPH, M_TO_YD, YD_TO_M } from '../../src/constants/units.js';
import { validateShotFeasibility } from '../../src/estimation/validateShotFeasibility.js';
import { APEX_CALIBRATION, deriveCarryOnlyLaunch, handicapFlightAdjustments, handicapLaunchSpinAdjustments } from '../anchorBlend.js';
import { clubLaunchBand } from '../../src/methods/launchBands.js';
import { PGA_ANCHOR_PROFILE } from '../../src/methods/PGA_Anchor.js';
import { solveBallSpeedForCarry } from '../../src/physics/solve.js';
import { simulateFlight } from '../../src/physics/trajectory.js';
import { TRACKMAN_CLUB_IDS, type TrackmanClubId } from '../../src/types/clubs.js';

const HANDICAPS = [0, 5, 12, 20, 36, 54];

describe('carry-only gate', () => {
  it('flies exactly the requested carry for every club and handicap', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      for (const handicap of HANDICAPS) {
        const requestedM = 0.8 * PGA_ANCHOR_PROFILE[clubId].stockCarryM;
        const solved = deriveCarryOnlyLaunch(clubId, requestedM, handicap);

        if (solved.carrySaturated) continue;
        expect(solved.carryM, `${clubId} hcp ${handicap}`).toBeCloseTo(requestedM, 1);
        const tourCalibratedDriver = clubId === 'Driver';
        if (!tourCalibratedDriver) {
          expect(simulateFlight(solved).carryM, `${clubId} hcp ${handicap}`).toBeCloseTo(
            requestedM,
            1,
          );
        }
      }
    }
  });

  it('reports calibrated apex and landing from the underlying flight at scratch', () => {
    const solved = deriveCarryOnlyLaunch('7-iron', 0.8 * PGA_ANCHOR_PROFILE['7-iron'].stockCarryM, 0);
    const flight = simulateFlight(solved);

    expect(solved.maxHeightM).toBeCloseTo(flight.apexM * APEX_CALIBRATION, 6);
    expect(solved.landingAngleDeg).toBeCloseTo(flight.landingAngleDeg, 6);
  });

  it('keeps solved launch and spin inside the club band', () => {
    for (const clubId of TRACKMAN_CLUB_IDS) {
      const band = clubLaunchBand(clubId);
      for (const carryFraction of [0.5, 0.75, 1, 1.15]) {
        const solved = deriveCarryOnlyLaunch(
          clubId,
          carryFraction * PGA_ANCHOR_PROFILE[clubId].stockCarryM,
          12,
        );

        expect(solved.launchAngleDeg, `${clubId} launch`).toBeGreaterThanOrEqual(
          band.launchMinDeg - 1e-6,
        );
        expect(solved.launchAngleDeg, `${clubId} launch`).toBeLessThanOrEqual(
          band.launchMaxDeg + 1e-6,
        );
        expect(solved.spinRPM, `${clubId} spin`).toBeGreaterThanOrEqual(band.spinMinRpm - 1e-6);
        expect(solved.spinRPM, `${clubId} spin`).toBeLessThanOrEqual(band.spinMaxRpm + 1e-6);
      }
    }
  });

  it('steps spin and launch by handicap band', () => {
    expect(handicapLaunchSpinAdjustments(0)).toEqual({ spinDeltaRpm: 0, launchDeltaDeg: 0 });
    expect(handicapLaunchSpinAdjustments(2)).toEqual({ spinDeltaRpm: 0, launchDeltaDeg: 0 });
    expect(handicapLaunchSpinAdjustments(3)).toEqual({ spinDeltaRpm: -150, launchDeltaDeg: 0.5 });
    expect(handicapLaunchSpinAdjustments(12)).toEqual({ spinDeltaRpm: -600, launchDeltaDeg: 2 });
    expect(handicapLaunchSpinAdjustments(54)).toEqual({ spinDeltaRpm: -2700, launchDeltaDeg: 9 });
  });

  it('drops apex and landing per 3 hcp above scratch', () => {
    expect(handicapFlightAdjustments(0)).toEqual({
      spinDeltaRpm: 0,
      launchDeltaDeg: 0,
      apexDeltaM: 0,
      landingDeltaDeg: 0,
    });
    expect(handicapFlightAdjustments(12)).toEqual({
      spinDeltaRpm: -600,
      launchDeltaDeg: 2,
      apexDeltaM: -0.8,
      landingDeltaDeg: -1.2,
    });

    const scratch = deriveCarryOnlyLaunch('7-iron', 176 * YD_TO_M, 0);
    const hcp12 = deriveCarryOnlyLaunch('7-iron', 176 * YD_TO_M, 12);

    expect(scratch.maxHeightM - hcp12.maxHeightM).toBeCloseTo(0.8, 1);
    expect(scratch.landingAngleDeg - hcp12.landingAngleDeg).toBeCloseTo(1.2, 1);
  });

  it('lifts launch and drops spin with handicap while holding carry', () => {
    const scratch = deriveCarryOnlyLaunch('7-iron', 176 * YD_TO_M, 0);
    const hcp12 = deriveCarryOnlyLaunch('7-iron', 176 * YD_TO_M, 12);

    expect(hcp12.launchAngleDeg).toBeGreaterThan(scratch.launchAngleDeg);
    expect(hcp12.spinRPM).toBeLessThan(scratch.spinRPM);
    expect(hcp12.carryM).toBeCloseTo(scratch.carryM, 1);
  });

  it('raises ball speed and apex monotonically with driver carry', () => {
    let previousSpeed = 0;
    let previousApex = 0;

    for (const yd of [180, 200, 220, 240, 260, 280, 300, 320]) {
      const solved = deriveCarryOnlyLaunch('Driver', yd * YD_TO_M, 8);

      expect(solved.ballSpeedMs, `${yd} yd speed`).toBeGreaterThan(previousSpeed);
      expect(solved.maxHeightM, `${yd} yd apex`).toBeGreaterThan(previousApex);
      previousSpeed = solved.ballSpeedMs;
      previousApex = solved.maxHeightM;
    }
  });

  it('steepens landing when launch and spin are high for the carry', () => {
    const carryM = 300 * YD_TO_M;
    const penetrating = simulateFlight({
      ballSpeedMs: solveBallSpeedForCarry(carryM, 10, 2300),
      launchAngleDeg: 10,
      spinRPM: 2300,
    });
    const balloon = simulateFlight({
      ballSpeedMs: solveBallSpeedForCarry(carryM, 13, 3200),
      launchAngleDeg: 13,
      spinRPM: 3200,
    });

    expect(balloon.landingAngleDeg).toBeGreaterThan(penetrating.landingAngleDeg);
    expect(balloon.apexM).toBeGreaterThan(penetrating.apexM);
  });

  it('uses the driver speed floor implied by long-carry anchors', () => {
    const d250 = deriveCarryOnlyLaunch('Driver', 250 * YD_TO_M, 0);
    const d275 = deriveCarryOnlyLaunch('Driver', 275 * YD_TO_M, 0);

    expect(d250.ballSpeedMs * MPS_TO_MPH).toBeCloseTo(250 / (275 / 167), 0);
    expect(d275.ballSpeedMs * MPS_TO_MPH).toBeCloseTo(167, 0);
    expect(d275.maxHeightM / 0.3048).toBeCloseTo(98, 0);
  });

  it('emits tour-realistic numbers for a 308 yd driver carry', () => {
    const solved = deriveCarryOnlyLaunch('Driver', 308 * YD_TO_M, 0);

    expect(solved.carryM * M_TO_YD).toBeCloseTo(308, 1);
    expect(solved.ballSpeedMs * MPS_TO_MPH).toBeGreaterThan(179);
    expect(solved.ballSpeedMs * MPS_TO_MPH).toBeLessThan(183);
    expect(solved.launchAngleDeg).toBeGreaterThan(9.5);
    expect(solved.launchAngleDeg).toBeLessThan(10.5);
    expect(solved.maxHeightM / 0.3048).toBeGreaterThan(110);
    expect(solved.maxHeightM / 0.3048).toBeLessThan(120);
  });

  it('matches the 323 yd long-carry reference', () => {
    const y290 = deriveCarryOnlyLaunch('Driver', 290 * YD_TO_M, 0);
    const solved = deriveCarryOnlyLaunch('Driver', 323 * YD_TO_M, 0);

    expect(solved.ballSpeedMs * MPS_TO_MPH).toBeCloseTo(188, 0);
    expect(solved.launchAngleDeg).toBeCloseTo(9.8, 1);
    expect(solved.spinRPM).toBeCloseTo(2223, 0);
    expect(solved.maxHeightM).toBeGreaterThan(y290.maxHeightM);
    expect(solved.maxHeightM / 0.3048).toBeGreaterThan(112);
    expect(solved.maxHeightM / 0.3048).toBeLessThan(120);
  });

  it('raises mid-iron spin with carry and ball speed past PGA stock', () => {
    const short = deriveCarryOnlyLaunch('7-iron', 180 * YD_TO_M, 5);
    const long = deriveCarryOnlyLaunch('7-iron', 200 * YD_TO_M, 5);

    expect(long.spinRPM).toBeGreaterThan(short.spinRPM);
    expect(long.ballSpeedMs).toBeGreaterThan(short.ballSpeedMs);
    expect(long.maxHeightM).toBeGreaterThan(short.maxHeightM);
  });

  it('grows mid-iron apex gradually past tour stock (~0.2 m per yard)', () => {
    const stock = deriveCarryOnlyLaunch('7-iron', 176 * YD_TO_M, 5);
    const plusTen = deriveCarryOnlyLaunch('7-iron', 186 * YD_TO_M, 5);

    expect(plusTen.spinRPM - stock.spinRPM).toBeGreaterThan(70);
    expect(plusTen.spinRPM - stock.spinRPM).toBeLessThan(350);
    expect(plusTen.maxHeightM - stock.maxHeightM).toBeGreaterThan(1.5);
    expect(plusTen.maxHeightM - stock.maxHeightM).toBeLessThan(2.5);
  });

  it('keeps mid-iron apex under 37 m until carry is well past tour stock', () => {
    for (const clubId of ['4-iron', '5-iron', '6-iron', '7-iron', '8-iron', '9-iron'] as const) {
      const pgaYd = PGA_ANCHOR_PROFILE[clubId].stockCarryM * M_TO_YD;
      const longYd = Math.round(pgaYd + 24);
      const solved = deriveCarryOnlyLaunch(clubId, longYd * YD_TO_M, 5);

      expect(solved.maxHeightM, `${clubId} ${longYd} yd apex`).toBeLessThanOrEqual(37);
      expect(solved.spinRPM, `${clubId} spin`).toBeGreaterThan(
        deriveCarryOnlyLaunch(clubId, (longYd - 10) * YD_TO_M, 5).spinRPM,
      );
    }
  });

  it('allows mid-iron apex above 34 m only when carry and spin are extreme', () => {
    const long = deriveCarryOnlyLaunch('7-iron', 200 * YD_TO_M, 5);

    expect(long.maxHeightM).toBeGreaterThan(30);
    expect(long.maxHeightM).toBeLessThan(37);
  });

  it('drops spin and lifts launch slightly on short mid-iron carries', () => {
    const stock = deriveCarryOnlyLaunch('8-iron', 164 * YD_TO_M, 0);
    const short = deriveCarryOnlyLaunch('8-iron', 145 * YD_TO_M, 0);

    expect(short.spinRPM).toBeLessThan(stock.spinRPM);
    expect(short.launchAngleDeg).toBeGreaterThan(stock.launchAngleDeg);
    expect(short.maxHeightM).toBeGreaterThan(20);
  });

  it('rejects a 308 yd carry claimed off tour-average driver launch conditions', () => {
    const result = validateShotFeasibility(
      {
        ballSpeedMs: 171 / MPS_TO_MPH,
        launchAngleDeg: 10,
        spinRPM: 2300,
        maxHeightM: 36,
        carryM: 308 * YD_TO_M,
      },
      { clubId: 'Driver' },
    );

    expect(result.feasible).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['carry_exceeds_max', 'carry_exceeds_expected']),
    );

    expect(result.issues.some((issue) => issue.code.startsWith('apex'))).toBe(true);
    expect(result.reference?.apexExpectedM).toBeLessThan(34);
  });

  it('flags apex and landing angle that contradict the flight', () => {
    const tourDriver = { ballSpeedMs: 171 / MPS_TO_MPH, launchAngleDeg: 10.4, spinRPM: 2545 };

    const ballooned = validateShotFeasibility(
      { ...tourDriver, maxHeightM: 50, carryM: 282 * YD_TO_M },
      { clubId: 'Driver' },
    );
    expect(ballooned.feasible).toBe(false);
    expect(ballooned.issues.some((issue) => issue.code === 'apex_exceeds_expected')).toBe(true);

    const tooShallow = validateShotFeasibility(
      { ...tourDriver, landingAngleDeg: 25, carryM: 282 * YD_TO_M },
      { clubId: 'Driver' },
    );
    expect(tooShallow.feasible).toBe(false);
    expect(tooShallow.issues.some((issue) => issue.code === 'landing_unusual')).toBe(true);
  });

  it('warns without rejecting when a flight is merely off, not impossible', () => {
    const result = validateShotFeasibility(
      {
        ballSpeedMs: 186.8 / MPS_TO_MPH,
        launchAngleDeg: 10.5,
        spinRPM: 2625,
        maxHeightM: 36,
        landingAngleDeg: 39.2,
        carryM: 308 * YD_TO_M,
      },
      { clubId: 'Driver' },
    );

    expect(result.feasible).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === 'warn').length).toBeGreaterThan(0);
  });

  it('flags a carry no ball speed can reach', () => {
    const result = validateShotFeasibility(
      { ballSpeedMs: 150 / MPS_TO_MPH, carryM: 320 * YD_TO_M },
      { clubId: 'Driver' },
    );

    expect(result.feasible).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'carry_exceeds_max')).toBe(true);
  });

  it('gaps the bag in carry, ball speed and spin', () => {
    const bag = TRACKMAN_CLUB_IDS.map((clubId: TrackmanClubId) => ({
      clubId,
      ...deriveCarryOnlyLaunch(clubId, 0.85 * PGA_ANCHOR_PROFILE[clubId].stockCarryM, 12),
    }));

    for (const club of bag) {
      expect(club.ballSpeedMs, `${club.clubId} speed`).toBeGreaterThan(0);
      expect(club.spinRPM, `${club.clubId} spin`).toBeGreaterThan(0);
      expect(club.maxHeightM, `${club.clubId} apex`).toBeGreaterThan(0);
      expect(club.landingAngleDeg, `${club.clubId} landing`).toBeGreaterThan(club.launchAngleDeg);
    }
  });

  it('saturates instead of lying when a carry is past what a club can fly', () => {
    const absurd = deriveCarryOnlyLaunch('Driver', 500 * YD_TO_M, 5);

    expect(absurd.carrySaturated).toBe(true);
    expect(absurd.carryM).toBeLessThan(500 * YD_TO_M);
    expect(absurd.carryM * M_TO_YD).toBeGreaterThan(400);

    const flight = simulateFlight(absurd);
    expect(flight.carryM).toBeCloseTo(absurd.carryM, 6);
    const scratch = deriveCarryOnlyLaunch('Driver', absurd.carryM, 0);
    expect(absurd.maxHeightM).toBeCloseTo(
      scratch.maxHeightM + handicapFlightAdjustments(5).apexDeltaM,
      5,
    );
  });

  it('handles a carry far below the club it is asked for', () => {
    const chip = deriveCarryOnlyLaunch('60°-Wedge', 40 * YD_TO_M, 20);

    expect(chip.carrySaturated).toBe(false);
    expect(chip.carryM * M_TO_YD).toBeCloseTo(40, 1);
    expect(chip.ballSpeedMs).toBeGreaterThan(0);
    expect(chip.maxHeightM).toBeGreaterThan(0);
    expect(chip.landingAngleDeg).toBeGreaterThan(chip.launchAngleDeg);
  });

  it('stays inside a millisecond budget the pipeline can afford', () => {
    const started = performance.now();
    for (const clubId of TRACKMAN_CLUB_IDS) {
      deriveCarryOnlyLaunch(clubId, 180 * YD_TO_M, 12);
    }
    expect(performance.now() - started).toBeLessThan(500);
  });
});
