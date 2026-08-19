/**
 * simple point-mass RK4 flight sim. 
 * OTTOM1, 14.08.2026
 */

import {
  BALL_CROSS_SECTION_M2,
  BALL_MASS_KG,
  RPM_TO_RAD_PER_SEC,
} from './ball.js';
import {
  CALIBRATED_AERO,
  dragCoefficient,
  liftCoefficient,
  spinRatio,
  type AeroCoefficients,
} from './aero.js';
import { GRAVITY_MS2, STANDARD_AIR_DENSITY_KG_M3 } from './environment.js';

export interface LaunchConditions {
  ballSpeedMs: number;
  launchAngleDeg: number;
  spinRPM: number;
}

export interface FlightResult {
  carryM: number;
  apexM: number;
  landingAngleDeg: number;
  flightTimeS: number;
  descentSpeedMs: number;
}

export interface SimulationOptions {
  aero?: AeroCoefficients;
  airDensityKgM3?: number;

// same 10ms step as in the (b1.0-c.24.0)
  stepS?: number;
  maxFlightTimeS?: number;
}

const DEFAULT_STEP_S = 0.01;
const DEFAULT_MAX_FLIGHT_S = 15;
const DEG = Math.PI / 180;

type State = { x: number; y: number; vx: number; vy: number };

function acceleration(
  state: State,
  spinRadPerSec: number,
  aero: AeroCoefficients,
  airDensity: number,
): { ax: number; ay: number } {
  const speed = Math.hypot(state.vx, state.vy);
  if (speed <= 1e-9) return { ax: 0, ay: -GRAVITY_MS2 };

  const s = spinRatio(speed, spinRadPerSec);
  const qArea = 0.5 * airDensity * BALL_CROSS_SECTION_M2;
  const dragMag = (qArea * dragCoefficient(s, aero, speed) * speed * speed) / BALL_MASS_KG;
  const liftMag = (qArea * liftCoefficient(s, aero) * speed * speed) / BALL_MASS_KG;

  const ux = state.vx / speed;
  const uy = state.vy / speed;



  return {
    ax: -dragMag * ux - liftMag * uy,
    ay: -dragMag * uy + liftMag * ux - GRAVITY_MS2,
  };
}

function step(
  state: State,
  timeS: number,
  dt: number,
  spinAt: (t: number) => number,
  aero: AeroCoefficients,
  airDensity: number,
): State {
  const derive = (s: State, t: number) => {
    const a = acceleration(s, spinAt(t), aero, airDensity);
    return { x: s.vx, y: s.vy, vx: a.ax, vy: a.ay };
  };
  const advance = (s: State, d: ReturnType<typeof derive>, h: number): State => ({
    x: s.x + d.x * h,
    y: s.y + d.y * h,
    vx: s.vx + d.vx * h,
    vy: s.vy + d.vy * h,
  });

  const k1 = derive(state, timeS);
  const k2 = derive(advance(state, k1, dt / 2), timeS + dt / 2);
  const k3 = derive(advance(state, k2, dt / 2), timeS + dt / 2);
  const k4 = derive(advance(state, k3, dt), timeS + dt);

  return {
    x: state.x + ((k1.x + 2 * k2.x + 2 * k3.x + k4.x) * dt) / 6,
    y: state.y + ((k1.y + 2 * k2.y + 2 * k3.y + k4.y) * dt) / 6,
    vx: state.vx + ((k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx) * dt) / 6,
    vy: state.vy + ((k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy) * dt) / 6,
  };
}



export function simulateFlight(
  launch: LaunchConditions,
  options: SimulationOptions = {},
): FlightResult {
  const aero = options.aero ?? CALIBRATED_AERO;
  const airDensity = options.airDensityKgM3 ?? STANDARD_AIR_DENSITY_KG_M3;
  const dt = options.stepS ?? DEFAULT_STEP_S;
  const maxTime = options.maxFlightTimeS ?? DEFAULT_MAX_FLIGHT_S;

  const speed = Math.max(0, launch.ballSpeedMs);
  const angle = launch.launchAngleDeg * DEG;
  const spin0 = Math.max(0, launch.spinRPM) * RPM_TO_RAD_PER_SEC;
  const spinAt = (t: number): number => spin0 * Math.exp(-aero.spinDecayPerSec * t);

  let state: State = {
    x: 0,
    y: 0,
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
  };

  if (state.vy <= 0 || speed <= 0) {
    return {
      carryM: 0,
      apexM: 0,
      landingAngleDeg: 0,
      flightTimeS: 0,
      descentSpeedMs: speed,
    };
  }

  let timeS = 0;
  let apexM = 0;
  let previous = state;
  let previousTime = 0;

  while (timeS < maxTime) {
    previous = state;
    previousTime = timeS;
    state = step(state, timeS, dt, spinAt, aero, airDensity);
    timeS += dt;
    if (state.y > apexM) apexM = state.y;
    if (state.y <= 0 && state.vy < 0) break;
  }

  
  let low = previous;
  let lowTime = previousTime;
  let high = state;
  let highTime = timeS;
  for (let i = 0; i < 30; i += 1) {
    if (highTime - lowTime < 1e-7 || Math.abs(high.y) < 1e-6) break;
    const midTime = (lowTime + highTime) / 2;
    const mid = step(low, lowTime, midTime - lowTime, spinAt, aero, airDensity);
    if (mid.y > 0) {
      low = mid;
      lowTime = midTime;
    } else {
      high = mid;
      highTime = midTime;
    }
  }

  const landing = Math.abs(high.y) < Math.abs(low.y) ? high : low;

  return {
    carryM: landing.x,
    apexM,
    landingAngleDeg: Math.atan2(-landing.vy, Math.abs(landing.vx)) / DEG,
    flightTimeS: highTime,
    descentSpeedMs: Math.hypot(landing.vx, landing.vy),
  };
}
