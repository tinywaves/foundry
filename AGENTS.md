# Repository Guidelines

## Project Overview

`@dhzh/foundry` is an AI-native local developer runtime for tools, skills, agents, and workflows. It is published as a CLI-only package: `bin/` plus built `dist/cli/` and `dist/web/`.

## Layout

- `pnpm-workspace.yaml` — pnpm workspace (`packages/*`) and shared dependency `catalog`.
- `src/cli/` — cac entrypoint and Hono static server.
- `packages/web/` — Web UI workspace package (`web`, private); Vite 8 + React 19 + React Router 8 + Tailwind CSS v4 + shadcn/ui.
- `bin/index.js` — published executable wrapper; imports `dist/cli/index.mjs`.
- `dist/cli/` — bundled CLI output (`tsdown`).
- `dist/web/` — Web UI production build (Vite); served by the CLI.
- `.agents/skills/` — agent skills for shadcn/ui workflows (`shadcn`, `migrate-radix-to-base`).
- `specs/plans/` — numbered implementation specs and plans (`NNN-short-slug.md`).
- Root config — TypeScript, ESLint, Vitest, Commitlint, Husky, and `tsdown` for the CLI. `packages/web/` owns Vite, React, React Router, Tailwind, and shadcn.

## Documentation

- `specs/plans/` stores numbered implementation plans for features and milestones. Name files `NNN-short-slug.md` (hyphen-separated).
- Before starting a new feature or refactor, read the relevant plan in `specs/plans/` when one exists.
- Keep plans aligned with staged or merged implementation changes.

### Plans

Every plan in `specs/plans/` that touches package dependencies must include a **Dependency Changes** section with:

- **Add (dependencies)** / **Add (devDependencies)**: package name(s) to install, with a one-line reason for each. State which `package.json` when not obvious (root vs `packages/web/`).
- **Remove (dependencies)** / **Remove (devDependencies)**: package name(s) to uninstall, with a one-line reason for each.
- **Commands (manual only)**: the exact `pnpm add` / `pnpm remove` commands for reference (`-D` or `--save-dev` for devDependencies).

Example:

```markdown
## Dependency Changes

### Add (dependencies)
- `react-router` (`packages/web/`) — client-side routing for the Web UI.

### Add (devDependencies)
- (none)

### Remove (dependencies)
- `consola` (root) — only used for startup box; replaced by `terminal-link` + `console.info`.

### Remove (devDependencies)
- (none)

### Commands (manual only)
pnpm remove consola
pnpm add react-router --filter web
```

**Dependency changes are manual-only.** Do not run `pnpm add`, `pnpm remove`, or similar install/uninstall commands unless the user explicitly asks. When implementation needs new or removed packages, document them in the plan’s **Dependency Changes** section (or add that section to the spec before coding) and let the user run the commands. Do not edit `package.json` dependency fields or `pnpm-lock.yaml` yourself to simulate an install.

**Persist plans after execution.** Once implementation is done, write the finalized plan into `specs/plans/` so it is versioned in the repo. Use the next sequential number and a short slug joined by hyphens, for example `002-clickable-cli-url.md`. The committed plan should match what was actually shipped—update goals, dependency changes, and verification steps if they diverged during implementation. Do not leave execution-only plans in ephemeral locations when the work is complete.

## Tooling

- Use `pnpm` for all package operations.
- The expected package manager is `pnpm ^11.9.0`.
- The expected runtime is `node ^24.18.0`.
- Do not add JavaScript dependencies with `npm` or `yarn`.
- Web UI dependencies belong in `packages/web/package.json`, not the root package.
- Shared versions for workspace packages are defined under `catalog` in `pnpm-workspace.yaml` (`@types/node`, `tailwindcss`, `typescript`).
- **Agents must not install or uninstall dependencies automatically.** If a task requires dependency changes, stop and record them in the spec (`specs/plans/` **Dependency Changes** section): what to add, what to remove, whether each item is a `dependency` or `devDependency`, which package owns it, and the manual `pnpm` commands. Proceed with code only after the user has run those commands (or explicitly asks you to run them).

