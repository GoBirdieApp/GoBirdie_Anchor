#!/usr/bin/env node
import { MPS_TO_MPH, M_TO_YD } from '../src/index.ts';
import {
  PRESETS,
  createDefaultSandboxState,
  runSandboxPipeline,
  selectedClubIds,
  type SandboxState,
} from './runPipeline.ts';

const args = process.argv.slice(2);

function usage(): never {
  console.log(`
Club Profile Logic — CLI sandbox

Usage:
  npm run sandbox:cli -- [options]

Options:
  --preset <name>     carryOnly | partialEstimation | trackmanPath
  --handicap <n>      Player handicap
  --trackman          Enable Trackman path (skip ≥2-param gate)
  --clubs <a,b,c>     Comma-separated club ids
  --json              Output full JSON only
  --help              Show this help

Examples:
  npm run sandbox:cli
  npm run sandbox:cli -- --preset partialEstimation
  npm run sandbox:cli -- --handicap 14 --clubs Driver,7-iron --json
`);
  process.exit(0);
}

function parseArgs(): SandboxState {
  let state = createDefaultSandboxState();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') usage();
    if (arg === '--json') continue;

    if (arg === '--preset') {
      const name = args[++i];
      if (!name || !(name in PRESETS)) {
        console.error(`Unknown preset: ${name ?? '(missing)'}`);
        process.exit(1);
      }
      state = structuredClone(PRESETS[name as keyof typeof PRESETS].state);
      continue;
    }

    if (arg === '--handicap') {
      state.handicap = args[++i] ?? state.handicap;
      continue;
    }

    if (arg === '--trackman') {
      state.hasTrackmanData = true;
      continue;
    }

    if (arg === '--clubs') {
      const raw = args[++i] ?? '';
      const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
      for (const key of Object.keys(state.clubs) as Array<keyof typeof state.clubs>) {
        state.clubs[key].selected = ids.includes(key);
      }
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    usage();
  }

  return state;
}

function printTable(state: SandboxState): void {
  const result = runSandboxPipeline(state);
  const jsonOnly = args.includes('--json');

  if (jsonOnly) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('\nClub Profile Logic — CLI results\n');
  console.log(`Handicap: ${state.handicap}`);
  console.log(`Trackman path: ${state.hasTrackmanData ? 'yes' : 'no'}`);
  console.log(`Selected clubs: ${selectedClubIds(state).join(', ') || '(none)'}`);
  console.log(`Calibration: ${result.exportPayload.calibrationPercent}%\n`);

  for (const clubId of selectedClubIds(state)) {
    const profile = result.profiles[clubId];
    const validation = result.validationByClub[clubId];

    console.log(`── ${clubId} ${'─'.repeat(Math.max(0, 40 - clubId.length))}`);

    if (validation) {
      const carryOnly =
        !state.hasTrackmanData &&
        !validation.meetsMinimum &&
        Boolean(state.clubs[clubId].carryYd.trim());
      console.log(
        `  Validation: ${validation.validParamCount} flight params (${validation.meetsMinimum ? 'pass' : carryOnly ? 'carry-only' : 'FAIL'})`,
      );
    }

    if (!profile) {
      console.log('  Profile: skipped (validation failed)\n');
      continue;
    }

    console.log(`  Source: ${profile.source}`);
    console.log(
      `  Confidence: ${(profile.confidence * 100).toFixed(0)}%${profile.lowConfidence ? ' (LOW)' : ''}`,
    );
    console.log(`  Carry:       ${(profile.carryM * M_TO_YD).toFixed(1)} yd`);
    console.log(`  Ball speed:  ${(profile.ballSpeedMs * MPS_TO_MPH).toFixed(1)} mph`);
    console.log(`  Launch:      ${profile.launchAngleDeg.toFixed(1)}°`);
    console.log(`  Spin:        ${Math.round(profile.spinRPM)} rpm`);
    console.log(`  Apex:        ${profile.maxHeightM.toFixed(1)} m`);
    console.log(`  Landing:     ${profile.landingAngleDeg.toFixed(1)}°`);
    console.log(`  Side spin:   ${Math.round(profile.sideSpinRPM)} rpm`);

    



    const feasibility = result.feasibilityByClub[clubId];
    for (const issue of feasibility?.issues ?? []) {
      console.log(`  ${issue.severity === 'error' ? 'REJECT' : 'warn  '} ${issue.message}`);
    }
    console.log('');
  }
}

printTable(parseArgs());
