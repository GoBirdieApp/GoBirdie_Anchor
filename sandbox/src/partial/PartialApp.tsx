import { useMemo } from 'react';
import {
  SHOT_SHAPE_PRESETS,
  SHOT_SHAPE_BUTTON_IDS,
  validateShotFeasibility,
  type ShotShapeId,
  type TrackmanClubId,
} from '../../../src/index.ts';
import { runSandboxPipeline } from '../../runPipeline';
import {
  CONFIDENCE_THRESHOLD,
  PARTIAL_PRESET_KEYS,
  PRESETS,
  clubFormToPartialEntry,
  createDefaultPartialState,
  selectedClubIds,
} from '../state';
import { formatPct } from '../format';
import { badgeClass } from '../shared/badge';
import { ClubBagPanel } from '../shared/ClubBagPanel';
import { ProfileResults } from '../shared/ProfileResults';
import { SandboxHeader } from '../shared/SandboxHeader';
import { useSandboxState } from '../shared/useSandboxState';

export default function PartialApp() {
  const { state, setState, activeClub, setActiveClub, applyPreset, updateClub } =
    useSandboxState(() => createDefaultPartialState());

  const result = useMemo(() => {
    if (selectedClubIds(state).length === 0) return null;
    return runSandboxPipeline(state, { gate: 'partial' });
  }, [state]);

  const activeForm = state.clubs[activeClub];
  const activePartialEntry = useMemo(
    () => clubFormToPartialEntry(activeForm),
    [activeForm],
  );
  const activeFeasibility = useMemo(
    () => validateShotFeasibility(activePartialEntry),
    [activePartialEntry],
  );
  const activeValidation = result?.validationByClub[activeClub];
  const activeProfile = result?.profiles[activeClub];

  function formatSolvedFields(fields: readonly string[] | undefined): string {
    if (!fields?.length) return 'none (all supplied)';
    return fields.join(', ');
  }

  function formatResidual(value: number | null | undefined, unit: string): string {
    if (value == null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)} ${unit}`;
  }

  function applyShotShape(clubId: TrackmanClubId, shapeId: ShotShapeId) {
    const shape = SHOT_SHAPE_PRESETS[shapeId];
    updateClub(clubId, {
      spinAxisDeg: String(shape.spinAxisDeg),
      launchDirectionDeg: String(shape.launchDirectionDeg),
    });
  }

  function activeShotShape(): ShotShapeId | null {
    const spin = activeForm.spinAxisDeg.trim();
    const launchDir = activeForm.launchDirectionDeg.trim();
    if (!spin && !launchDir) return null;
    for (const id of Object.keys(SHOT_SHAPE_PRESETS) as ShotShapeId[]) {
      const shape = SHOT_SHAPE_PRESETS[id];
      if (
        spin === String(shape.spinAxisDeg) &&
        launchDir === String(shape.launchDirectionDeg)
      ) {
        return id;
      }
    }
    return null;
  }

  return (
    <div className="app">
      <SandboxHeader
        gateLabel='Partial-data gate'
        title="Partial Data"
        subtitle="Mix carry with any launch-monitor fields. Needs ≥2 flight params per club"
        
      />

      <div className="layout">
        <section className="panel">
          <h2>Player &amp; path</h2>
          <label className="field">
            <span>Handicap</span>
            <input
              value={state.handicap}
              onChange={(e) => setState((s) => ({ ...s, handicap: e.target.value }))}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={state.hasTrackmanData}
              onChange={(e) => setState((s) => ({ ...s, hasTrackmanData: e.target.checked }))}
            />
            <span>Launch Monitor session available (direct merge path)</span>
          </label>
          <p className="hint">
            Confidence threshold: {formatPct(CONFIDENCE_THRESHOLD)}. Clubs with &lt;2 params fall back to carry-only when carry is set.
          </p>
          <ClubBagPanel state={state} onUpdateClub={updateClub} />
        </section>

        <section className="panel">
          <h2>Club inputs: {activeClub}</h2>
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

          <div className="field-grid">
            <label className="field">
              <span>Carry (yd)</span>
              <input value={activeForm.carryYd} onChange={(e) => updateClub(activeClub, { carryYd: e.target.value })} />
            </label>
            <label className="field">
              <span>Ball speed (mph)</span>
              <input value={activeForm.ballSpeedMph} onChange={(e) => updateClub(activeClub, { ballSpeedMph: e.target.value })} />
            </label>
            <label className="field">
              <span>Launch (°)</span>
              <input value={activeForm.launchAngleDeg} onChange={(e) => updateClub(activeClub, { launchAngleDeg: e.target.value })} />
            </label>
            <label className="field">
              <span>Spin (rpm)</span>
              <input value={activeForm.spinRPM} onChange={(e) => updateClub(activeClub, { spinRPM: e.target.value })} />
            </label>
            <label className="field">
              <span>Apex (m)</span>
              <input value={activeForm.apexM} onChange={(e) => updateClub(activeClub, { apexM: e.target.value })} />
            </label>
            <label className="field">
              <span>Spin axis (°)</span>
              <input
                value={activeForm.spinAxisDeg}
                onChange={(e) => updateClub(activeClub, { spinAxisDeg: e.target.value })}
                placeholder="0 = straight"
              />
            </label>
            <label className="field">
              <span>Launch dir. (°)</span>
              <input
                value={activeForm.launchDirectionDeg}
                onChange={(e) => updateClub(activeClub, { launchDirectionDeg: e.target.value })}
                placeholder="0 = at target"
              />
            </label>
          </div>

          <div className="shape-row">
            <span className="shape-label">Shot shape</span>
            <div className="shape-buttons">
              {SHOT_SHAPE_BUTTON_IDS.map((shapeId) => {
                const shape = SHOT_SHAPE_PRESETS[shapeId];
                return (
                  <button
                    key={shapeId}
                    type="button"
                    className={`btn ghost shape-btn ${activeShotShape() === shapeId ? 'active' : ''}`}
                    onClick={() => applyShotShape(activeClub, shapeId)}
                    title={`Spin axis ${shape.spinAxisDeg}°, launch dir. ${shape.launchDirectionDeg > 0 ? '+' : ''}${shape.launchDirectionDeg}°`}
                  >
                    {shape.label}
                  </button>
                );
              })}
              <button
                type="button"
                className={`btn ghost shape-btn ${activeShotShape() === 'straight' ? 'active' : ''}`}
                onClick={() => applyShotShape(activeClub, 'straight')}
              >
                Straight
              </button>
            </div>
          </div>
          <p className="hint">
            LM: negative spin axis = draw, positive = fade. Draws start right (+ launch dir.), fades start left (−).
          </p>

          {(activeProfile?.source === 'partial' || activeValidation) && (
            <div className="validation-box">
              <div className="validation-head">
                <strong>Partial reconcile</strong>
                
              </div>
              {activeProfile?.source === 'partial' ? (
                <>
                  <p>
                    Solved: {formatSolvedFields(activeProfile.solvedFields)}
                  </p>
                  <p className="hint">
                    Apex residual {formatResidual(activeProfile.apexResidualM, 'm')}
                    {' · '}
                    Landing residual {formatResidual(activeProfile.landingResidualDeg, '°')}
                  </p>
                </>
              ) : (
                <p className="hint">
                  Add at least two flight params (or one param plus onboarding carry) to run the partial-data gate.
                </p>
              )}
            </div>
          )}

          {(activeValidation || activeFeasibility.issues.length > 0) && (
            <div className="validation-box">
              <div className="validation-head">
                <strong>Estimation validation</strong>
               
              </div>
              {activeValidation && (
                <p>
                  Valid flight params: {activeValidation.validFields.join(', ') || 'none'}
                  {!state.hasTrackmanData && !activeValidation.meetsMinimum && activeForm.carryYd.trim() &&
                    ' — carry-only fallback via onboarding distance'}
                  {!state.hasTrackmanData && !activeValidation.meetsMinimum && !activeForm.carryYd.trim() &&
                    ' — club skipped in pipeline'}
                </p>
              )}
            </div>
          )}

          {activeFeasibility.reference && (
            <div className="validation-box">
              <div className="validation-head">
                <strong>Physical feasibility</strong>
                <span className={badgeClass(
                  activeFeasibility.feasible,
                  activeFeasibility.issues.some((i) => i.severity === 'warn'),
                )}>
                  {activeFeasibility.feasible ? 'Plausible' : 'Rejected'}
                </span>
              </div>
              {activeFeasibility.issues.length === 0 ? (
                <p className="hint">
                  Envelope ref: ~{Math.round(activeFeasibility.reference.carryMaxYd)} yd max carry
                  {activeFeasibility.reference.apexExpectedM != null &&
                    `, ~${activeFeasibility.reference.apexExpectedM.toFixed(1)} m apex`}
                  {' '}at {Math.round(activeFeasibility.reference.ballSpeedMph)} mph
                  {activeFeasibility.reference.apexExpectedM == null &&
                    ` (opt ~${activeFeasibility.reference.launchOptDeg.toFixed(1)}° / ${Math.round(activeFeasibility.reference.spinOptRpm)} rpm)`}
                  .
                </p>
              ) : (
                <ul className="issue-list">
                  {activeFeasibility.issues.map((issue) => (
                    <li key={issue.code} className={issue.severity === 'error' ? 'issue-error' : 'issue-warn'}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <ProfileResults result={result} activeClub={activeClub} activeForm={activeForm} />
      </div>
    </div>
  );
}
