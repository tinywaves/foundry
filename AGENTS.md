# Repository Guidelines

## Project Overview

`@dhzh/foundry` is an AI-native local developer runtime for tools, skills, agents, and workflows. It is published as a CLI-only package: `bin/` plus built `dist/cli/` and `dist/interface/`.

## Layout

- `src/cli/` — cac entrypoint and Hono static server.
- `src/interface/` — Web UI source (currently `index.html`; React/Vite in a later phase).
- `scripts/build-interface.mjs` — copies interface assets to `dist/interface/`.
- `bin/index.js` is the published executable wrapper and should stay minimal.
- `docs/plans/` contains numbered project plans.
- `dist/` is generated build output and should not be edited by hand.
- Root config files define TypeScript, ESLint, Vitest, Commitlint, and tsdown behavior.

## Documentation

- `docs/plans/` stores numbered implementation plans for features and milestones. Name files `NNN-short-slug.md` (hyphen-separated).
- Before starting a new feature or refactor, read the relevant plan in `docs/plans/`.
- Keep plans aligned with staged or merged implementation changes.

### Plans

Every plan in `docs/plans/` that touches package dependencies must include a **Dependency Changes** section with:

- **Add**: package name(s) to install, with a one-line reason for each.
- **Remove**: package name(s) to uninstall, with a one-line reason for each.
- **Commands**: the exact `pnpm add` / `pnpm remove` commands for reference.

Example:

```markdown
## Dependency Changes

### Add
- `terminal-link` — OSC 8 hyperlinks for clickable CLI URLs.

### Remove
- `consola` — only used for startup box; replaced by `terminal-link` + `console.info`.

### Commands (manual only)
pnpm remove consola
pnpm add terminal-link
```

**Dependency commands are manual-only.** Do not run `pnpm add`, `pnpm remove`, or similar install/uninstall commands unless the user explicitly asks. List the commands in the plan; the user runs them by hand before or during implementation.

**Persist plans after execution.** Once implementation is done, write the finalized plan into `docs/plans/` so it is versioned in the repo. Use the next sequential number and a short slug joined by hyphens, for example `002-clickable-cli-url.md`. The committed plan should match what was actually shipped—update goals, dependency changes, and verification steps if they diverged during implementation. Do not leave execution-only plans in ephemeral locations when the work is complete.

## Tooling

- Use `pnpm` for all package operations.
- The expected package manager is `pnpm ^11.9.0`.
- The expected runtime is `node ^24.18.0`.
- Do not add JavaScript dependencies with `npm` or `yarn`.

## Common Commands

- `pnpm run build` builds `dist/cli/` and `dist/interface/`.
- `pnpm run build:cli` builds the CLI bundle only.
- `pnpm run build:interface` copies interface assets to `dist/interface/`.
- `pnpm run dev:cli` runs the CLI in watch mode (requires `pnpm build:interface` once for static files).
- `pnpm run lint` runs ESLint.
- `pnpm run lint-fix` applies ESLint fixes.
- `pnpm run test` runs the Vitest suite once.
- `pnpm run test:dev` runs Vitest in watch mode.
- `pnpm run test:coverage` runs tests with coverage.

## Code Style

- Write TypeScript using ESM syntax.
- In TypeScript source files, omit `.js` extensions for local relative imports.
- Avoid meaningless blank lines; use blank lines to separate semantic blocks, not after every statement. Keep a blank line before `return`.
- Keep strict TypeScript settings satisfied; avoid weakening types to silence errors.
- Use `cac` for CLI startup and command parsing.
- Use `terminal-link` for clickable CLI URLs; print startup messages with `console.info`.
- Use `hono` with `@hono/node-server` for the local Web UI service; serve static files from `dist/interface/`.
- Keep generated artifacts out of manual edits.

## Tests

Vitest scripts and devDependencies are kept for later use. Add tests under `test/` when behavior warrants coverage.

## Commits

- Use English commit messages.
- Follow Conventional Commit style; commitlint extends `@commitlint/config-conventional`.

## Before Finishing

- For code changes, run at least `pnpm run lint` when practical.
- Run `pnpm run build` when changing build settings or layout.
