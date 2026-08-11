# Establish Vitest Testing Foundation

## Status

`completed`

## Goal

Establish Vitest as the repository's standard runner for existing non-E2E automated tests.

## Detail

Replace the current temporary compilation and `node:test` workflow with direct TypeScript test execution through Vitest. Preserve the existing behavioral coverage across main-process domain code, SQLite-backed repository behavior, and renderer pure logic while creating a stable command contract for future non-DOM functional tests.

Keep this foundation deliberately narrow. It must improve local test execution without launching Electron, introducing browser or DOM simulation, changing production behavior, or coupling tests to the application build.

## Scope

- Add the evaluated Vitest development dependency compatible with the repository's Node.js, Vite, and TypeScript versions.
- Configure a Node-based test environment for both main-process modules and renderer pure logic.
- Migrate all five existing test suites from `node:test` to the Vitest runner without changing their behavioral intent.
- Provide separate one-shot and watch-mode package commands.
- Verify the migrated suites, type checking, linting, and the application production build.

## Out of Scope

- Electron end-to-end tests or launching the application during verification.
- React DOM, component, browser, screenshot, accessibility-tree, or visual tests.
- `jsdom`, Testing Library, Playwright, WebdriverIO, or another test runner.
- Coverage thresholds, coverage reporters, or coverage-specific dependencies.
- CI, release workflow, or packaging workflow changes.
- New production behavior or additional functional test scenarios beyond preserving the existing suites.
- Running tests implicitly as part of `pnpm build`.

## Decisions

- Use Vitest `4.1.10`, evaluated on 2026-08-11 as compatible with Node.js 24, Vite 7, TypeScript, the repository's package model, and its license.
- Keep the initial Vitest environment Node-only; DOM and real-browser testing remain separate future outcomes.
- Migrate every current suite so the repository does not retain parallel Vitest and `node:test` conventions.
- Preserve the existing tests' behavioral assertions rather than expanding application coverage in this plan.
- Keep one-shot test execution, watch mode, and application build as independent commands.

## Tasks

- [x] [Task 001: Establish Vitest Runner and Migrate Existing Suites](./task001_establish-vitest-runner-and-migrate-existing-suites.md)
