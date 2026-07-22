# Repository Guidelines

## Project Overview

`@dhzh/foundry` is an AI-native local developer runtime for tools, skills,
agents, and workflows. It is published as a CLI-only package containing
`bin/`, `dist/cli/`, and `dist/web/`.

The CLI is built with `cac`, Hono, and `@hono/node-server`. The private
`packages/web/` workspace is a React 19 application built with Rsbuild 2 and
React Compiler.

## Instruction Scope

- This is the repository's single agent guidance file.
- It applies to the root CLI, the `packages/web/` workspace, build
  configuration, tests, documentation, and generated output.
- Keep developer commands and project documentation rooted at the repository
  level rather than duplicating them inside workspace packages.

## Layout

- `pnpm-workspace.yaml` - pnpm workspace definition and shared dependency
  catalog.
- `src/cli/` - `cac` entrypoint and Hono static server.
- `packages/web/` - private Rsbuild + React workspace package named `web`.
- `packages/web/src/index.tsx` - browser entrypoint and React root mount.
- `packages/web/src/app.tsx` - root React component.
- `packages/web/rsbuild.config.ts` - React plugin, document title, and
  repository-level output path.
- `bin/index.js` - published executable wrapper importing
  `dist/cli/index.mjs`.
- `dist/cli/` - generated CLI bundle from tsdown.
- `dist/web/` - generated Web production build served by the CLI.
- Root config - TypeScript, ESLint, Vitest, Commitlint, Husky, and tsdown.

Do not manually edit generated files under `dist/`.

## Documentation

- Keep `README.md` and other root documentation aligned with the current
  implementation.
- Maintain a single source of truth for every rule, convention, command, and
  other piece of project guidance. Do not duplicate the same normative content
  across multiple files or sections.
- Define each topic completely in one canonical location. Other documentation
  may link to that location or provide a brief non-normative pointer, but must
  not restate content that would require synchronized maintenance.
- When updating documented guidance, identify and edit its canonical source
  rather than adding another copy elsewhere.

## Dependency Changes

- Never add, remove, upgrade, downgrade, or otherwise modify dependencies
  without the user's explicit approval.
- The user must personally execute every dependency-changing command. Never
  run package installation or removal commands, and never edit
  `package.json`, `pnpm-workspace.yaml`, or lockfiles to make a dependency
  change on the user's behalf.
- Before writing code that depends on a proposed dependency change, state the
  owning `package.json`, the reason for the change, and the exact `pnpm add`,
  `pnpm remove`, or other required command, then wait for the user to confirm
  that they have completed it.

## Implementation Plans

- Follow `specs/plans/README.md` as the single source of truth for where
  implementation plans are saved and how they are named and structured.

## Incremental Implementation And Review

- For substantial implementation tasks, split the work into small,
  independently reviewable slices with explicit checkpoints.
- Before each slice, state its goal, expected file scope, and verification
  approach.
- Implement one slice at a time, then report the changed files, test results,
  and remaining risks.
- Wait for the user's confirmation before starting the next slice. Do not
  implement the entire plan in one pass merely because a plan already exists.
- Keep each slice buildable or testable in isolation whenever practical, and
  avoid mixing unrelated refactors into a review slice.

## Capability Surfaces

- Every user-facing capability must be designed and implemented across the Web
  UI, CLI, and Skills as part of the same delivery slice. A capability is not
  considered complete when only one or two of these surfaces work.
- Put shared behavior, validation, and data access in an application service.
  The Web API route and the CLI command must call the same application service;
  this shared service boundary is mandatory and must not be bypassed.
- Organize CLI commands by domain module, with module commands owning their
  related subcommands and options.
- Define each Skill as a wrapper around one module-level CLI command. A Skill
  may expose that command's subcommands and options, but must not independently
  encapsulate the underlying feature, call repositories or storage directly, or
  duplicate business logic from the command's service.
- Keep the CLI command as the automation contract for Skills so the same
  capability remains available to people, scripts, and AI-driven workflows.
- For each capability slice, verify the complete path:
  `Web UI -> Hono API route -> application service` and
  `CLI -> module command -> application service`, followed by a Skill that
  wraps that module-level CLI command.

## Tooling

- Use `pnpm` for package operations; do not use npm or Yarn.
- Expected package manager: pnpm `^11.9.0`.
- Expected runtime: Node.js `^24.18.0`.
- Web dependencies belong in `packages/web/package.json`.
- Shared workspace versions belong in the `catalog` section of
  `pnpm-workspace.yaml`.
