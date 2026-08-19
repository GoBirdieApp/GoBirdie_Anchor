/**
 * 
 * 
 
 * Two stages, because fitting the dynamic model straight to the anchor table is
 * badly posed
 *
 *   1. Invert each anchor row on its own. Holding Cd and Cl constant through the
 *      flight makes carry and apex two equations in two unknowns.
 *      Landing angle is left out of the inversion 
 *   2. Fit the smooth Cdl(S) curves to those row coeffs. This needs no trajectories
 
 * A verification pass then runs the full dynamic model
 * OTTOM1, 19.08.2026
 */

import { simulateFlight, type SimulationOptions } from '../src/physics/trajectory.js';
import {
  AERO_REFERENCE_SPEED_MS,
  dragCoefficient,
  liftCoefficient,
  type AeroCoefficients,
} from '../src/physics/aero.js';
import { BALL_RADIUS_M, RPM_TO_RAD_PER_SEC } from '../src/physics/ball.js';
import { MPS_TO_MPH, M_TO_YD } from '../src/constants/units.js';
import { PGA_ANCHOR_PROFILE } from '../src/methods/PGA_Anchor.js';
import { LPGA_ANCHOR_PROFILE } from '../src/methods/LPGA_Anchor.js';

interface Anchor {
  label: string;
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
  carryM: number;
  apexM: number;
  landingAngleDeg: number;
}
const PGA_FIT_CLUBS = [
  'Driver',
  '3-Wood',
  '5-Wood',
  'Hybrid',
  '3-iron',
  '4-iron',
  '5-iron',
  '6-iron',
  '7-iron',
  '8-iron',
  '9-iron',
  'P-Wedge',
] as const;

const PGA_DIAGNOSTIC_CLUBS = ['S-Wedge', '60°-Wedge'] as const;

const LPGA_DIAGNOSTIC_CLUBS = [
  'Driver',
  '3-Wood',
  '5-Wood',
  'Hybrid',
  '4-iron',
  '5-iron',
  '6-iron',
  '7-iron',
  '8-iron',
  '9-iron',
  'P-Wedge',
] as const;

const fromPga = (id: (typeof PGA_FIT_CLUBS)[number] | (typeof PGA_DIAGNOSTIC_CLUBS)[number]): Anchor => {
  const a = PGA_ANCHOR_PROFILE[id];
  return {
    label: `PGA ${id}`,
    ballSpeedMs: a.ballSpeedMs,
    launchAngleDeg: a.launchAngleDeg,
    spinRPM: a.spinRPM,
    carryM: a.stockCarryM,
    apexM: a.maxHeightM,
    landingAngleDeg: a.landingAngleDeg,
  };
};

const fromLpga = (id: (typeof LPGA_DIAGNOSTIC_CLUBS)[number]): Anchor => {
  const a = LPGA_ANCHOR_PROFILE[id];
  return {
    label: `LPGA ${id}`,
    ballSpeedMs: a.ballSpeedMs,
    launchAngleDeg: a.launchAngleDeg,
    spinRPM: a.spinRPM,
    carryM: a.stockCarryM,
    apexM: a.maxHeightM,
    landingAngleDeg: a.landingAngleDeg,
  };
};

const fitAnchors = PGA_FIT_CLUBS.map(fromPga);
const diagnosticAnchors = [
  ...PGA_DIAGNOSTIC_CLUBS.map(fromPga),
  ...LPGA_DIAGNOSTIC_CLUBS.map(fromLpga),
];

const SIM: SimulationOptions = { stepS: 0.01 };

/** Constant Cd/Cl, no spin-ratio or Reynolds dependence, no spin decay. */
function flatAero(cd: number, cl: number): AeroCoefficients {
  return {
    dragBase: cd,
    dragSpin: 0,
    dragSpinExponent: 1,
    dragSpeedExponent: 0,
    liftMax: cl,
    liftHalfSpinRatio: 1e-9,
    liftExponent: 1,
    spinDecayPerSec: 0,
  };
}

interface InvertedRow {
  anchor: Anchor;
  dragCoefficient: number;
  liftCoefficient: number;
  meanSpinRatio: number;
  meanSpeedMs: number;
  landingResidualDeg: number;
}


