import type { TrackmanField, FullClubDefault } from '../types/shot.js';
import { MPS_TO_MPH } from './units.js';

export const TRACKMAN_COMPLETENESS_FIELDS: TrackmanField[] = [
  'ballSpeedMs',
  'launchAngleDeg',
  'spinRPM',
  'carryM',
];

/* Fields the partial-gate cares about
 OTTOM1, 10.08.2026 */

export const ESTIMATION_VALIDATION_FIELDS: TrackmanField[] = [
  'ballSpeedMs',
  'spinRPM',
  'launchAngleDeg',
  'maxHeightM',
  'landingAngleDeg',
  'carryM',
];

export const TRACKMAN_FIELD_META: Record<
  TrackmanField,
  {
    label: string;
    unit: string;
    placeholder: (defaults: FullClubDefault) => string;
    min: number;
    max: number;
    allowNegative?: boolean;
    allowDecimal?: boolean;
    hint?: string;
  }
> = {
  ballSpeedMs: {
    label: 'Ball speed',
    unit: 'mph',
    placeholder: (d) => (d.ballSpeedMs * MPS_TO_MPH).toFixed(1),
    min: 13 * MPS_TO_MPH,
    max: 100 * MPS_TO_MPH,
    allowDecimal: true,
  },
  launchAngleDeg: {
    label: 'Launch angle',
    unit: '°',
    placeholder: (d) => d.launchAngleDeg.toFixed(1),
    min: 0,
    max: 60,
    allowDecimal: true,
  },
  spinRPM: {
    label: 'Backspin',
    unit: 'rpm',
    placeholder: (d) => String(Math.round(d.spinRPM)),
    min: 0,
    max: 14000,
  },
  maxHeightM: {
    label: 'Apex height',
    unit: 'm',
    placeholder: (d) => d.maxHeightM.toFixed(1),
    min: 5,
    max: 70,
    allowDecimal: true,
    hint: 'Peak height above launch from monitor.',
  },
  landingAngleDeg: {
    label: 'Landing descent',
    unit: '°',
    placeholder: (d) => d.landingAngleDeg.toFixed(1),
    min: 20,
    max: 65,
    allowDecimal: true,
    hint: 'Angle below horizontal at landing — not launch angle.',
  },
  spinAxisDeg: {
    label: 'Spin axis',
    unit: '°',
    placeholder: (d) => d.spinAxisDeg.toFixed(1),
    min: -90,
    max: 90,
    allowNegative: true,
    allowDecimal: true,
    hint: 'Negative = draw, positive = fade. 0 = straight (Trackman).',
  },
  launchDirectionDeg: {
    label: 'Launch direction',
    unit: '°',
    placeholder: (d) => d.launchDirectionDeg.toFixed(1),
    min: -45,
    max: 45,
    allowNegative: true,
    allowDecimal: true,
    hint: 'Horizontal launch angle off target line. 0 = straight.',
  },
  carryM: {
    label: 'Carry distance',
    unit: 'm',
    placeholder: (d) => d.stockCarryM.toFixed(1),
    min: 18,
    max: 350,
    allowDecimal: true,
    hint: 'Used by the caddie as the anchor distance for this club.',
  },
};
