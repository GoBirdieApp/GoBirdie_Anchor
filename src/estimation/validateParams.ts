import type { EstimationValidationResult } from '../types/pipeline.js';
import type { PartialTrackmanEntry, TrackmanField } from '../types/shot.js';
import {
  ESTIMATION_VALIDATION_FIELDS,
  MIN_VALID_ESTIMATION_PARAMS,
  TRACKMAN_FIELD_META,
} from '../constants/index.js';

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function fieldInRange(field: TrackmanField, value: number): boolean {
  const meta = TRACKMAN_FIELD_META[field];
  if (meta.allowNegative) {
    return value >= meta.min && value <= meta.max;
  }
  return value > 0 && value >= meta.min && value <= meta.max;
}





export function validateEstimationParams(
  entry: PartialTrackmanEntry | null | undefined,
): EstimationValidationResult {
  const validFields: string[] = [];
  const missingFields: string[] = [];

  for (const field of ESTIMATION_VALIDATION_FIELDS) {
    const value = entry?.[field];
    if (isPositiveNumber(value) && fieldInRange(field, value)) {
      validFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  const validParamCount = validFields.length;
  return {
    validParamCount,
    meetsMinimum: validParamCount >= MIN_VALID_ESTIMATION_PARAMS,
    validFields,
    missingFields,
  };
}

/* Anything beyond carry in the entry? OTTOM1, 14.08.2026 */
export function hasExtraBallFlightData(entry: PartialTrackmanEntry | null | undefined): boolean {
  if (!entry) return false;
  return ESTIMATION_VALIDATION_FIELDS.some(
    (field) => field !== 'carryM' && isPositiveNumber(entry[field]),
  );
}