function invertRow(anchor: Anchor): InvertedRow {
  const launch = {
    ballSpeedMs: anchor.ballSpeedMs,
    launchAngleDeg: anchor.launchAngleDeg,
    spinRPM: anchor.spinRPM,
  };

  let cd = 0.25;
  let cl = 0.2;
  let cdSpan = 0.15;
  let clSpan = 0.15;

  for (let pass = 0; pass < 40; pass += 1) {

    
    // match apex with lift

    let low = Math.max(0.02, cl - clSpan);
    let high = cl + clSpan;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      const apex = simulateFlight(launch, { ...SIM, aero: flatAero(cd, mid) }).apexM;
      if (apex < anchor.apexM) low = mid;
      else high = mid;
    }
    cl = (low + high) / 2;

    //carry with drag
    low = Math.max(0.02, cd - cdSpan);
    high = cd + cdSpan;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      const carry = simulateFlight(launch, { ...SIM, aero: flatAero(mid, cl) }).carryM;
      if (carry > anchor.carryM) low = mid;
      else high = mid;
    }
    cd = (low + high) / 2;

    cdSpan = Math.max(cdSpan * 0.5, 0.002);
    clSpan = Math.max(clSpan * 0.5, 0.002);
  }

  const flight = simulateFlight(launch, { ...SIM, aero: flatAero(cd, cl) });

  const omega = anchor.spinRPM * RPM_TO_RAD_PER_SEC;
  const meanSpeedMs = flight.flightTimeS > 0 ? (anchor.ballSpeedMs + flight.descentSpeedMs) / 2 : anchor.ballSpeedMs;
  const meanSpinRatio = (omega * BALL_RADIUS_M) / meanSpeedMs;

  return {
    anchor,
    dragCoefficient: cd,
    liftCoefficient: cl,
    meanSpinRatio,
    meanSpeedMs,
    landingResidualDeg: flight.landingAngleDeg - anchor.landingAngleDeg,
  };
}

console.log('--- stage 1: per-row inversion (constant Cd/Cl matching carry + apex)');
console.log(
  'anchor'.padEnd(16),
  'S̄'.padStart(6),
  'v̄'.padStart(6),
  'Cd'.padStart(7),
  'Cl'.padStart(7),
  'L/D'.padStart(6),
  'land Δ°'.padStart(8),
);
const inverted = fitAnchors.map(invertRow);
for (const row of inverted) {
  console.log(
    row.anchor.label.padEnd(16),
    row.meanSpinRatio.toFixed(3).padStart(6),
    row.meanSpeedMs.toFixed(1).padStart(6),
    row.dragCoefficient.toFixed(4).padStart(7),
    row.liftCoefficient.toFixed(4).padStart(7),
    (row.liftCoefficient / row.dragCoefficient).toFixed(3).padStart(6),
    row.landingResidualDeg.toFixed(1).padStart(8),
  );
}


function nelderMead(
  objective: (v: number[]) => number,
  start: number[],
  scale: number[],
  iterations: number,
): number[] {
  const n = start.length;
  let simplex = [start, ...start.map((_, i) => start.map((x, j) => (i === j ? x + scale[j]! : x)))];
  let values = simplex.map(objective);

  for (let iter = 0; iter < iterations; iter += 1) {
    const order = values.map((_, i) => i).sort((a, b) => values[a]! - values[b]!);
    simplex = order.map((i) => simplex[i]!);
    values = order.map((i) => values[i]!);

    const best = simplex[0]!;
    const worst = simplex[n]!;
    const centroid = best.map((_, j) => simplex.slice(0, n).reduce((s, p) => s + p[j]!, 0) / n);

    const reflect = centroid.map((c, j) => c + (c - worst[j]!));
    const reflectValue = objective(reflect);

    if (reflectValue < values[0]!) {
      const expand = centroid.map((c, j) => c + 2 * (c - worst[j]!));
      const expandValue = objective(expand);
      if (expandValue < reflectValue) {
        simplex[n] = expand;
        values[n] = expandValue;
      } else {
        simplex[n] = reflect;
        values[n] = reflectValue;
      }
    } else if (reflectValue < values[n - 1]!) {
      simplex[n] = reflect;
      values[n] = reflectValue;
    } else {
      const contract = centroid.map((c, j) => c + 0.5 * (worst[j]! - c));
      const contractValue = objective(contract);
      if (contractValue < values[n]!) {
        simplex[n] = contract;
        values[n] = contractValue;
      } else {
        for (let i = 1; i <= n; i += 1) {
          simplex[i] = best.map((b, j) => b + 0.5 * (simplex[i]![j]! - b));
          values[i] = objective(simplex[i]!);
        }
      }
    }
  }

  const bestIndex = values.indexOf(Math.min(...values));
  return simplex[bestIndex]!;
}

