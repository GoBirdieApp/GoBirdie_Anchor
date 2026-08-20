import { describe, expect, it } from 'vitest';
import { MPH_TO_MPS, MPS_TO_MPH, M_TO_YD, YD_TO_M } from '../constants/units.js';
import {
  CALIBRATED_AERO,
  dragCoefficient,
  liftCoefficient,
  spinRatio,
} from '../physics/aero.js';
import { BALL_MASS_KG, BALL_RADIUS_M, RPM_TO_RAD_PER_SEC } from '../physics/ball.js';
import {
  STANDARD_AIR_DENSITY_KG_M3,
  STANDARD_CONDITIONS,
  airDensityKgM3,
  saturationVaporPressurePa,
} from '../physics/environment.js';
import { maxCarryInBand, solveBallSpeedForCarry } from '../physics/solve.js';
import { simulateFlight } from '../physics/trajectory.js';
import { clubLaunchBand } from '../methods/launchBands.js';

describe('reference environment', () => {
  it('matches launch-monitor conditions: 20 C, sea level, 50% humidity', () => {
    expect(STANDARD_CONDITIONS.temperatureC).toBe(20);
    expect(STANDARD_CONDITIONS.relativeHumidity).toBe(0.5);
    expect(saturationVaporPressurePa(20)).toBeCloseTo(2339, -1);
    expect(STANDARD_AIR_DENSITY_KG_M3).toBeCloseTo(1.1988, 3);
  });

  it('is denser when colder and thinner when humid, as air is', () => {
    const cold = airDensityKgM3({ ...STANDARD_CONDITIONS, temperatureC: 5 });
    const humid = airDensityKgM3({ ...STANDARD_CONDITIONS, relativeHumidity: 1 });

    expect(cold).toBeGreaterThan(STANDARD_AIR_DENSITY_KG_M3);
    expect(humid).toBeLessThan(STANDARD_AIR_DENSITY_KG_M3);
  });

  it('uses a conforming ball', () => {
    expect(BALL_MASS_KG).toBeLessThanOrEqual(0.04593);
    expect(BALL_RADIUS_M * 2).toBeGreaterThanOrEqual(0.04267 - 1e-9);
  });
});

describe('aerodynamic coefficients', () => {
  const windows = [
    { label: 'driver', spinRatio: 0.075, speedMs: 72, drag: [0.20, 0.26], lift: [0.13, 0.20] },
    { label: 'mid-iron', spinRatio: 0.29, speedMs: 50, drag: [0.28, 0.36], lift: [0.26, 0.34] },
    { label: 'wedge', spinRatio: 0.55, speedMs: 38, drag: [0.34, 0.46], lift: [0.32, 0.40] },
  ] as const;

  for (const w of windows) {
    it(`sits in measured Cd/Cl ranges at ${w.label} spin ratio`, () => {
      const cd = dragCoefficient(w.spinRatio, CALIBRATED_AERO, w.speedMs);
      const cl = liftCoefficient(w.spinRatio, CALIBRATED_AERO);

      expect(cd).toBeGreaterThanOrEqual(w.drag[0]);
      expect(cd).toBeLessThanOrEqual(w.drag[1]);
      expect(cl).toBeGreaterThanOrEqual(w.lift[0]);
      expect(cl).toBeLessThanOrEqual(w.lift[1]);
    });
  }

  it('increases both drag and lift with spin ratio', () => {
    const ratios = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7];
    for (let i = 1; i < ratios.length; i += 1) {
      expect(dragCoefficient(ratios[i]!, CALIBRATED_AERO, 50)).toBeGreaterThan(
        dragCoefficient(ratios[i - 1]!, CALIBRATED_AERO, 50),
      );
      expect(liftCoefficient(ratios[i]!, CALIBRATED_AERO)).toBeGreaterThan(
        liftCoefficient(ratios[i - 1]!, CALIBRATED_AERO),
      );
    }
  });

  it('derives spin ratio as omega r over v', () => {
    const spinRadPerSec = 2545 * RPM_TO_RAD_PER_SEC;
    const speedMs = 171 * MPH_TO_MPS;

    expect(spinRatio(speedMs, spinRadPerSec)).toBeCloseTo(
      (spinRadPerSec * BALL_RADIUS_M) / speedMs,
      9,
    );
    expect(spinRatio(speedMs, spinRadPerSec)).toBeCloseTo(0.0744, 3);
  });
});

