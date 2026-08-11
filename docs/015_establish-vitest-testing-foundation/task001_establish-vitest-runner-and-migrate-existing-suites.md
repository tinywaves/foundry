# Task 001: Establish Vitest Runner and Migrate Existing Suites

## Status

`completed`

## Goal

Establish a directly runnable Vitest entry point and migrate all five existing test files and their 31 test cases to that runner without changing application behavior or test intent.

## Detail

Install Vitest as a development dependency through the repository's required unversioned `pnpm add vitest -D` command. The evaluated version is `4.1.10`, so the expected manifest range is `^4.1.10`; `pnpm-lock.yaml` must capture the resolved dependency graph. Keep Vitest entirely outside the packaged Electron runtime.

Add a root Vitest configuration that explicitly selects the Node environment and includes only `src/**/*.test.ts`. Keep Vitest globals disabled so every test API remains visible through imports. Do not configure a DOM environment, browser provider, coverage reporter, setup file, alias, or worker override without a demonstrated requirement from the current suites. Include the Vitest configuration in the Node TypeScript project's checked files so configuration errors are caught by the existing type-check command.

Add separate package commands for one-shot and watch execution. `pnpm test` must use Vitest run mode and return a non-zero exit code when discovery or a test fails. `pnpm test:watch` must use Vitest's interactive watch mode and remain independent from `pnpm build`; it may be invoked with Vitest's run flag during automated verification to prove the command contract without leaving a process running.

Migrate the five existing test files by replacing their `node:test` runner import with an explicit Vitest `test` import. Remove the leading `void` from each test registration because Vitest's `test` API already returns `void`; retaining the old wrapper is meaningless and violates the repository's lint rules. Preserve the existing test names, case boundaries, inputs, asynchronous behavior, cleanup, and assertions. Continue using the standard-library `node:assert/strict` assertion API because replacing correct assertions with Vitest `expect` calls would add broad mechanical churn without improving the runner migration. Using Node assertions does not retain a second test runner.

The repository suite must continue covering main-process Provider avatar validation, connection testing, SQLite repository behavior, renderer Provider form logic, and renderer TanStack Query logic in the Node environment. The installed package-managed Node.js runtime already loads the current `better-sqlite3` binding successfully, so the repository suite does not require Electron execution or a native-module rebuild strategy.

Do not modify production source, Electron Vite configuration, application lifecycle, preload or IPC boundaries, release automation, or existing behavioral expectations. Verification must not launch the application or use browser, screenshot, accessibility-tree, or desktop automation.

## Findings

None.

## Dependencies

### `vitest`

- Purpose: Provide direct TypeScript test discovery, execution, failure reporting, and watch mode for the repository's existing non-E2E suites.
- Selected version: `^4.1.10`, resolved by the repository-required unversioned install command while `4.1.10` is the current release.
- Module format: ESM with explicit package exports.
- TypeScript: Bundled declarations through `./dist/index.d.ts`; Vite-backed transformation supports the current TypeScript source directly.
- Compatibility: Supports Node.js `^20.0.0 || ^22.0.0 || >=24.0.0` and Vite `^6.0.0 || ^7.0.0 || ^8.0.0`, covering the repository's package-managed Node.js 24.18.x runtime, Vite 7.x, TypeScript 5.9.x, and CommonJS package manifest.
- Maintenance: Version `4.1.10` was published on 2026-07-06 and is the current official release as of the evaluation date.
- Adoption: The official npm downloads API reported 89,744,366 downloads for 2026-08-03 through 2026-08-09.
- Security and license: MIT licensed; the OSV API reported no known direct vulnerability for `vitest@4.1.10` on 2026-08-11. It is development-only, does not enter the Electron runtime bundle, requires no install-time browser download or native module, and its direct package reports approximately 1.9 MB unpacked.
- Alternatives: The stable built-in `node:test` runner avoids a dependency but currently requires temporary TypeScript compilation because the repository's CommonJS package mode cannot execute these TypeScript ESM imports directly. Jest `30.4.2` is maintained, widely adopted, Node 24 compatible, MIT licensed, and had no direct OSV advisory when checked, but it would introduce a transformation and resolution stack separate from the existing Vite toolchain and does not match the confirmed Vitest goal.
- Sources checked: Official npm registry metadata and downloads API, official Vitest documentation and Vitest 4 migration guide, official Node.js 24 test-runner documentation, and the OSV API on 2026-08-11.

