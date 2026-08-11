# Task 001: Establish SQLite Runtime Application State and Provider Guardrails

## Status

`completed`

## Goal

Establish the persisted Runtime application-state foundation in the existing `foundry.sqlite` database so later tasks can read the management state of Codex and Claude Code and authoritatively prevent deletion of an In-use Provider.

## Detail

Move ownership of the shared SQLite connection, ordered migrations, schema-version validation, consistency checks, and shutdown out of `ProviderSubsystem` and into a neutral Foundry main-process storage boundary. Provider and Runtime subsystems will share this one database connection; the renderer will not receive direct database access, arbitrary IPC, or filesystem capabilities. Database initialization failures will remain recoverable at the application level and will be translated into non-sensitive Provider and Runtime API errors.

Rename the database-level schema version to reflect Foundry-wide ownership and advance it from version 1 to version 2. Preserve the existing Provider migration as version 1, then add a transactional version 2 migration for a `runtime_applications` table with the following persisted fields and constraints:

- `runtime`: the primary key, restricted to `codex` and `claude-code`, which guarantees at most one successful application state per Runtime.
- `target_kind`: restricted to `provider` and `official-default`.
- `provider_id`: a nullable foreign key to `providers.id`; it is required for a `provider` target and must be null for `official-default`.
- `applied_at`: a non-negative timestamp for the most recent successful Foundry operation.

The absence of a row represents `Not managed by Foundry`; no seed rows or synthetic Providers will be created. Runtime reads will always synthesize the fixed Codex and Claude Code entries and return a discriminated state for each entry: `not-managed`, `provider` with `providerId` and `appliedAt`, or `official-default` with `appliedAt`. Stored rows will be validated before they cross the repository boundary, and invalid associations will be reported as non-sensitive storage corruption.

Add a dedicated Runtime contract, repository, error mapping, IPC controller, and subsystem. Expose only a purpose-specific `runtimes.listRuntimes()` read capability through preload and the aggregate `FoundryApi`. Keep successful-state mutation methods internal to the main process: one records a successfully applied Provider and one records a successful restoration to Official Default. Recording a Provider target must atomically verify that the Provider exists, is active, and belongs to the requested Runtime before upserting the Runtime row. These methods establish the handoff for the later Apply implementation but are not callable by the renderer in this task.

Project Runtime ownership into every `ProviderSummary` as `isInUse`, derived from the Runtime association rather than persisted as a Provider-owned boolean. Provider list, detail, create, update, and saved-connection-test responses will therefore continue to return a complete and current summary. Update `deleteProvider` so its existing immediate soft-delete transaction first checks the Runtime association. If the Provider is In use, return the existing `conflict` error and leave the Provider unchanged; otherwise preserve the current soft-delete behavior. This backend rule remains authoritative even when the renderer is stale or bypasses its future disabled state.

Persist only the last successful Runtime association. A failed Apply target and its failure-only `Retry Apply` action will remain in renderer memory in later tasks. If Foundry restarts after an In-use Provider edit was saved but its Apply failed, the same Provider remains reported as In use, the external Agent configuration may still contain the Provider's earlier values, and the previous failure or Retry action is not restored. Normal-state Re-apply and reconciliation of that condition belong to a later plan.

## Findings

None.

## Dependencies

None.

## Deliverables

- A neutral Foundry SQLite lifecycle and migration boundary shared by Provider and Runtime subsystems.
- The version 2 `runtime_applications` schema and a compatible version 1 upgrade path.
- A validated Runtime state repository with main-process-only successful-state transition methods.
- A typed Runtime read contract exposed through constrained IPC and preload APIs.
- Runtime-derived `isInUse` data in Provider summaries.
- Authoritative backend protection against deleting an In-use Provider.
- Focused migration, repository, contract, error, and Provider guardrail coverage.

## Acceptance Criteria

- [x] A new database applies the Provider and Runtime migrations in order and finishes at Foundry schema version 2.
- [x] An existing schema version 1 database upgrades to version 2 without changing or losing existing Provider data.
- [x] A database created by a future Foundry version is rejected without modification.
- [x] With no persisted Runtime rows, the read API returns fixed Codex and Claude Code entries in the `not-managed` state.
- [x] Recording a successful Provider application changes only the matching Runtime to the `provider` state and projects `isInUse: true` onto that Provider's summaries.
- [x] Recording another Provider or Official Default for a Runtime removes the previous Provider's In-use projection.
- [x] A missing, soft-deleted, or Runtime-mismatched Provider cannot be recorded as a successful Runtime target.
- [x] Deleting an In-use Provider returns `conflict`, does not soft-delete it, and leaves the Runtime association unchanged.
- [x] Deleting a Provider that is not In use retains the existing transactional soft-delete behavior.
- [x] The renderer can read Runtime summaries but has no exposed IPC capability to record a successful application state.
- [x] Provider and Runtime APIs return non-sensitive errors when shared storage is unavailable, corrupt, or from an unsupported future version.
- [x] Existing Provider behavior and automated coverage remain passing after the storage ownership change.

## Out of Scope

- The Runtimes page, Provider-card In-use Token, or any other renderer UI.
- Provider selection, Apply confirmation, failure feedback, or Retry Apply interaction.
- Reading, previewing, writing, backing up, validating, or restoring Codex or Claude Code configuration files.
- Persisting or restoring failed Apply targets or Retry Apply state.
- Save-then-Apply orchestration for edits to an In-use Provider.
- Normal-state Re-apply, configuration drift detection, or third-party reconciliation.
- Executing Apply or Restore Official Default against an Agent Runtime.

## Handoff

Task 002 will consume `runtimes.listRuntimes()`, Runtime-derived Provider `isInUse` summaries, and the authoritative deletion conflict to build the Runtime selection and In-use experience. Task 004 will consume the internal successful-state transition methods only after its external configuration operation succeeds.

## Verification

- `pnpm test` - Passed 7 test files and 39 tests.
- `pnpm typecheck` - Passed Node and Web TypeScript checks.
- `pnpm lint` - Passed with pre-existing ESLint configuration deprecation notices.
- `pnpm build` - Passed main, preload, and renderer production builds.
- `git diff --check` - Passed.
