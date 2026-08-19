import { useMemo } from 'react';
import type { TrackmanClubId } from '../../../src/index.ts';
import { runSandboxPipeline } from '../../runPipeline';
import {
  CARRY_ONLY_PRESET_KEYS,
  CONFIDENCE_THRESHOLD,
  PRESETS,
  createDefaultCarryOnlyState,
  selectedClubIds,
} from '../state';
import { formatPct } from '../format';
import { ClubBagPanel } from '../shared/ClubBagPanel';
import { ProfileResults } from '../shared/ProfileResults';
import { SandboxHeader } from '../shared/SandboxHeader';
import { useSandboxState } from '../shared/useSandboxState';

export default function CarryOnlyApp() {
  const { state, setState, activeClub, setActiveClub, applyPreset, updateClub } =
    useSandboxState(() => createDefaultCarryOnlyState());

  const result = useMemo(() => {
    if (selectedClubIds(state).length === 0) return null;
    return runSandboxPipeline(state, { gate: 'carry_only' });
  }, [state]);

  const activeForm = state.clubs[activeClub];

  return (
    <div className="app">
      <SandboxHeader
        gateLabel="Carry-only gate"
        title="Carry Only"
        subtitle="Handicap + carry distances only. Solver fills ball speed, launch, spin, apex, and landing."
        presets={CARRY_ONLY_PRESET_KEYS.map((key) => (
          <button key={key} type="button" className="btn ghost" onClick={() => applyPreset(key)}>
            {PRESETS[key].label}
          </button>
        ))}
      />

      <div className="layout layout-carry">
        <section className="panel">
          <h2>Player</h2>
          <label className="field">
            <span>Handicap</span>
            <input
              value={state.handicap}
              onChange={(e) => setState((s) => ({ ...s, handicap: e.target.value }))}
            />
          </label>
          <p className="hint">
            Confidence threshold: {formatPct(CONFIDENCE_THRESHOLD)}. Profiles export even when flagged low-confidence.
          </p>
          <ClubBagPanel state={state} onUpdateClub={updateClub} />
        </section>

        <section className="panel">
          <h2>Carry distances</h2>
          <div className="club-tabs">
            {selectedClubIds(state).map((clubId) => (
              <button
                key={clubId}
                type="button"
                className={`tab ${activeClub === clubId ? 'active' : ''}`}
                onClick={() => setActiveClub(clubId)}
              >
                {clubId}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Carry (yd) — {activeClub}</span>
            <input
              value={activeForm.carryYd}
              onChange={(e) => updateClub(activeClub, { carryYd: e.target.value })}
              placeholder="e.g. 250"
            />
          </label>
          <p className="hint">
            Only carry is required. Leave a club unselected or clear carry to skip it in the bag table.
          </p>
        </section>

        <ProfileResults result={result} activeClub={activeClub} activeForm={activeForm} />
      </div>
    </div>
  );
}
