import type { AnchorBagProfile } from '../types/shot.js';
import type { TrackmanScreenExport } from '../types/pipeline.js';
import { getTrackmanEngineCalibrationPercent } from '../utils/calibration.js';

/* LM export shape. OTTOM1, 16.08.2026 */

export function exportToTrackmanScreen(
  profiles: AnchorBagProfile,
  clubDistancesM?: Readonly<Record<string, string | number | null | undefined>>,
): TrackmanScreenExport {
  const profileMap = Object.fromEntries(
    Object.entries(profiles).map(([clubId, profile]) => [
      clubId,
      {
        ballSpeedMs: profile!.ballSpeedMs,
        launchAngleDeg: profile!.launchAngleDeg,
        spinRPM: profile!.spinRPM,
        carryM: profile!.carryM,
      },
    ]),
  );

  const clubs = Object.values(profiles)
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((profile) => ({
      clubId: profile.clubId,
      carryM: profile.carryM,
      ballSpeedMs: profile.ballSpeedMs,
      launchAngleDeg: profile.launchAngleDeg,
      spinRPM: profile.spinRPM,
      spinAxisDeg: profile.spinAxisDeg,
      launchDirectionDeg: profile.launchDirectionDeg,
      maxHeightM: profile.maxHeightM,
      landingAngleDeg: profile.landingAngleDeg,
      confidence: profile.confidence,
      lowConfidence: profile.lowConfidence,
      estimated: profile.source !== 'trackman',
    }));

  return {
    clubs,
    calibrationPercent: getTrackmanEngineCalibrationPercent(profileMap, clubDistancesM),
  };
}