const SPIN_DECAY_PER_SEC = 0.0443;

const dragObjective = (v: number[]): number => {
  const [base, spin, spinExp, speedExp] = v as [number, number, number, number];
  if (base < 0.05 || base > 0.35 || spin < 0 || spin > 2 || spinExp < 0.2 || spinExp > 2.5) {
    return Number.POSITIVE_INFINITY;
  }
  if (speedExp < -0.2 || speedExp > 0.8) return Number.POSITIVE_INFINITY;
  const aero = { ...flatAero(0, 0), dragBase: base, dragSpin: spin, dragSpinExponent: spinExp, dragSpeedExponent: speedExp };
  return inverted.reduce(
    (sum, row) =>
      sum + (dragCoefficient(row.meanSpinRatio, aero, row.meanSpeedMs) - row.dragCoefficient) ** 2,
    0,
  );
};

/** Cl curve */
const liftObjective = (v: number[]): number => {
  const [max, half, exp] = v as [number, number, number];
  if (max < 0.1 || max > 1.2 || half < 0.01 || half > 2 || exp < 0.2 || exp > 2.5) {
    return Number.POSITIVE_INFINITY;
  }
  const aero = { ...flatAero(0, 0), liftMax: max, liftHalfSpinRatio: half, liftExponent: exp };
  return inverted.reduce(
    (sum, row) => sum + (liftCoefficient(row.meanSpinRatio, aero) - row.liftCoefficient) ** 2,
    0,
  );
};

let dragParams = [0.2, 0.3, 1.0, 0.1];
for (const shrink of [1, 0.3, 0.1, 0.03]) {
  dragParams = nelderMead(dragObjective, dragParams, [0.03, 0.1, 0.2, 0.1].map((s) => s * shrink), 1200);
}

let liftParams = [0.5, 0.3, 0.8];
for (const shrink of [1, 0.3, 0.1, 0.03]) {
  liftParams = nelderMead(liftObjective, liftParams, [0.1, 0.1, 0.2].map((s) => s * shrink), 1200);
}

const seeded: AeroCoefficients = {
  dragBase: dragParams[0]!,
  dragSpin: dragParams[1]!,
  dragSpinExponent: dragParams[2]!,
  dragSpeedExponent: dragParams[3]!,
  liftMax: liftParams[0]!,
  liftHalfSpinRatio: liftParams[1]!,
  liftExponent: liftParams[2]!,
  spinDecayPerSec: SPIN_DECAY_PER_SEC,
};

console.log('\n--- stage 2: curve fit to the inverted coefficients');
console.log(
  `drag rms ${Math.sqrt(dragObjective(dragParams) / inverted.length).toFixed(4)}, ` +
    `lift rms ${Math.sqrt(liftObjective(liftParams) / inverted.length).toFixed(4)}`,
);

/**
 * Stage 2 places coefficients at each shot's  spin ratio, but the integrator
 * evaluates them instantaneously, and spin ratio climbs steeply as the ball slows.
/*


Stage 1 shows the anchor columns cannot all be true at once, thus something has to lose,
 and weighting landing angle tightly makes the optimiser buy flight shape with
distance. (14yd short)

Carry is therefore weighted hardest: it is the number players measure, the number
the profile is generated from. Apex follows since launch monitors pin it well. Landing angle is
scored loosest.
*/
const CARRY_SIGMA_M = 1.5;
const APEX_SIGMA_M = 2.0;
const LANDING_SIGMA_DEG = 4.0;

const DYNAMIC_BOUNDS: readonly [number, number][] = [
  [0.05, 0.32], // dragBase
  [0.02, 1.40], // dragSpin
  [0.25, 2.00], // dragSpinExponent
  [0.00, 0.80], // dragSpeedExponent
  [0.15, 1.00], // liftMax
  [0.02, 1.00], // liftHalfSpinRatio
  [0.40, 2.50], // liftExponent
  
  [0.040, 0.045],
];