## TypeScript

- Root `tsconfig.json` — CLI and root config files; `"exclude": ["packages"]`.
- `packages/web/tsconfig.json` — solution-style root; references `tsconfig.app.json` and `tsconfig.node.json`; `@/*` → `./src/*`.
- `packages/web/tsconfig.app.json` — Web UI source (`jsx: react-jsx`, DOM lib, `types: ["vite/client"]`, `include: ["src"]`).
- `packages/web/tsconfig.node.json` — Vite config (`include: ["vite.config.ts"]`).

## Common Commands

### CLI (repo root)

- `pnpm run build` — builds `dist/cli/` and `dist/web/`.
- `pnpm run build:cli` — CLI bundle only (`tsdown`).
- `pnpm run build:web` — `pnpm run --filter web build` → `dist/web/`.
- `pnpm run dev:cli` — CLI watch mode (run `build:web` once first).
- `pnpm run lint` / `pnpm run lint-fix` — ESLint (whole repo).
- `pnpm run test` / `pnpm run test:dev` / `pnpm run test:coverage` — Vitest.

### Web UI (`packages/web` / filter name `web`)

Prefer root scripts (delegate to the workspace package):

- `pnpm run dev:web` — Vite dev server (default `http://localhost:5173`).
- `pnpm run build:web` — `tsc -b` then production build into repo-root `dist/web/`.

Equivalent scripts in `packages/web/`: `dev`, `build`.

### shadcn/ui

Project config: [`packages/web/components.json`](packages/web/components.json) (`style: base-luma`, `@base-ui/react`, lucide icons).

Add or update components from `packages/web/`:

```bash
pnpm dlx shadcn@latest add <component>
```

Generated components land in `packages/web/src/components/ui/`. ESLint ignores that directory—do not hand-edit generated files unless fixing a specific bug.

Agent skills for shadcn live in [`.agents/skills/shadcn/`](.agents/skills/shadcn/SKILL.md) and [`.agents/skills/migrate-radix-to-base/`](.agents/skills/migrate-radix-to-base/SKILL.md). Read the relevant skill before shadcn CLI or migration work.

Reference docs (for agents):

- https://vite.dev/llms.txt
- https://reactrouter.com
- https://ui.shadcn.com

## Code Style

- Write TypeScript using ESM syntax.
- In TypeScript source files, omit `.js` extensions for local relative imports.
- Avoid meaningless blank lines; use blank lines to separate semantic blocks, not after every statement. Keep a blank line before `return`.
- Keep strict TypeScript settings satisfied; avoid weakening types to silence errors.
- **CLI**: use `cac` for command parsing; `terminal-link` for clickable URLs; `console.info` for startup messages.
- **CLI server**: use `hono` with `@hono/node-server`; `serveStatic` from `dist/web/` (resolved inline in `startWebUiServer()`).
- **Web UI**: configure Vite in `packages/web/vite.config.ts`; React Compiler via `@rolldown/plugin-babel` + `reactCompilerPreset()` from `@vitejs/plugin-react`; Tailwind via `@tailwindcss/vite` and imports in `src/main.css`.
- **Web UI routing**: use React Router (`react-router` in `packages/web/`); define routes under `packages/web/src/` and mount the router from `main.tsx`.
- **Web UI imports**: use `@/` path alias (`@/components/ui/...`, `@/lib/utils`).
- **Web UI styling**: shadcn theme tokens and `@layer base` rules live in `src/main.css`; use `cn()` from `@/lib/utils` for conditional classes.
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
- Husky runs `lint-staged` on pre-commit and `commitlint` on commit-msg.

## Before Finishing

- For code changes, run at least `pnpm run lint` when practical.
- Run `pnpm run build` when changing build settings or layout.
