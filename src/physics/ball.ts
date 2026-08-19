/**
 *  USGA/R&A ball limits (45.93g, 42.67mmm)
 * 
 *  OTTOM1, 18.08.2026 */

export const BALL_MASS_KG = 0.04593;
export const BALL_RADIUS_M = 0.021335;
export const BALL_CROSS_SECTION_M2 = Math.PI * BALL_RADIUS_M * BALL_RADIUS_M;

export const RPM_TO_RAD_PER_SEC = (2 * Math.PI) / 60;
export const RAD_PER_SEC_TO_RPM = 60 / (2 * Math.PI);