function toCoefficients(v: number[]): AeroCoefficients {
  return {
    dragBase: v[0]!,
    dragSpin: v[1]!,
    dragSpinExponent: v[2]!,
    dragSpeedExponent: v[3]!,
    liftMax: v[4]!,
    liftHalfSpinRatio: v[5]!,
    liftExponent: v[6]!,
    spinDecayPerSec: v[7]!,
  };
}

function toVector(c: AeroCoefficients): number[] {
  return [
    c.dragBase,
    c.dragSpin,
    c.dragSpinExponent,
    c.dragSpeedExponent,
    c.liftMax,
    c.liftHalfSpinRatio,
    c.liftExponent,
    c.spinDecayPerSec,
  ];
}

/*
cross-checked against published modern-ball wind-tunnel data.
 Without these the optimiser flattens drag against spin ratio
 */
const AERO_WINDOWS: readonly { spinRatio: number; speedMs: number; drag: [number, number]; lift: [number, number] }[] = [
  { spinRatio: 0.075, speedMs: 72, drag: [0.200, 0.250], lift: [0.140, 0.200] },
  { spinRatio: 0.290, speedMs: 50, drag: [0.295, 0.350], lift: [0.270, 0.335] },
  { spinRatio: 0.550, speedMs: 38, drag: [0.355, 0.440], lift: [0.325, 0.390] },
];

const WINDOW_WEIGHT = 10;

function windowPenalty(aero: AeroCoefficients): number {
  let penalty = 0;
  for (const w of AERO_WINDOWS) {
    const center = (band: [number, number]) => (band[0] + band[1]) / 2;
    const half = (band: [number, number]) => (band[1] - band[0]) / 2;
    penalty += ((dragCoefficient(w.spinRatio, aero, w.speedMs) - center(w.drag)) / half(w.drag)) ** 2;
    penalty += ((liftCoefficient(w.spinRatio, aero) - center(w.lift)) / half(w.lift)) ** 2;
  }
  return (WINDOW_WEIGHT * penalty) / AERO_WINDOWS.length;
}

const dynamicObjective = (v: number[]): number => {
  if (!v.every((x, i) => Number.isFinite(x) && x >= DYNAMIC_BOUNDS[i]![0] && x <= DYNAMIC_BOUNDS[i]![1])) {
    return Number.POSITIVE_INFINITY;
  }
  const aero = toCoefficients(v);
  let sse = windowPenalty(aero) * fitAnchors.length;
  for (const anchor of fitAnchors) {
    const flight = simulateFlight(anchor, { ...SIM, aero });
    if (!Number.isFinite(flight.carryM) || flight.carryM <= 0) return Number.POSITIVE_INFINITY;
    sse += ((flight.carryM - anchor.carryM) / CARRY_SIGMA_M) ** 2;
    sse += ((flight.apexM - anchor.apexM) / APEX_SIGMA_M) ** 2;
    sse += ((flight.landingAngleDeg - anchor.landingAngleDeg) / LANDING_SIGMA_DEG) ** 2;
  }
  return sse / fitAnchors.length;
};

const dynamicStarts: number[][] = [
  toVector(seeded),
  [0.12, 0.3114, 0.3671, 0.1598, 0.6968, 0.4043, 0.659, 0.0443],
  [0.20, 0.31, 1.0, 0.1, 0.41, 0.15, 1.5, 0.0443],
  [0.18, 0.45, 0.7, 0.3, 0.50, 0.25, 1.0, 0.06],
  [0.22, 0.25, 1.2, 0.2, 0.36, 0.12, 0.9, 0.03],
];

let bestVector = dynamicStarts[0]!;
let bestCost = Number.POSITIVE_INFINITY;

for (const start of dynamicStarts) {
  let candidate = start;
  for (const shrink of [1, 0.3, 0.08]) {
    const scale = [0.02, 0.12, 0.2, 0.1, 0.06, 0.06, 0.2, 0.01].map((s) => s * shrink);
    candidate = nelderMead(dynamicObjective, candidate, scale, 350);
  }
  const candidateCost = dynamicObjective(candidate);
  if (candidateCost < bestCost) {
    bestCost = candidateCost;
    bestVector = candidate;
  }
}

const fitted = toCoefficients(bestVector);