## Deliverables

- Root Node-only Vitest configuration included in existing Node configuration type checking.
- Independent one-shot and watch-mode package scripts.
- Updated dependency manifest and lockfile containing only the approved new test dependency and its resolved development graph.
- Five existing test files registered through Vitest while preserving all 31 existing test cases and their standard-library assertions.
- A stable command and file-discovery convention for future non-DOM functional tests under `src/`.

## Acceptance Criteria

- [x] `pnpm test` directly discovers and passes all five existing test files and all 31 existing test cases without temporary compilation or Electron execution.
- [x] No source test imports `node:test`, and every current test case is registered through an explicit Vitest API import.
- [x] Main-process Provider logic, SQLite repository behavior, renderer form logic, and renderer query logic all execute in the configured Node environment.
- [x] `pnpm test:watch` provides an independent watch-mode entry point that can also complete in run mode for automated command verification.
- [x] Vitest configuration is included in the Node TypeScript project and limits discovery to TypeScript tests under `src/`.
- [x] Vitest is the only new direct dependency; no DOM, browser, E2E, coverage, or alternate-runner dependency is added.
- [x] Production source, Electron Vite configuration, build command behavior, application behavior, and release automation remain unchanged.
- [x] Tests, type checking, linting, the production build, diff validation, and static scope inspection pass.

## Out of Scope

- Rewriting working `node:assert/strict` assertions to Vitest `expect` assertions.
- Adding or changing application test scenarios beyond preserving the current 31 cases.
- DOM simulation, React component rendering, real-browser testing, or Electron end-to-end testing.
- Coverage collection, thresholds, reporters, snapshots, fixtures, or a shared test utility layer.
- CI, release, packaging, or application build integration.
- Production source, renderer aliases, Electron process boundaries, persistence behavior, or native-module build changes.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or visual acceptance.

## Handoff

Completion closes Plan 015 with Vitest as the single repository test runner, direct one-shot and watch commands, and preserved Node-based coverage for the existing main-process and renderer pure-logic behavior. Future React DOM, coverage, CI, or Electron E2E work remains independently reviewable and requires a separate plan.

## Verification

- `pnpm test` passed all 5 test files and 31 test cases under Vitest 4.1.10 in the Node environment.
- `pnpm test:watch --run` passed the same 5 files and 31 cases through the watch-script command contract without leaving a process running.
- `pnpm typecheck` passed both the node and web TypeScript projects, including `vitest.config.ts` through `tsconfig.node.json`.
- `pnpm lint` passed with only the repository's existing package-manager and upstream ESLint deprecation warnings.
- `pnpm build` passed the full typecheck and Electron Vite production build for main, preload, and renderer; the renderer transformed 2,418 modules.
- Static searches found no `node:test` or `void test(` usage under `src/` and counted 31 explicit Vitest registrations across the five migrated files.
- Dependency inspection confirmed `vitest@4.1.10` as the only new direct dependency and no added DOM, browser, E2E, coverage, or alternate-runner package. The existing peer warnings resolve through the pre-existing ESLint dependency graph rather than Vitest.
- An additional `pnpm audit --audit-level high` reported 18 advisories in packages already present before this task. Vitest adds a dependency path through the existing Vite installation to its already locked `nanoid` version but introduces none of the advisory-bearing package versions; remediation is outside this task's independently reviewable outcome.
- `git diff --check` passed. Static scope inspection confirmed no production source, Electron Vite configuration, build command behavior, release workflow, application lifecycle, preload, IPC, or persistence change.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
