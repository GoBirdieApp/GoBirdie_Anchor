/**
Carry-speed is bisection; max carry is coord descent
 * OTTOM1, 19.08.2026
 */

import { clamp } from '../utils/math.js';
import { simulateFlight, type FlightResult, type LaunchConditions } from './trajectory.js';

export interface LaunchBand {
  launchMinDeg: number;
  launchMaxDeg: number;
  spinMinRpm: number;
  spinMaxRpm: number;
}

export interface SolvedFlight extends LaunchConditions {
  flight: FlightResult;
}

export const SPEED_SEARCH_MIN_MS = 5;
export const SPEED_SEARCH_MAX_MS = 120;
const CARRY_TOLERANCE_M = 0.01;
const MAX_ITERATIONS = 30;

export function carryFor(launch: LaunchConditions): number {
  return simulateFlight(launch).carryM;
}





export function solveBallSpeedForCarry(
  targetCarryM: number,
  launchAngleDeg: number,
  spinRPM: number,
): number {
  if (!(targetCarryM > 0)) return 0;

  const residual = (speed: number): number =>
    carryFor({ ballSpeedMs: speed, launchAngleDeg, spinRPM }) - targetCarryM;

  let low = SPEED_SEARCH_MIN_MS;
  let high = SPEED_SEARCH_MAX_MS;
  let lowResidual = residual(low);
  let highResidual = residual(high);

  if (highResidual < 0) return high;
  if (lowResidual > 0) return low;

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const next = low - lowResidual * ((high - low) / (highResidual - lowResidual));
    const guess = clamp(next, low + 1e-6, high - 1e-6);
    const guessResidual = residual(guess);

    if (Math.abs(guessResidual) < CARRY_TOLERANCE_M) return guess;

    if (guessResidual < 0) {
      low = guess;
      lowResidual = guessResidual;
      highResidual /= 2;
    } else {
      high = guess;
      highResidual = guessResidual;
      lowResidual /= 2;
    }
    if (high - low < 1e-4) break;
  }

  return (low + high) / 2;
}





/**
 * the "impossible carry" ceiling
 * OTTOM1, 19.08.2026
 */
export function maxCarryInBand(
  ballSpeedMs: number,
  band: LaunchBand,
): SolvedFlight {
  let launchAngleDeg = (band.launchMinDeg + band.launchMaxDeg) / 2;
  let spinRPM = (band.spinMinRpm + band.spinMaxRpm) / 2;

  let launchStep = (band.launchMaxDeg - band.launchMinDeg) / 4;
  let spinStep = (band.spinMaxRpm - band.spinMinRpm) / 4;
  let best = carryFor({ ballSpeedMs, launchAngleDeg, spinRPM });

  for (let pass = 0; pass < 24; pass += 1) {
    let improved = false;

    for (const delta of [launchStep, -launchStep]) {
      const candidate = clamp(launchAngleDeg + delta, band.launchMinDeg, band.launchMaxDeg);
      const carry = carryFor({ ballSpeedMs, launchAngleDeg: candidate, spinRPM });
      if (carry > best) {
        best = carry;
        launchAngleDeg = candidate;
        improved = true;
      }
    }

    for (const delta of [spinStep, -spinStep]) {
      const candidate = clamp(spinRPM + delta, band.spinMinRpm, band.spinMaxRpm);
      const carry = carryFor({ ballSpeedMs, launchAngleDeg, spinRPM: candidate });
      if (carry > best) {
        best = carry;
        spinRPM = candidate;
        improved = true;
      }
    }

    if (!improved) {
      launchStep /= 2;
      spinStep /= 2;
      if (launchStep < 0.05 && spinStep < 10) break;
    }
  }

  const launch = { ballSpeedMs, launchAngleDeg, spinRPM };
  return { ...launch, flight: simulateFlight(launch) };
}




export function minBallSpeedForCarry(targetCarryM: number, band: LaunchBand): number {
  let low = SPEED_SEARCH_MIN_MS;
  let high = SPEED_SEARCH_MAX_MS;

  if (maxCarryInBand(high, band).flight.carryM < targetCarryM) return high;

  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (maxCarryInBand(mid, band).flight.carryM < targetCarryM) {
      low = mid;
    } else {
      high = mid;
    }
    if (high - low < 0.02) break;
  }

  return high;
}
