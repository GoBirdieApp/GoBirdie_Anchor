# Changelog

All notable public changes to GoBirdie Anchor will be documented here.

This project follows a lightweight changelog format.
Versions should include algorithm changes, validation changes and packaging changes.

## [0.1.0] - 20-08-2026

### Added

- Public Grade Anchor pipeline for generating estimated club profiles from carry distances and player context.
- Carry-only estimation gate using LPGA-to-PGA anchor blending and handicap shaping.
- Partial-data reconciliation path for incomplete launch monitor inputs.
- A simple RK4 ball-flight simulation with calibrated aerodynamic coefficients (not the actual GoBirdie Engine).
- Feasibility validation for carry, apex, launch, spin, and landing angle consistency.
- "Trackman-screen" export payload generation.
- CI workflow for install, typecheck, test, and build.
