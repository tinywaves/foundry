# Task 001: Establish the Skills Domain and Persistence Foundation

## Status

`completed`

## Goal

Create the pure domain model and transactional metadata foundation required by every local Skills workflow.

## Findings

- Distribution Name collision keys use Unicode NFC normalization plus locale-independent lowercase while preserving the original name for display and filesystem use.
- Distribution Names and relative package paths apply cross-platform path-safety constraints before later filesystem containment checks.
- Missing target observation takes precedence over Store availability because it is a complete observation of the installation location; unreadable facts remain explicitly unavailable.
- `S = T != D` is Diverged because matching current bytes do not manufacture a Distribution Record.
- Composite foreign keys require every Distribution Record's Installation, Skill Revision, fingerprint, and Package ID to describe one package.
- Uninstall releases the active target-name constraint while retaining the Installation row and its Distribution Records.

## Dependencies

None.

## Work

Add `src/shared/skill-contract.ts` as the renderer-safe source of Skill IDs, target kinds, Store observations, installation facts, derived states, command inputs, result unions, and IPC channel names. Keep authoritative input parsing in `src/main/skills/skill-validation.ts`. Use UUIDs for package, revision, target, installation, distribution-record, and watch-session identities. Treat Distribution Name as a stable single path segment; normalize a separate comparison key for collision detection without changing its displayed value.

Add pure `deriveInstallationState` behavior under `src/shared/` or a renderer-independent Skills domain module. It must accept explicit Store, distribution, and target observations and return Synced, Outdated, Drifted, Diverged, Missing, or an unreadable/unknown result. Exhaustively test every equality branch, absent target, absent distribution baseline, unreadable content, and impossible fact combination.

Extend `src/main/storage/foundry-database.ts` from schema version 4 to version 5 using the existing ordered immediate-transaction migration mechanism. Add normalized tables for:

- Skill Packages and current Store observation facts.
- Immutable Skill Revisions with a per-package sequence, fingerprint, creation reason, and creation time.
- Distribution Targets with adapter kind, display metadata, configured path, resolved physical path, scan policy, and custom/built-in ownership.
- Skill Installations tying one package and one target to a stable directory name, current target observation facts, and an active or uninstalled lifecycle.
- Append-only Distribution Records tying an installation to the exact revision and fingerprint adopted or distributed.

Use foreign keys, check constraints, and indexes for package lists, target lists, revision history, and installation lookup. Allow duplicate Distribution Names in the Store. Enforce uniqueness only for the normalized occupied name among active installations within one physical target. Retain uninstalled rows and their Distribution Records as internal lifecycle facts. Do not add remote source tables until the remote Discover plan needs their actual contracts.

Add a Skills-specific operation error that maps validation, storage, filesystem, conflict, unavailable-content, and internal failures to non-sensitive API errors. Errors and logs may identify stable IDs and operation names but must not contain file contents, manifest contents, or complete caller payloads.

Update database tests to prove that a schema version 4 database containing Providers, Runtime Applications, Prompts, Prompt Versions, and Application Settings upgrades without changing existing rows. Verify new-database table creation, rollback on migration failure, future-version rejection, constraints, and indexes.

## Deliverables

- Shared Skill contracts and pure derived-state model.
- Main-process Skill validation and stable errors.
- Schema version 5 with all local Skills metadata tables.
- Migration, constraint, and state-matrix tests.

## Acceptance Criteria

- [x] The state model derives every user-facing installation state from facts and persists none of the five state labels.
- [x] Duplicate Store Distribution Names are accepted while two active installations cannot occupy the same normalized name in one target.
- [x] Every identifier, relative path, Distribution Name, scan depth, and command payload is authoritatively validated in the main process.
- [x] Schema version 4 upgrades transactionally to version 5 without changing any existing domain row.
- [x] Malformed stored rows and impossible fact combinations fail with stable non-sensitive errors.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out of Scope

- Reading, copying, hashing, watching, or mutating Skill directories.
- Target adapter resolution and seed data.
- IPC handlers, preload methods, and renderer UI.

## Handoff

Task 002 consumes the stable schema and fact model to implement canonical package content and revisions.

## Verification

- `pnpm test` passed 30 test files and 179 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and all main, preload, and renderer production builds.
- Focused Skills tests passed 5 test files and 27 tests.
- Static inspection confirmed that derived installation states are absent from SQLite, Store names may duplicate, active target names cannot collide, and Distribution Records cannot cross package identity.
- The application was not launched and no visual automation was performed.
