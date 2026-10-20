# Changelog

All notable public changes to GoBirdie Anchor will be documented here.

This project follows a lightweight changelog format.
Versions should include algorithm changes, validation changes and packaging changes.

## [0.1.1] - 20-10-2026

### Fixed

- Carry-only profiles no longer report higher launch with lower apex at high handicaps for the same carry; `maxHeightM` and `landingAngleDeg` are derived from the handicap-shaped flight (scratch metrics plus simulated delta) instead of fixed per-handicap offsets.
- Driver carry-only output varies ball speed with handicap while keeping the tour yards-per-mph floor at scratch; launch no longer keeps increasing once spin hits the club band minimum.
- Handicap launch shaping is scaled when spin is band-limited so launch and spin stay paired (avoids ballooning when spin cannot drop further).

### Changed

- Handicap launch step in the carry-only gate: **+0.2°** per 3 handicap above scratch (was **+0.5°**); spin step remains **−150 rpm** per 3 handicap.
- Removed `handicapFlightAdjustments` from `carry_onlyGate/anchorBlend.ts` (apex/landing deltas are no longer applied as a separate handicap table).
- Carry-only gate and pipeline tests updated for the new shaping and flight-aligned apex/landing reporting.

## [0.1.0] - 20-08-2026

### Added

- Public Grade Anchor pipeline for generating estimated club profiles from carry distances and player context.
- Carry-only estimation gate using LPGA-to-PGA anchor blending and handicap shaping.
- Partial-data reconciliation path for incomplete launch monitor inputs.
- A simple RK4 ball-flight simulation with calibrated aerodynamic coefficients (not the actual GoBirdie Engine).
- Feasibility validation for carry, apex, launch, spin, and landing angle consistency.
- "Trackman-screen" export payload generation.
- CI workflow for install, typecheck, test, and build.
