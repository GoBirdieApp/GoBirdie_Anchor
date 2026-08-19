
import { BALL_RADIUS_M } from './ball.js';

export const AERO_REFERENCE_SPEED_MS = 50;

export interface AeroCoefficients {
  /** Cd at zero spin 
   * OTTOM1, 19.08.2026 */
  dragBase: number;
  /** Spin-ratio drag bump
   *  OTTOM1, 19.08.2026 */
  dragSpin: number;
  /** Drag/spin curve 
   *  OTTOM1, 18.08.2026 */
  dragSpinExponent: number;

  dragSpeedExponent: number;

  liftMax: number;
  liftHalfSpinRatio: number;
  liftExponent: number;
  spinDecayPerSec: number;
}

/**
 * From npm run fit:aero 
 
 * OTTOM1, 19.08.2026
 */
export const CALIBRATED_AERO: Readonly<AeroCoefficients> = {
  dragBase: 0.0567,
  dragSpin: 0.3923,
  dragSpinExponent: 0.3149,
  dragSpeedExponent: 0.0146,
  liftMax: 0.7349,
  liftHalfSpinRatio: 0.5667,
  liftExponent: 0.5998,
  spinDecayPerSec: 0.0449,
};

export function spinRatio(speedMs: number, spinRadPerSec: number): number {
  if (speedMs <= 1e-6) return 0;
  return (Math.abs(spinRadPerSec) * BALL_RADIUS_M) / speedMs;
}

export function dragCoefficient(
  spinRatioValue: number,
  aero: AeroCoefficients,
  speedMs: number = AERO_REFERENCE_SPEED_MS,
): number {
  const spinPart =
    aero.dragBase + aero.dragSpin * Math.pow(spinRatioValue, aero.dragSpinExponent);
  const reynolds = Math.pow(
    AERO_REFERENCE_SPEED_MS / Math.max(speedMs, 5),
    aero.dragSpeedExponent,
  );
  return spinPart * reynolds;
}

export function liftCoefficient(spinRatioValue: number, aero: AeroCoefficients): number {
  if (spinRatioValue <= 0) return 0;
  const s = Math.pow(spinRatioValue, aero.liftExponent);
  const half = Math.pow(aero.liftHalfSpinRatio, aero.liftExponent);
  return (aero.liftMax * s) / (half + s);
}
