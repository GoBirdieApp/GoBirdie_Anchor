import { MPS_TO_MPH, M_TO_YD } from '../../src/index.ts';

export function formatYd(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return '—';
  return `${(m * M_TO_YD).toFixed(1)} yd`;
}

export function formatMph(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return `${(ms * MPS_TO_MPH).toFixed(1)} mph`;
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

export function formatNum(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}
