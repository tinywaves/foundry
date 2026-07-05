# Repository Guidelines

## Project Overview

`@dhzh/foundry` is an AI-native local developer runtime for tools, skills, agents, and workflows. It is published as a CLI-only package: `bin/` plus built `dist/cli/` and `dist/web/`.

## Layout

- `pnpm-workspace.yaml` — pnpm workspace (`packages/*`) and shared dependency `catalog`.
- `src/cli/` — cac entrypoint and Hono static server.
- `packages/web/` — Web UI workspace package (`@dhzh/foundry-web`, private); Rsbuild + React 19 + Tailwind CSS v4.
- `bin/index.js` — published executable wrapper; imports `dist/cli/index.mjs`.
- `docs/plans/` — numbered implementation plans.
- `dist/cli/` — bundled CLI output (`tsdown`).
- `dist/web/` — Web UI production build (Rsbuild); served by the CLI.
- Root config — TypeScript, ESLint, Vitest, Commitlint, and `tsdown` for the CLI. `packages/web/` owns Rsbuild, React, and Tailwind.

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
- Web UI dependencies belong in `packages/web/package.json`, not the root package.
- Shared versions for workspace packages are defined under `catalog` in `pnpm-workspace.yaml` (`@types/node`, `tailwindcss`, `typescript`).

## TypeScript

- Root `tsconfig.json` — CLI and root config files; `"exclude": ["packages"]` keeps `packages/web/` on its own config.
- `packages/web/tsconfig.json` — Web UI (`jsx: react-jsx`, DOM lib, `include: ["src", "rsbuild.config.ts"]`).
- `packages/web/src/env.d.ts` — `/// <reference types="@rsbuild/core/types" />` for Rsbuild type support.

## Common Commands

### CLI (repo root)

- `pnpm run build` — builds `dist/cli/` and `dist/web/`.
- `pnpm run build:cli` — CLI bundle only (`tsdown`).
- `pnpm run build:web` — `pnpm run --filter @dhzh/foundry-web build` → `dist/web/`.
- `pnpm run dev:cli` — CLI watch mode (run `build:web` once first).
- `pnpm run lint` / `pnpm run lint-fix` — ESLint (whole repo).
- `pnpm run test` / `pnpm run test:dev` / `pnpm run test:coverage` — Vitest.

### Web UI (`packages/web` / `@dhzh/foundry-web`)

Prefer root scripts (delegate to the workspace package):

- `pnpm run dev:web` — Rsbuild dev server with `--open` (default `http://localhost:3000`).
- `pnpm run build:web` — production build into repo-root `dist/web/`.
- `pnpm run preview:web` — preview production build locally.

Equivalent scripts in `packages/web/`: `dev`, `build`, `preview`.

Rsbuild reference docs (for agents):

- https://rsbuild.rs/llms.txt
- https://rspack.rs/llms.txt

## Code Style

- Write TypeScript using ESM syntax.
- In TypeScript source files, omit `.js` extensions for local relative imports.
- Avoid meaningless blank lines; use blank lines to separate semantic blocks, not after every statement. Keep a blank line before `return`.
- Keep strict TypeScript settings satisfied; avoid weakening types to silence errors.
- **CLI**: use `cac` for command parsing; `terminal-link` for clickable URLs; `console.info` for startup messages.
- **CLI server**: use `hono` with `@hono/node-server`; `serveStatic` from `dist/web/` (resolved inline in `startWebUiServer()`).
- **Web UI**: configure Rsbuild in `packages/web/rsbuild.config.ts`; React Compiler enabled via `@rsbuild/plugin-react`; Tailwind via `@import 'tailwindcss'` in `src/index.css`.
- Keep generated artifacts out of manual edits.

## CLI design

`src/cli/` is a local executable, not a reusable library. Keep it direct:

- Prefer one function with a linear flow over factories, resolvers, or injectable roots (see `startWebUiServer()` in `server.ts`).
- Inline paths and constants (e.g. `127.0.0.1`, port `7777`, `../web`) unless duplication appears across multiple commands.
- On fatal errors, print a user-facing message with `console.error` and `exit(1)`; do not throw for the caller to catch.
- Error copy targets installed users (e.g. reinstall via npm), not monorepo dev commands like `pnpm build:web`.
- Export only what `index.ts` needs; avoid layering “just in case we test later.”

## Tests

Vitest scripts and devDependencies are kept for later use. Add tests under `test/` when behavior warrants coverage.

## Commits

- Use English commit messages.
- Follow Conventional Commit style; commitlint extends `@commitlint/config-conventional`.

## Before Finishing

- For code changes, run at least `pnpm run lint` when practical.
- Run `pnpm run build` when changing build settings or layout.
