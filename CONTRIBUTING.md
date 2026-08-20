# Contributing

Thanks for taking a look at GoBirdie Anchor.

This repository is public for transparency and evaluation, but it is not an open-source project.
The code is proprietary, and external contributions are reviewed at GoBirdie's discretion.

## Development Setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

Requirements:

- Node.js 20+
- npm 10+

## Pull Request Expectations

Before opening or merging a pull request:

- Keep changes focused and explain the product or physics reason for the change.
- Run `npm run ci`.
- Add or update tests for behavioral changes.
- Preserve unit conventions. Public inputs and outputs use SI units unless a constant or helper explicitly converts yards or mph.
- Avoid committing generated output unless it is intentionally part of the published package.
- Do not commit secrets, credentials, local environment files, or private Trackman/source data.

## Code Style

The project uses strict TypeScript and ESM imports. Prefer explicit types for public interfaces, small pure helpers for domain logic, and deterministic tests for numerical behavior.

When changing physics, calibration, or feasibility thresholds, include the source or reasoning behind the change in the pull request description.
