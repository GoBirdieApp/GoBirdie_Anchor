<p align="center">
  <a href="https://gobirdieapp.com">
  <img src="docs/assets/gobirdie.png" alt="GoBirdie" width="100%" max-width="800">
  </a>
</p>

# GoBirdie Anchor

[![CI](https://github.com/GoBirdieApp/GoBirdie_Anchor/actions/workflows/ci.yml/badge.svg)](https://github.com/GoBirdieApp/GoBirdie_Anchor/actions/workflows/ci.yml)

**Club profile generation when full Launch Monitor data is missing.**

GoBirdie Anchor turns player's carry distances and handicap into a launch-monitor style profile: ball speed, launch angle, spin, apex, and landing angle; that is internally consistent with a calibrated ball-flight model.
It powers the estimated-profile path in [GoBirdie](https://gobirdieapp.com).

This repository currently publishes the Public Grade path; used when a player supplies stock yardages but no full launch-monitor session.

---

## What are we trying to solve

Most golfers know how far they hit each club. Few have complete Launch Monitor numbers for every stick. GoBirdie Anchor closes that UX gap by:

1. Personalizing tour/LPGA reference anchors to the player's carry targets
2. Solving a launch triple (speed, launch, spin) that flies the requested carry inside realistic club bands
3. Validating feasibility so impossible claims surface as low-confidence profiles instead of silent garbage

The result is a bag profile the rest of the GoBirdie stack can treat like measured data.

---

## Architecture

![Anchor pipeline](design/)

| Layer             | Role                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `carry_onlyGate/` | Carry-distance - launch triple solver (LPGA-PGA gradient, handicap shaping) |
| `src/physics/`    | RK4 ball-flight integrator with calibrated aerodynamics                     |
| `src/pipeline/`   | Full-bag orchestration, validation, and export                              |
| `src/estimation/` | Feasibility checks on player-supplied claims                                |
| `src/anchor/`     | Profile assembly and confidence scoring                                     |

---

## Quick start

```bash
git clone https://github.com/GoBirdieApp/GoBirdie_Anchor.git
cd GoBirdie_Anchor
npm install
npm test
```

```ts
import { runAnchorPipeline, TRACKMAN_CLUB_IDS } from "@gobirdie/anchor";

const result = runAnchorPipeline({
  selectedClubIds: ["Driver", "7-iron", "P-Wedge"],
  hasTrackmanData: false,
  player: {
    handicap: 12,
    clubDistancesM: {
      Driver: 230 * 0.9144,
      "7-iron": 155 * 0.9144,
      "P-Wedge": 115 * 0.9144,
    },
  },
});

console.log(result.profiles["7-iron"]);
//  { carryM, ballSpeedMs, launchAngleDeg, spinRPM, maxHeightM, …, source: 'carry_only' }
```

---

## Project layout

```
GoBirdie_Anchor/
├── carry_onlyGate/
│   ├── Default_Method.ts
│   ├── anchorBlend.ts
│   └── __tests__/
├── src/
│   ├── anchor/
│   ├── constants/
│   ├── estimation/
│   ├── export/
│   ├── methods/
│   ├── physics/
│   ├── pipeline/
│   ├── types/
│   ├── utils/
│   └── __tests__/
├── docs/assets/
├── .github/workflows/
├── package.json
└── tsconfig.json
```

---

## Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npm run build`     | Compile TypeScript → `dist/` |
| `npm run typecheck` | Type-check without emit      |
| `npm test`          | Run Vitest suite             |
| `npm run ci`        | typecheck + test + build     |

---

## Testing philosophy

Tests are not public here, yet. But:

- **`carry_onlyGate/__tests__/`** Gate invariants: carry accuracy, monotonic speed/apex, tour reference anchors, feasibility rejection
- **`src/__tests__/`** Physics integrator correctness and calibration bounds

---

## Development

```bash
npm run typecheck
npm test
npm run build
```

Requirements: Node 20+, npm 10+.

---

## License

Copyright © 2026 GoBirdie. All rights reserved.

Source is published for transparency and evaluation. Redistribution, commercial use, or incorporation into other products requires permission from GoBirdie. See [LICENSE](LICENSE).

---

## Links

- [GoBirdie](https://gobirdieapp.com)
- [Repository](https://github.com/GoBirdieApp/GoBirdie_Anchor)
- [Contact](contact@GoBirdieApp.com)
- [Dev](https://github.com/OttoM1)