console.log(`\n--- stage 3: dynamic refinement (mean weighted cost ${bestCost.toFixed(3)})`);
console.log('\nexport const CALIBRATED_AERO: Readonly<AeroCoefficients> = {');
console.log(`  dragBase: ${fitted.dragBase.toFixed(4)},`);
console.log(`  dragSpin: ${fitted.dragSpin.toFixed(4)},`);
console.log(`  dragSpinExponent: ${fitted.dragSpinExponent.toFixed(4)},`);
console.log(`  dragSpeedExponent: ${fitted.dragSpeedExponent.toFixed(4)},`);
console.log(`  liftMax: ${fitted.liftMax.toFixed(4)},`);
console.log(`  liftHalfSpinRatio: ${fitted.liftHalfSpinRatio.toFixed(4)},`);
console.log(`  liftExponent: ${fitted.liftExponent.toFixed(4)},`);
console.log(`  spinDecayPerSec: ${fitted.spinDecayPerSec.toFixed(4)},`);
console.log('};');

console.log('\ncoefficients across the bag:');
for (const s of [0.05, 0.075, 0.1, 0.15, 0.2, 0.29, 0.4, 0.5, 0.7]) {
  console.log(
    `  S=${s.toFixed(3)}  Cd=${dragCoefficient(s, fitted, AERO_REFERENCE_SPEED_MS).toFixed(3)}  ` +
      `Cl=${liftCoefficient(s, fitted).toFixed(3)}  L/D=${(liftCoefficient(s, fitted) / dragCoefficient(s, fitted, AERO_REFERENCE_SPEED_MS)).toFixed(2)}`,
  );
}



//verif

function report(rows: Anchor[], title: string): void {
  let worstCarry = 0;
  let worstApex = 0;
  let worstLanding = 0;

  console.log(`\n--- ${title}`);
  console.log(
    'anchor'.padEnd(16),
    'speed'.padStart(6),
    'carry Δyd'.padStart(10),
    'apex Δm'.padStart(9),
    'land Δ°'.padStart(8),
  );
  for (const anchor of rows) {
    const flight = simulateFlight(anchor, { ...SIM, aero: fitted });
    const dCarry = (flight.carryM - anchor.carryM) * M_TO_YD;
    const dApex = flight.apexM - anchor.apexM;
    const dLanding = flight.landingAngleDeg - anchor.landingAngleDeg;
    worstCarry = Math.max(worstCarry, Math.abs(dCarry));
    worstApex = Math.max(worstApex, Math.abs(dApex));
    worstLanding = Math.max(worstLanding, Math.abs(dLanding));
    console.log(
      anchor.label.padEnd(16),
      (anchor.ballSpeedMs * MPS_TO_MPH).toFixed(0).padStart(6),
      dCarry.toFixed(1).padStart(10),
      dApex.toFixed(1).padStart(9),
      dLanding.toFixed(1).padStart(8),
    );
  }
  console.log(
    `worst: carry ${worstCarry.toFixed(1)} yd, apex ${worstApex.toFixed(1)} m, landing ${worstLanding.toFixed(1)} deg`,
  );
}

report(fitAnchors, 'verification: calibrated model vs measured PGA averages');
report(diagnosticAnchors, 'diagnostics: rows excluded from calibration');

console.log('\n--- physically maximum carry over launch/spin, per ball speed');
for (const mph of [104, 123, 143, 156, 171, 180, 190]) {
  const ballSpeedMs = mph / MPS_TO_MPH;
  let best = { carryM: 0, launchAngleDeg: 0, spinRPM: 0 };
  for (let launchAngleDeg = 6; launchAngleDeg <= 30; launchAngleDeg += 0.5) {
    for (let spinRPM = 1600; spinRPM <= 9000; spinRPM += 200) {
      const flight = simulateFlight({ ballSpeedMs, launchAngleDeg, spinRPM }, { ...SIM, aero: fitted });
      if (flight.carryM > best.carryM) best = { carryM: flight.carryM, launchAngleDeg, spinRPM };
    }
  }
  console.log(
    `${mph} mph -> max carry ${(best.carryM * M_TO_YD).toFixed(1)} yd ` +
      `at ${best.launchAngleDeg.toFixed(1)}° / ${best.spinRPM} rpm`,
  );
}
