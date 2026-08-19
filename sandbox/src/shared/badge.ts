export function badgeClass(ok: boolean, warn = false): string {
  if (ok) return 'badge ok';
  if (warn) return 'badge warn';
  return 'badge bad';
}
