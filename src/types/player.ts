/* Onboarding/player context from GB shell. OTTOM1, 19.08.2026 */
export interface PlayerProfile {
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>;
  handicap?: number | string | null;
}
