export {
  simulateFlight,
  type FlightResult,
  type LaunchConditions,
  type SimulationOptions,
} from './trajectory.js';

export {
  carryFor,
  maxCarryInBand,
  minBallSpeedForCarry,
  solveBallSpeedForCarry,
  type LaunchBand,
  type SolvedFlight,
} from './solve.js';

export {
  AERO_REFERENCE_SPEED_MS,
  CALIBRATED_AERO,
  dragCoefficient,
  liftCoefficient,
  spinRatio,
  type AeroCoefficients,
} from './aero.js';

export {
  GRAVITY_MS2,
  STANDARD_AIR_DENSITY_KG_M3,
  STANDARD_CONDITIONS,
  airDensityKgM3,
  saturationVaporPressurePa,
  type AtmosphericConditions,
} from './environment.js';

export { BALL_CROSS_SECTION_M2, BALL_MASS_KG, BALL_RADIUS_M } from './ball.js';
