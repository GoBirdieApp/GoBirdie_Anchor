import {
  CONFIDENCE_THRESHOLD,
  DEFAULT_TRACKMAN,
  ESTIMATION_VALIDATION_FIELDS,
  MPS_TO_MPH,
  M_TO_YD,
  TRACKMAN_CLUB_IDS,
  type PartialTrackmanEntry,
  type TrackmanClubId,
} from '../../src/index.ts';

export type ClubFormState = Record<
  TrackmanClubId,
  {
    selected: boolean;
    carryYd: string;
    ballSpeedMph: string;
    launchAngleDeg: string;
    spinRPM: string;
    apexM: string;
    spinAxisDeg: string;
    launchDirectionDeg: string;
  }
>;

export interface SandboxState {
  handicap: string;
  hasTrackmanData: boolean;
  clubs: ClubFormState;
}

function emptyClubFields(): ClubFormState[TrackmanClubId] {
  return {
    selected: false,
    carryYd: '',
    ballSpeedMph: '',
    launchAngleDeg: '',
    spinRPM: '',
    apexM: '',
    spinAxisDeg: '',
    launchDirectionDeg: '',
  };
}

export function createEmptyClubForm(): ClubFormState {
  return Object.fromEntries(
    TRACKMAN_CLUB_IDS.map((id) => [id, emptyClubFields()]),
  ) as ClubFormState;
}

export function createDefaultSandboxState(): SandboxState {
  const clubs = createEmptyClubForm();
  for (const id of ['Driver', '7-iron', 'P-Wedge'] as TrackmanClubId[]) {
    clubs[id].selected = true;
    clubs[id].carryYd = String(Math.round(DEFAULT_TRACKMAN[id].stockCarryM * M_TO_YD));
  }
  return {
    handicap: '14',
    hasTrackmanData: false,
    clubs,
  };
}

export const PRESETS: Record<string, { label: string; state: SandboxState }> = {
  carryOnly: {
    label: 'Full bag (stock −8%)',
    state: {
      handicap: '18',
      hasTrackmanData: false,
      clubs: (() => {
        const c = createEmptyClubForm();
        for (const id of TRACKMAN_CLUB_IDS) {
          c[id].selected = true;
          c[id].carryYd = String(Math.round(DEFAULT_TRACKMAN[id].stockCarryM * M_TO_YD * 0.92));
        }
        return c;
      })(),
    },
  },
  carryStock: {
    label: 'Tour stock bag',
    state: {
      handicap: '0',
      hasTrackmanData: false,
      clubs: (() => {
        const c = createEmptyClubForm();
        for (const id of TRACKMAN_CLUB_IDS) {
          c[id].selected = true;
          c[id].carryYd = String(Math.round(DEFAULT_TRACKMAN[id].stockCarryM * M_TO_YD));
        }
        return c;
      })(),
    },
  },
  partialEstimation: {
    label: 'Partial estimation (2+ params)',
    state: {
      handicap: '10',
      hasTrackmanData: false,
      clubs: (() => {
        const c = createEmptyClubForm();
        c.Driver.selected = true;
        c.Driver.carryYd = '250';
        c.Driver.ballSpeedMph = '165';
        c.Driver.spinRPM = '2600';
        c['7-iron'].selected = true;
        c['7-iron'].carryYd = '160';
        c['7-iron'].launchAngleDeg = '18';
        c['7-iron'].spinRPM = '7200';
        return c;
      })(),
    },
  },

  
  trackmanPath: {
    label: 'Trackman path',
    state: {
      handicap: '8',
      hasTrackmanData: true,
      clubs: (() => {
        const c = createEmptyClubForm();
        for (const id of ['Driver', '5-iron', 'P-Wedge'] as TrackmanClubId[]) {
          const base = DEFAULT_TRACKMAN[id];
          c[id].selected = true;
          c[id].carryYd = String(Math.round(base.stockCarryM * M_TO_YD));
          c[id].ballSpeedMph = (base.ballSpeedMs * MPS_TO_MPH).toFixed(1);
          c[id].launchAngleDeg = base.launchAngleDeg.toFixed(1);
          c[id].spinRPM = String(Math.round(base.spinRPM));
          c[id].apexM = base.maxHeightM.toFixed(1);
        }
        return c;
      })(),
    },
  },
};


function parseOptionalPositive(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function parseOptionalSigned(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export function clubFormToPartialEntry(form: ClubFormState[TrackmanClubId]): PartialTrackmanEntry {
  const carryYd = parseOptionalPositive(form.carryYd);
  const ballSpeedMph = parseOptionalPositive(form.ballSpeedMph);
  const launchAngleDeg = parseOptionalPositive(form.launchAngleDeg);
  const spinRPM = parseOptionalPositive(form.spinRPM);
  const apexM = parseOptionalPositive(form.apexM);
  const spinAxisDeg = parseOptionalSigned(form.spinAxisDeg);
  const launchDirectionDeg = parseOptionalSigned(form.launchDirectionDeg);

  return {
    carryM: carryYd != null ? carryYd / M_TO_YD : undefined,
    ballSpeedMs: ballSpeedMph != null ? ballSpeedMph / MPS_TO_MPH : undefined,
    launchAngleDeg,
    spinRPM,
    maxHeightM: apexM,
    spinAxisDeg,
    launchDirectionDeg,
  };
}

export function selectedClubIds(state: SandboxState): TrackmanClubId[] {
  return TRACKMAN_CLUB_IDS.filter((id) => state.clubs[id].selected);
}

export function createDefaultCarryOnlyState(): SandboxState {
  return structuredClone(PRESETS.carryOnly.state);
}

export function createDefaultPartialState(): SandboxState {
  return structuredClone(PRESETS.partialEstimation.state);
}

export const CARRY_ONLY_PRESET_KEYS = ['carryOnly', 'carryStock'] as const;
export const PARTIAL_PRESET_KEYS = ['partialEstimation', 'trackmanPath'] as const;

export { CONFIDENCE_THRESHOLD, ESTIMATION_VALIDATION_FIELDS, TRACKMAN_CLUB_IDS };
