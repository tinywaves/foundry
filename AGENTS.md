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
- `specs/plans/` - numbered implementation plans and design history.
- Root config - TypeScript, ESLint, Vitest, Commitlint, Husky, and tsdown.

Do not manually edit generated files under `dist/`.

## Documentation

Implementation plans use a global sequence and module prefix:

- Filename: `NNN-<module>-<slug>.md`
- Title: `# NNN — <module> · <Short name>`

Existing modules include `layout`, `tools`, `cli`, and `web`. Add a short,
lowercase module when none of those fits.

Before starting a feature or refactor, read the relevant plan when one exists.
Some plans describe earlier Web implementations, so verify them against the
current source and root documentation. Update or add a plan so the versioned
result matches what was actually shipped.

Every plan that changes dependencies must include a **Dependency Changes**
section with:

- Add and remove lists split into dependencies and devDependencies.
- The owning `package.json` when it is not obvious.
- A one-line reason for every package.
- Exact manual `pnpm add` or `pnpm remove` commands.

Dependency changes are manual-only. Do not run install or uninstall commands,
edit dependency fields, or update `pnpm-lock.yaml` unless the user explicitly
asks. Record the required changes in the plan and wait for the user to apply
them before writing code that depends on those packages.

## Tooling

- Use `pnpm` for package operations; do not use npm or Yarn.
- Expected package manager: pnpm `^11.9.0`.
- Expected runtime: Node.js `^24.18.0`.
- Web dependencies belong in `packages/web/package.json`.
- Shared workspace versions belong in the `catalog` section of
  `pnpm-workspace.yaml`.

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
- The current Web package does not include a router, CSS framework, component
  library, or `@/` path alias. Do not assume the removed Vite/shadcn structure
  still exists.
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
