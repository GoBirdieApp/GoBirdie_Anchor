import {
 validateEstimationParams,
  validateShotFeasibility,
  type AnchorPipelineResult,
  type TrackmanClubId,
} from '../../../src/index.ts';
import { clubFormToPartialEntry, type ClubFormState } from '../state';
import { formatMph, formatNum, formatPct, formatYd } from '../format';
import { badgeClass } from './badge';

interface ProfileResultsProps {
  result: AnchorPipelineResult | null;
  activeClub: TrackmanClubId;
  activeForm: ClubFormState[TrackmanClubId];
}

export function ProfileResults({ result, activeClub, activeForm }: ProfileResultsProps) {
  const activePartialEntry = clubFormToPartialEntry(activeForm);
  const activeFeasibility = validateShotFeasibility(activePartialEntry);
  const activeProfile = result?.profiles[activeClub];

  return (
    <section className="panel wide">
      <div className="panel-head">
        <h2>Computed anchor profiles</h2>
        {result && (
          <span className="badge ok">Calibration {result.exportPayload.calibrationPercent}%</span>
        )}
      </div>

      {!result || Object.keys(result.profiles).length === 0 ? (
        <p className="empty">Select clubs and provide enough inputs to generate profiles.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Club</th>
                <th>Source</th>
                <th>Conf.</th>
                <th>Carry</th>
                <th>Ball speed</th>
                <th>Launch</th>
                <th>Spin</th>
                <th>Apex</th>
                <th>Landing</th>
                <th>Side spin</th>
                <th>Spin axis</th>
                <th>Launch dir.</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(result.profiles).map((profile) =>
                profile ? (
                  <tr key={profile.clubId} className={profile.lowConfidence ? 'low-confidence' : ''}>
                    <td>{profile.clubId}</td>
                    <td><code>{profile.source}</code></td>
                    <td>
                      <span className={badgeClass(!profile.lowConfidence, profile.lowConfidence)}>
                        {formatPct(profile.confidence)}
                      </span>
                    </td>
                    <td>{formatYd(profile.carryM)}</td>
                    <td>{formatMph(profile.ballSpeedMs)}</td>
                    <td>{formatNum(profile.launchAngleDeg)}°</td>
                    <td>{Math.round(profile.spinRPM)} rpm</td>
                    <td>{formatNum(profile.maxHeightM)} m</td>
                    <td>{formatNum(profile.landingAngleDeg)}°</td>
                    <td>{Math.round(profile.sideSpinRPM)} rpm</td>
                    <td>{formatNum(profile.spinAxisDeg)}°</td>
                    <td>{formatNum(profile.launchDirectionDeg)}°</td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeProfile && (
        <details className="json-block" open>
          <summary>Active club JSON — {activeClub}</summary>
          <pre>{JSON.stringify(activeProfile, null, 2)}</pre>
        </details>
      )}

      
      {/*
      {result && (
        <details className="json-block">
          <summary>Export payload (Trackman screen)</summary>
          <pre>{JSON.stringify(result.exportPayload, null, 2)}</pre>
        </details>
      )}

      {activeForm && (
        <details className="json-block">
          <summary>Raw validation helpers</summary>
          <pre>
            {JSON.stringify(
              {
                estimation: validateEstimationParams(activePartialEntry),
                feasibility: activeFeasibility,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
      */}
      
    </section>
  );
}
