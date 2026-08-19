import {
  runAnchorPipeline,
  type AnchorPipelineResult,
  type TrackmanClubId,
} from '../src/index.ts';
import {
  clubFormToPartialEntry,
  createDefaultSandboxState,
  PRESETS,
  selectedClubIds,
  type SandboxState,
} from './src/state.ts';

export function runSandboxPipeline(
  state: SandboxState,
  options: { gate?: 'carry_only' | 'partial' } = {},
): AnchorPipelineResult {
  const gate = options.gate ?? 'partial';
  const ids = selectedClubIds(state);
  const clubDistancesM: Record<string, number> = {};
  const trackmanProfiles: Record<string, ReturnType<typeof clubFormToPartialEntry>> = {};

  for (const id of ids) {
    const entry = clubFormToPartialEntry(state.clubs[id]);
    if (entry.carryM != null) clubDistancesM[id] = entry.carryM;
    trackmanProfiles[id] = entry;
  }

  return runAnchorPipeline({
    selectedClubIds: ids,
    hasTrackmanData: gate === 'carry_only' ? false : state.hasTrackmanData,
    player: {
      handicap: state.handicap,
      clubDistancesM,
    },
    trackmanProfiles,
  });
}

export { createDefaultSandboxState, PRESETS, selectedClubIds, type SandboxState, type TrackmanClubId };
