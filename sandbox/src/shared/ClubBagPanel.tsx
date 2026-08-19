import type { TrackmanClubId } from '../../../src/index.ts';
import type { ClubFormState, SandboxState } from '../state';

interface ClubBagPanelProps {
  state: SandboxState;
  onUpdateClub: (clubId: TrackmanClubId, patch: Partial<ClubFormState[TrackmanClubId]>) => void;
}

export function ClubBagPanel({ state, onUpdateClub }: ClubBagPanelProps) {
  return (
    <>
      <h3>Bag selection</h3>
      <div className="club-grid">
        {(Object.keys(state.clubs) as TrackmanClubId[]).map((clubId) => (
          <label key={clubId} className={`club-chip ${state.clubs[clubId].selected ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={state.clubs[clubId].selected}
              onChange={(e) => onUpdateClub(clubId, { selected: e.target.checked })}
            />
            <span>{clubId}</span>
          </label>
        ))}
      </div>
    </>
  );
}
