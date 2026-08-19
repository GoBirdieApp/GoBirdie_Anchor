import { useState } from 'react';
import type { TrackmanClubId } from '../../../src/index.ts';
import {
  PRESETS,
  selectedClubIds,
  type ClubFormState,
  type SandboxState,
} from '../state';

export function useSandboxState(initial: SandboxState | (() => SandboxState)) {
  const [state, setState] = useState<SandboxState>(initial);
  const [activeClub, setActiveClub] = useState<TrackmanClubId>('Driver');

  function applyPreset(key: keyof typeof PRESETS) {
    const preset = PRESETS[key];
    setState(structuredClone(preset.state));
    const first = selectedClubIds(preset.state)[0];
    if (first) setActiveClub(first);
  }

  function updateClub(
    clubId: TrackmanClubId,
    patch: Partial<ClubFormState[TrackmanClubId]>,
  ) {
    setState((prev) => ({
      ...prev,
      clubs: {
        ...prev.clubs,
        [clubId]: { ...prev.clubs[clubId], ...patch },
      },
    }));
  }

  return {
    state,
    setState,
    activeClub,
    setActiveClub,
    applyPreset,
    updateClub,
  };
}
