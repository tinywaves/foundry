# Task 001: Establish Database-Backed Application Settings

## Status

`completed`

## Goal

Establish database-backed, type-safe, and process-isolated application settings that later tasks can use to restore and update Foundry's application color mode.

## Detail

Extend the existing Foundry database from schema version 3 to version 4 through the established ordered, transactional `PRAGMA user_version` migration mechanism. Preserve every existing Provider, Runtime Application, Prompt, and Prompt Version row. Add an `application_settings` table with a fixed singleton identity and a constrained `color_mode` column that accepts only `light`, `dark`, or `system`.

Do not materialize a default row during migration or read operations. When the singleton row is absent, the Settings repository returns an application settings snapshot whose `colorMode` is `system`. Updating the color mode validates the input and upserts the singleton row so a later read returns the latest persisted value. Use an explicit singleton record rather than an untyped general-purpose key/value store; future settings may extend the owned model through reviewed migrations without letting the renderer invent arbitrary setting keys or values.

Add a renderer-safe shared Settings contract that owns the supported application color modes, the application settings snapshot, purpose-specific IPC channel names, discriminated result and error types, and the narrow Settings API. Expose only two operations: read the complete application settings snapshot and update the application color mode. Keep the update operation specific to the approved setting instead of exposing a generic patch or key/value mutation surface.

Add a Settings repository under a Settings-owned main-process module. It owns all Settings SQL, maps an absent row to the System default, validates stored rows before returning them, rejects unsupported update input before mutation, and maps malformed stored data or SQLite failures to stable non-sensitive Settings operation errors. An invalid stored value is corruption, not an absent preference, and must not silently resolve to System. Although Plan 029 does not add dedicated renderer error interaction, the process boundary must still return typed failures without throwing sensitive database details across IPC.

Add a Settings subsystem beside the existing Prompt, Provider, and Runtime subsystems. It receives the shared database or a mapped storage-initialization failure, constructs one repository-backed IPC controller when storage is available, and returns the mapped storage error from every Settings operation when initialization failed. Integrate it into `FoundrySubsystem` initialization, application-window registration, and shutdown without changing the lifecycle of the other subsystems.

The Settings IPC controller accepts requests only from the main frame of explicitly registered Foundry application windows. It registers only the approved read and color-mode update handlers, rejects untrusted senders through the stable result contract, and removes every owned handler and trusted window identifier during disposal. Validate all update input again in the main process even though the renderer and preload are typed.

Extend `globalThis.api` through preload with the narrow Settings API and update the aggregate `FoundryApi` type. Do not expose `ipcRenderer`, channel selection, database objects, SQL, Electron APIs, filesystem paths, or a generic Settings mutation method. Keep the preload transport consistent with the existing asynchronous `ipcRenderer.invoke` result pattern.

Add focused Vitest coverage for the schema and repository. Extend database verification to prove that a version 3 database upgrades to version 4 without changing existing Provider, Runtime Application, Prompt, or Prompt Version data. Cover the complete new schema, the non-materialized System default, persistence of each supported mode, repeated updates of the singleton row, rejection of invalid input without mutation, and invalid stored-data handling. Verify subsystem wiring, trusted-main-frame enforcement, handler disposal, aggregate types, and preload scope through type checking and focused static inspection consistent with the repository's existing IPC test coverage.

Expected file-level impact is limited to the database migration and tests, new Settings-owned main-process modules, a new shared Settings contract, the aggregate Foundry subsystem and API types, and the preload bridge. Do not modify renderer startup, Theme ownership, routes, navigation, or UI in this task.

## Findings

None.

## Dependencies

None.

## Deliverables

- A transactional Foundry schema version 4 migration with constrained singleton application-settings persistence.
- A Settings repository with System default resolution, supported-mode persistence, stored-row validation, and stable error mapping.
- Shared application color-mode, settings snapshot, result, error, channel, and API contracts.
- A Settings subsystem and trusted-main-frame IPC controller integrated into the Foundry lifecycle.
- A narrow `globalThis.api.settings` preload surface with purpose-specific read and color-mode update methods.
- Focused migration and repository behavior tests using the existing Vitest and SQLite foundations.

## Acceptance Criteria

- [x] A version 3 Foundry database upgrades transactionally to version 4 without changing existing Provider, Runtime Application, Prompt, or Prompt Version data, and a new database receives the complete schema in migration order.
- [x] The application-settings schema permits only the singleton identity and the supported `light`, `dark`, and `system` color-mode values.
- [x] Reading an absent application-settings row returns `system` without inserting or otherwise materializing a default row.
- [x] Updating to each supported color mode persists that value, repeated updates reuse the singleton row, and subsequent reads return the latest stored value.
- [x] Unsupported update input is rejected at the authoritative main-process boundary without changing persisted settings.
- [x] Invalid stored Settings data is reported as corruption rather than treated as an absent value or silently converted to `system`.
- [x] Settings storage, input, untrusted-sender, and internal failures return stable non-sensitive result objects without exposing SQL or raw database errors.
- [x] Settings IPC accepts only its purpose-specific methods from registered application-window main frames and removes its handlers and trust state during shutdown.
- [x] A Settings storage-initialization failure leaves the other Foundry subsystems available while Settings methods return the mapped storage failure.
- [x] The preload exposes only typed Settings read and color-mode update methods and never exposes arbitrary IPC, SQLite, SQL, filesystem, Electron, or database-driver access.
- [x] Focused tests, type checking, linting, the production build, diff validation, and planned static security inspections pass without launching the application or using visual automation.

## Out of Scope

- Renderer Settings state, application startup preference restoration, or root Theme control.
- The Settings route, sidebar entry, full-window page, navigation behavior, Appearance group, or segmented control.
- Dedicated database-error banners, retry actions, rollback interaction, or other storage-failure UX.
- Data, Export, Import, another setting, or a generic dynamic Settings registration system.
- New dependencies, packaging changes, a new test framework, or visual-test infrastructure.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 002 will consume the typed `globalThis.api.settings` read and color-mode update operations to restore the persisted preference during renderer startup and establish controlled application-wide theme state.

## Verification

- `pnpm exec vitest run src/main/settings/settings-repository.test.ts src/main/storage/foundry-database.test.ts` passed 2 test files and 10 tests.
- `pnpm test` passed all 24 test files and 151 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that schema version 4 adds only the constrained singleton `application_settings` table and that the version 3 migration test preserves Provider, Runtime Application, Prompt, and Prompt Version data.
- Static inspection confirmed that Settings IPC registers only read and color-mode update handlers, validates registered-window main frames, and clears handlers and trust state on disposal.
- Static inspection confirmed that preload exposes only the typed Settings methods and that the renderer and shared Settings contract do not import Electron, SQLite, SQL, filesystem, or arbitrary IPC capabilities.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
