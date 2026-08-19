/**
 * Partial-data:
  3 core numbers (speed/launch/spin) define the shot;
 carry/apex/landing are what that triple flies.
 
 OTTOM1, 10.08.2026
 */

import { nelderMead, type Bound } from '../src/physics/nelderMead.js';
import {
  SPEED_SEARCH_MAX_MS,
  SPEED_SEARCH_MIN_MS,
  solveBallSpeedForCarry,
  type LaunchBand,
} from '../src/physics/solve.js';
import { simulateFlight, type FlightResult, type LaunchConditions } from '../src/physics/trajectory.js';

export type CoreField = 'ballSpeedMs' | 'launchAngleDeg' | 'spinRPM';
export type DerivedField = 'carryM' | 'maxHeightM' | 'landingAngleDeg';

export type PartialObservation = Partial<Record<CoreField | DerivedField, number>>;

export interface ReconcileInput {
  observed: PartialObservation;
  prior: LaunchConditions;

  band: LaunchBand;
}

export interface ReconciledLaunch extends LaunchConditions {
  flight: FlightResult;
  solvedFields: CoreField[];
  residuals: Partial<Record<DerivedField, number>>;
  evaluations: number;
}

/*
 how much each field mismatch costs in the objective.
 * OTTOM1, 10.08.2026
 */
const RESIDUAL_SCALE: Readonly<Record<DerivedField, number>> = {
  carryM: 1,
  maxHeightM: 4,
  landingAngleDeg: 4,
};






const PRIOR_SCALE: Readonly<Record<CoreField, number>> = {
  ballSpeedMs: 6,
  launchAngleDeg: 4,
  spinRPM: 900,
};
const PRIOR_WEIGHT = 0.05;

const CORE_FIELDS: readonly CoreField[] = ['ballSpeedMs', 'launchAngleDeg', 'spinRPM'];
const DERIVED_FIELDS: readonly DerivedField[] = ['carryM', 'maxHeightM', 'landingAngleDeg'];

const MAX_EVALUATIONS = 220;

function isKnown(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function flownValue(flight: FlightResult, field: DerivedField): number {
  if (field === 'carryM') return flight.carryM;
  if (field === 'maxHeightM') return flight.apexM;
  return flight.landingAngleDeg;
}

function boundFor(field: CoreField, band: LaunchBand): Bound {
  if (field === 'ballSpeedMs') return { min: SPEED_SEARCH_MIN_MS, max: SPEED_SEARCH_MAX_MS };
  if (field === 'launchAngleDeg') return { min: band.launchMinDeg, max: band.launchMaxDeg };
  return { min: band.spinMinRpm, max: band.spinMaxRpm };
}

function finish(
  launch: LaunchConditions,
  observed: PartialObservation,
  solvedFields: CoreField[],
  evaluations: number,
): ReconciledLaunch {
  const flight = simulateFlight(launch);
  const residuals: Partial<Record<DerivedField, number>> = {};
  for (const field of DERIVED_FIELDS) {
    const value = observed[field];
    if (isKnown(value)) residuals[field] = value - flownValue(flight, field);
  }
  return { ...launch, flight, solvedFields, residuals, evaluations };
}

export function reconcileLaunch(input: ReconcileInput): ReconciledLaunch {
  const { observed, prior, band } = input;

  const free = CORE_FIELDS.filter((field) => !isKnown(observed[field]));
  const fixed = (field: CoreField): number =>
    isKnown(observed[field]) ? observed[field]! : prior[field];

  if (free.length === 0) {
    return finish(
      {
        ballSpeedMs: observed.ballSpeedMs!,
        launchAngleDeg: observed.launchAngleDeg!,
        spinRPM: observed.spinRPM!,
      },
      observed,
      [],
      0,
    );
  }

  const targets = DERIVED_FIELDS.filter((field) => isKnown(observed[field]));

  if (targets.length === 0) {
    const launch: LaunchConditions = {
      ballSpeedMs: fixed('ballSpeedMs'),
      launchAngleDeg: fixed('launchAngleDeg'),
      spinRPM: fixed('spinRPM'),
    };
    return finish(launch, observed, free, 0);
  }

  /*
   * Common case: carry known, speed free

   * OTTOM1, 17.08.2026
   */
  if (free.length === 1 && free[0] === 'ballSpeedMs' && isKnown(observed.carryM)) {
    const launchAngleDeg = observed.launchAngleDeg!;
    const spinRPM = observed.spinRPM!;
    const ballSpeedMs = solveBallSpeedForCarry(observed.carryM, launchAngleDeg, spinRPM);
    return finish({ ballSpeedMs, launchAngleDeg, spinRPM }, observed, free, 0);
  }

  const bounds = free.map((field) => boundFor(field, band));
  const start = free.map((field) => prior[field]);
  const steps = free.map((field) => PRIOR_SCALE[field] * 0.75);

  const launchFrom = (point: readonly number[]): LaunchConditions => {
    const launch: LaunchConditions = {
      ballSpeedMs: fixed('ballSpeedMs'),
      launchAngleDeg: fixed('launchAngleDeg'),
      spinRPM: fixed('spinRPM'),
    };
    free.forEach((field, i) => {
      launch[field] = point[i]!;
    });
    return launch;
  };

  const objective = (point: readonly number[]): number => {
    const launch = launchFrom(point);
    const flight = simulateFlight(launch);

    let cost = 0;
    for (const field of targets) {
      const gap = (observed[field]! - flownValue(flight, field)) / RESIDUAL_SCALE[field];
      cost += gap * gap;
    }
    free.forEach((field, i) => {
      const drift = (point[i]! - prior[field]) / PRIOR_SCALE[field];
      cost += PRIOR_WEIGHT * drift * drift;
    });
    return cost;
  };

  const solved = nelderMead(objective, start, steps, bounds, {
    maxEvaluations: MAX_EVALUATIONS,
  });

  /*
   * Re-solve speed for exact carry after simplex; 
  it trades carry vs apex otherwise.
   
  OTTOM1, 19.08.2026
   */
  const launch = launchFrom(solved.point);
  if (free.includes('ballSpeedMs') && isKnown(observed.carryM) && targets.length > 1) {
    launch.ballSpeedMs = solveBallSpeedForCarry(
      observed.carryM,
      launch.launchAngleDeg,
      launch.spinRPM,
    );
  }

  return finish(launch, observed, free, solved.evaluations);
}
