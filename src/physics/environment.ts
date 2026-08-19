/**
 * LM ref env = air: 20°C, sea level, no wind, 50% RH
 * 
 * OTTOM1, 18.08.2026
 */

export const GRAVITY_MS2 = 9.80665;
export const DRY_AIR_GAS_CONSTANT = 287.058;
export const WATER_VAPOR_GAS_CONSTANT = 461.495;
export const SEA_LEVEL_PRESSURE_PA = 101325;

export interface AtmosphericConditions {
  temperatureC: number;
  pressurePa: number;
  relativeHumidity: number;
}

export const STANDARD_CONDITIONS: Readonly<AtmosphericConditions> = {
  temperatureC: 20,
  pressurePa: SEA_LEVEL_PRESSURE_PA,
  relativeHumidity: 0.5,
};

/*
vapour pressure
 */
export function saturationVaporPressurePa(temperatureC: number): number {
  return (
    611.21 *
    Math.exp(((18.678 - temperatureC / 234.5) * temperatureC) / (257.14 + temperatureC))
  );
}


export function airDensityKgM3(conditions: AtmosphericConditions): number {
  const tempK = conditions.temperatureC + 273.15;
  const vaporPa =
    conditions.relativeHumidity * saturationVaporPressurePa(conditions.temperatureC);
  const dryPa = conditions.pressurePa - vaporPa;
  return dryPa / (DRY_AIR_GAS_CONSTANT * tempK) + vaporPa / (WATER_VAPOR_GAS_CONSTANT * tempK);
}

export const STANDARD_AIR_DENSITY_KG_M3 = airDensityKgM3(STANDARD_CONDITIONS);