describe('trajectory integration', () => {
  const driver = { ballSpeedMs: 171 * MPH_TO_MPS, launchAngleDeg: 10.4, spinRPM: 2545 };

  it('is converged in the integration step', () => {
    const coarse = simulateFlight(driver, { stepS: 0.02 });
    const fine = simulateFlight(driver, { stepS: 0.001 });

    expect(fine.carryM).toBeCloseTo(coarse.carryM, 2);
    expect(fine.apexM).toBeCloseTo(coarse.apexM, 2);
    expect(fine.landingAngleDeg).toBeCloseTo(coarse.landingAngleDeg, 2);
  });

  it('carries further in thinner air', () => {
    const seaLevel = simulateFlight(driver);
    const altitude = simulateFlight(driver, { airDensityKgM3: 1.0 });

    expect(altitude.carryM).toBeGreaterThan(seaLevel.carryM);
  });

  it('produces no flight without upward launch', () => {
    expect(simulateFlight({ ...driver, launchAngleDeg: 0 }).carryM).toBe(0);
    expect(simulateFlight({ ...driver, ballSpeedMs: 0 }).carryM).toBe(0);
  });

  it('increases carry monotonically with ball speed', () => {
    let previous = 0;
    for (const mph of [80, 100, 120, 140, 160, 180, 200]) {
      const carry = simulateFlight({ ...driver, ballSpeedMs: mph * MPH_TO_MPS }).carryM;
      expect(carry).toBeGreaterThan(previous);
      previous = carry;
    }
  });

  it('lands steeper than it launched, and climbs less than it carries', () => {
    const flight = simulateFlight(driver);

    expect(flight.landingAngleDeg).toBeGreaterThan(driver.launchAngleDeg);
    expect(flight.apexM).toBeLessThan(flight.carryM / 2);
    expect(flight.descentSpeedMs).toBeLessThan(driver.ballSpeedMs);
  });
});

describe('carry inversion', () => {
  it('solves the ball speed that flies a target carry', () => {
    for (const yd of [120, 180, 240, 300]) {
      const targetM = yd * YD_TO_M;
      const ballSpeedMs = solveBallSpeedForCarry(targetM, 12, 2600);

      expect(simulateFlight({ ballSpeedMs, launchAngleDeg: 12, spinRPM: 2600 }).carryM).toBeCloseTo(
        targetM,
        1,
      );
    }
  });

  it('reports a carry ceiling no launch condition beats', () => {
    const band = clubLaunchBand('Driver');
    const ballSpeedMs = 171 * MPH_TO_MPS;
    const ceiling = maxCarryInBand(ballSpeedMs, band);

    for (let launchAngleDeg = band.launchMinDeg; launchAngleDeg <= band.launchMaxDeg; launchAngleDeg += 1) {
      for (let spinRPM = band.spinMinRpm; spinRPM <= band.spinMaxRpm; spinRPM += 250) {
        const carry = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM }).carryM;
        expect(carry).toBeLessThanOrEqual(ceiling.flight.carryM + 0.5);
      }
    }
  });

  it('places the tour driver carry ceiling in a credible range', () => {
    const ceiling = maxCarryInBand(171 * MPH_TO_MPS, clubLaunchBand('Driver'));
    const ceilingYd = ceiling.flight.carryM * M_TO_YD;

    expect(ceilingYd).toBeGreaterThan(270);
    expect(ceilingYd).toBeLessThan(300);
    expect(ceiling.launchAngleDeg).toBeGreaterThan(9);
    expect(ceiling.launchAngleDeg).toBeLessThan(17);
  });

  it('saturates rather than diverging on an unreachable carry', () => {
    const speed = solveBallSpeedForCarry(600 * YD_TO_M, 12, 2600);

    expect(speed * MPS_TO_MPH).toBeLessThan(300);
    expect(Number.isFinite(speed)).toBe(true);
  });
});