- ESLint is configured from the root `eslint.config.js` through
  `@dhzh/eslint-config`.

## TypeScript

- Root `tsconfig.json` covers CLI and root configuration files and excludes
  `packages/`.
- `packages/web/tsconfig.json` covers `src/` and `rsbuild.config.ts`.
- The Web package uses `jsx: react-jsx`, an ES2020 target, bundler module
  resolution, `noEmit`, and Rsbuild's client types.
- Keep strict typing intact. Do not weaken compiler settings or introduce
  broad casts merely to silence errors.
- Use TypeScript and ESM syntax. Omit `.js` extensions from local TypeScript
  imports.
- Prefer reusing existing variables and constants instead of repeating values
  or hardcoding domain-specific literals throughout logic.
- Extract a named variable or constant when a value is reused, carries
  meaningful domain intent, or should change consistently across call sites.
  Keep the declaration in the narrowest sensible shared scope.
- Use judgment rather than extracting mechanically. Leave obvious, local,
  one-off literals inline when naming them would add indirection without
  improving reuse, clarity, or maintainability.

## Common Commands

From the repository root:

- `pnpm run build` - build the CLI, then the Web UI.
- `pnpm run build:cli` - bundle `src/cli/index.ts` into `dist/cli/index.mjs`.
- `pnpm run build:web` - run the `web` workspace build into `dist/web/`.
- `pnpm run dev:cli` - run the CLI source in watch mode; build the Web UI
  first so static assets exist.
- `pnpm run dev:web` - start Rsbuild and open the Web UI at
  `http://localhost:3000`.
- `pnpm run lint` / `pnpm run lint-fix` - check or fix ESLint issues.
- `pnpm run test` / `pnpm run test:dev` / `pnpm run test:coverage` - run
  Vitest.

## Web UI

- Configure the build in `packages/web/rsbuild.config.ts`.
- Use `pluginReact({ reactCompiler: true })`; preserve React Compiler unless a
  task explicitly changes that architecture.
- Keep the production output at the repository-level `dist/web/` path because
  `src/cli/server.ts` serves that directory next to the bundled CLI.
- Mount the application from `packages/web/src/index.tsx`; keep application
  composition in `packages/web/src/app.tsx` or modules imported from it.
- Use Astryx components and the neutral theme. Import the Astryx reset, core,
  and theme styles from `packages/web/src/index.css`.
- Prefer the component library's small or compact size variants when they are
  available and remain usable. Use larger sizes only when the context,
  hierarchy, readability, accessibility, or touch-target requirements justify
  them.
- Design pages as a coherent extension of the component library. Follow its
  established visual language for layout, density, spacing, typography,
  colors, states, and interactions instead of introducing conflicting custom
  patterns.
- Use relative imports for local Web modules.
- Prefer accessible, semantic React components. Keep interactions keyboard
  usable and preserve visible focus states.
- Keep trivial handlers inline. Extract functions or components when logic is
  reused, grows beyond a simple expression, or becomes difficult to read.
- Use blank lines to separate semantic blocks, including a blank line before
  `return`; avoid decorative whitespace.

Reference documentation:

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt

## CLI Design

`src/cli/` is a local executable, not a reusable library.

- Use `cac` for command parsing, `terminal-link` for clickable URLs, and
  `console.info` for startup messages.
- Keep `startWebUiServer()` direct and linear.
- Serve files from `dist/web/` through Hono and `serveStatic`.
- Keep the default server on `127.0.0.1:7777` unless the task changes its
  public behavior.
- On fatal startup errors, print an installed-user-facing message with
  `console.error` and exit with status 1.
- Export only what another source file currently needs.

## Tests

Vitest is configured to pass when no tests exist. Add focused tests under
`test/` when behavior warrants coverage, especially for shared logic or CLI
behavior.

## Commits

- Use English Conventional Commit messages.
- Commitlint extends `@commitlint/config-conventional`.
- Husky runs `lint-staged` before commits and commitlint on commit messages.

## Before Finishing

- Review the diff for stale paths, commands, and framework references.
- Run `pnpm run lint` for code changes when practical.
- Run `pnpm run build` when changing CLI/Web integration, build configuration,
  or production output behavior.

<!-- ASTRYX:START -->
Astryx v0.1.7 · 90+ components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   90+ components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
