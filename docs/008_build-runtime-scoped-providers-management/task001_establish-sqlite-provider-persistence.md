# Task 001: Establish SQLite Provider Persistence

## Status

`completed`

## Goal

Establish versioned SQLite persistence and a constrained, typed Provider API so later tasks can manage runtime-scoped custom Providers without direct renderer access to Electron, SQLite, or the filesystem.

## Detail

Add `better-sqlite3` as the main-process SQLite driver and `@types/better-sqlite3` as its development-only TypeScript declarations. Install both with the repository-required unversioned pnpm commands so the current releases recorded below are resolved through `pnpm-lock.yaml`. Keep database access behind a Foundry-owned repository adapter so application code does not depend on driver-specific objects outside the persistence boundary.

Store the database at `path.join(app.getPath('userData'), 'foundry.sqlite')`. Initialize the Provider subsystem after Electron is ready, before Provider IPC is served. Configure the connection with WAL journaling, foreign-key enforcement, and a bounded busy timeout. Close the connection during application shutdown.

Manage schema evolution with an ordered migration list and `PRAGMA user_version`. Each migration will execute transactionally. Reject a database version newer than the application supports, roll back failed migrations, run a SQLite quick consistency check after initialization, and never delete, reset, downgrade, or overwrite an unreadable database automatically. If initialization fails, keep the rest of Foundry running and expose a stable Provider storage error through the Provider API.

The initial migration will create one `providers` table with these responsibilities:

- `id`: immutable UUID text primary key generated in the main process with `crypto.randomUUID()`.
- `runtime`: constrained to `codex` or `claude-code` and immutable after creation.
- `provider_source`: constrained to `user-custom` or `foundry-built-in`; all creation APIs in this task write `user-custom`.
- Common configuration: `name`, `base_url`, nullable plaintext `api_key`, nullable `remark`, and nullable `official_website`.
- Avatar data: nullable `avatar_mime_type` and nullable `avatar_data` BLOB with a constraint requiring both to be present or absent together.
- Model data: `model_config_version` and valid `model_config_json`.
- Connection summary placeholders: `connection_status`, nullable `last_tested_at`, and nullable `last_test_error`; new rows start as `never-tested`, while connection-test behavior remains deferred to Task 004.
- Lifecycle timestamps: `created_at`, `updated_at`, and nullable `deleted_at`, stored as Unix milliseconds.
- An index supporting active runtime lists ordered by `created_at DESC`.

Deletion is a complete soft delete. It sets `deleted_at` and `updated_at` while retaining the entire row, including the plaintext API key, avatar BLOB, model configuration, and connection summary. Normal list, detail, update, avatar, and delete operations filter to active rows. An operation targeting an already deleted or unknown UUID returns `not-found`; UUIDs are never reused. Restore, purge, and deleted-record browsing are not exposed in this task.

Represent model configuration as a versioned runtime-discriminated contract:

- Codex version 1 requires a non-empty `defaultModel`.
- Claude Code version 1 requires non-empty Sonnet, Opus, Fable, and Haiku display names and request models, a non-empty Subagent request model, and a non-empty default fallback model.

Validate all IPC input again in the main process even when the preload signature is typed. Trim and require names. Permit duplicate names. Validate Base URLs as HTTP or HTTPS URLs that may include localhost, IP addresses, ports, and paths, but reject embedded credentials, query parameters, and fragments; preserve the trimmed user value instead of normalizing its trailing slash. Validate optional official websites as HTTP or HTTPS URLs that may contain paths, queries, and fragments but no embedded credentials. Convert an empty API key to `null` and otherwise preserve it exactly. Trim optional remarks and convert empty remarks to `null`. Trim and require all model values.

Validate avatars by bytes as well as declared MIME type. Accept only PNG, JPEG, and WebP signatures up to 2 MB. Reject SVG, GIF, unsupported or spoofed MIME types, and oversized payloads. Preserve accepted original bytes without image transformation. Update input uses three avatar states: omitted preserves the current avatar, `null` removes it, and a validated payload replaces it.

Add a renderer-safe shared contract and expose it through `globalThis.api.providers` in preload. The API will contain these purpose-specific methods:

- `listProviders(runtime)`: return active rows ordered by newest creation first without complete API keys or avatar bytes. Include API-key presence, at most a four-character suffix, avatar presence, hover metadata, and connection summary.
- `getProviderForEdit(id)`: explicitly return the active Provider's complete editable data, including the plaintext API key and runtime-specific model configuration.
- `getProviderAvatar(id)`: return only the active Provider's custom avatar MIME type and bytes.
- `createProvider(input)`: validate, generate the UUID and timestamps, persist a `user-custom` row transactionally, and return a masked summary.
- `updateProvider(input)`: validate, preserve UUID and runtime, update the active row transactionally, and return a masked summary without changing list order.
- `deleteProvider(id)`: soft-delete the active row transactionally.

Use a discriminated success/error result rather than leaking driver exceptions through IPC. Stable error codes are `invalid-input`, `not-found`, `storage-unavailable`, `storage-corrupt`, `unsupported-database-version`, and `internal`. Field validation errors may identify the invalid field but must not echo sensitive input. Logs and errors must never contain API keys, avatar bytes, SQL parameters, or complete Provider payloads.

Register Provider IPC handlers once and restrict them to the main frame of application windows explicitly registered by the main process. Do not expose `ipcRenderer`, arbitrary channel invocation, SQL, filesystem paths, or driver instances to the renderer. Remove trusted-window registrations when their web contents are destroyed.

Keep `better-sqlite3` external to the electron-vite main bundle through the existing default dependency externalization. Update `electron-builder.yml` to unpack the package's native prebuilds explicitly while retaining `npmRebuild: false`, because the selected package ships Node-API prebuilds for supported macOS, Windows, and Linux x64/arm64 targets. Verify both Darwin prebuilds survive macOS Universal packaging. Do not commit generated `dist/`, `out/`, application packages, or local database files.

Expected implementation areas include:

- `package.json` and `pnpm-lock.yaml`.
- `electron-builder.yml`.
- Shared Provider contracts under `src/shared/`.
- Provider database, migrations, validation, repository, and IPC ownership under `src/main/`.
- `src/main/index.ts` lifecycle and trusted-window integration.
- `src/preload/index.ts` and `src/preload/index.d.ts`.
- Focused Provider repository tests using the built-in Node test runner without adding a general test framework.

## Findings

None.

## Dependencies

### `better-sqlite3`

- Purpose: Provide mature local SQLite connections, prepared statements, transactions, BLOB support, and packaged native binaries for the Electron main process.
- Selected version: `13.0.3`, resolved by running `pnpm add better-sqlite3` without a version during approved execution.
- Module format: CommonJS with an exports map. This matches Foundry's current `type: commonjs` main-process output, although it is not an ESM-native package.
- TypeScript: The runtime package does not bundle declarations; `@types/better-sqlite3` supplies maintained declarations.
- Compatibility: Requires Node.js 22 or newer and is compatible with the project's Node.js 24 requirement and Electron 39's embedded Node.js 22 runtime. The package includes Node-API prebuilds for Darwin, Windows, Linux glibc, and Linux musl across supported x64/arm64 targets.
- Maintenance: Version `13.0.3` was published on 2026-08-05 after multiple active 2026 releases.
- Adoption: npm reported approximately 35.5 million downloads from 2026-07-06 through 2026-08-04.
- Security and license: MIT licensed. OSV returned no known vulnerabilities for version `13.0.3` on 2026-08-05. The npm artifact includes registry signatures and provenance metadata.
- Operational cost: Approximately 27.3 MB unpacked and contains native binaries. It must remain external to the JavaScript bundle, be unpacked from asar, and be verified in the macOS Universal package.
- Alternatives: Built-in `node:sqlite` was rejected because Electron 39's embedded runtime emits an experimental warning. `sqlite3` was rejected because it is also a CommonJS native addon with a callback-oriented API and install-time rebuild fallback. `@libsql/client` was rejected because its ESM/TypeScript packaging comes with a libSQL fork, remote protocol clients, and unrelated dependencies for this local-only requirement. `@sqlite.org/sqlite-wasm` was rejected because its official Node.js support is currently in-memory only without persistence.
- Sources checked: npm registry metadata, npm downloads API, npm package artifact and README, WiseLibs `better-sqlite3` repository, Electron native-module guidance, and OSV on 2026-08-05.

### `@types/better-sqlite3`

- Purpose: Provide TypeScript declarations for the selected SQLite driver.
- Selected version: `9.6.0`, resolved by running `pnpm add @types/better-sqlite3 -D` without a version during approved execution.
- Module format: Type declarations for the CommonJS `better-sqlite3` API.
- TypeScript: Maintained in DefinitelyTyped and consumed only during development.
- Compatibility: Covers the stable driver API surface used by the repository adapter and is compatible with the project's TypeScript 5.9 configuration.
- Maintenance: Version `9.6.0` was published on 2026-08-01.
- Adoption: npm reported approximately 15.0 million downloads from 2026-07-06 through 2026-08-04.
- Security and license: MIT licensed and contains declarations only.
- Alternatives: A narrow local declaration was rejected because maintained DefinitelyTyped declarations already cover the selected API and avoid hand-maintained type drift.
- Sources checked: npm registry metadata, npm downloads API, and the DefinitelyTyped package metadata on 2026-08-05.

## Deliverables

- A packaged-compatible `better-sqlite3` dependency and maintained TypeScript declarations.
- A versioned `foundry.sqlite` database initialized under Electron `userData`.
- A transactional initial Provider migration, schema constraints, consistency checks, and non-destructive failure handling.
- A main-process Provider repository supporting runtime-scoped create, list, edit-detail, avatar, update, and soft-delete operations.
- Shared runtime-discriminated Provider, model configuration, validation, summary, detail, input, avatar, and error contracts.
- A constrained `globalThis.api.providers` preload surface with trusted-main-frame IPC enforcement.
- Native-addon packaging configuration and focused repository behavior tests.

## Acceptance Criteria

- [x] Approved execution installs `better-sqlite3` as a runtime dependency and `@types/better-sqlite3` as a development dependency without manually specifying versions.
- [x] Electron initializes `<userData>/foundry.sqlite`, applies ordered transactional migrations, records the supported schema version, and closes the database during shutdown.
- [x] Database initialization or migration failure does not delete or reset user data and does not prevent unrelated Foundry pages from starting.
- [x] A database newer than the application supports and a consistency or row-decoding failure produce stable non-sensitive Provider errors.
- [x] Codex and Claude Code records persist and decode only their approved version 1 model configuration shapes.
- [x] Provider names may be duplicated, UUID and runtime remain immutable, and active runtime lists are isolated and ordered by `created_at DESC`.
- [x] Base URL, official website, optional values, and model fields follow the approved normalization and validation rules at the main-process boundary.
- [x] Only valid PNG, JPEG, and WebP payloads up to 2 MB are stored, and avatar preserve, remove, and replace operations behave distinctly.
- [x] Normal list responses never contain complete API keys or avatar bytes, while explicit edit and avatar methods return only their approved sensitive detail.
- [x] Soft delete retains the complete database row but excludes the UUID from every normal Provider operation and never reuses it.
- [x] Provider IPC accepts only approved methods from registered application-window main frames and never exposes arbitrary IPC, SQL, filesystem, Electron, or driver access.
- [x] API and logged errors never contain API keys, avatar bytes, SQL parameters, or complete Provider payloads.
- [x] electron-vite leaves `better-sqlite3` external, packaged native prebuilds are unpacked, and the macOS Universal package contains both Darwin x64 and arm64 binaries.
- [x] No Provider page UI, connection-test request, clipboard action, external runtime configuration, restore/purge capability, API-key encryption, or ORM is introduced.

## Out of Scope

- Providers page layout, table, runtime tabs, loading states, and empty states.
- Avatar file selection or renderer image presentation.
- API key Reveal timers, clipboard copy, or clipboard clearing.
- Codex or Claude Code connection-test requests and connection-summary updates.
- Soft-delete restore, purge, history, or deleted-record browsing.
- Foundry built-in Provider records or runtime official-default records.
- Model discovery, remote model validation, or external runtime configuration.
- API key encryption or secure-storage integration.
- A SQLite ORM or a general-purpose automated test framework.

## Handoff

Task 002 will consume the typed `globalThis.api.providers` list and avatar methods, runtime-filtered masked summaries, stable ordering, and non-sensitive error model to render the Providers page without importing Node.js, Electron, SQLite, or main-process modules.

## Verification

- Passed six focused Provider repository tests compiled to a temporary directory and run with `node:test` under Electron 39.8.10's embedded Node.js 22.22.1 runtime.
- `npm_config_force=true pnpm typecheck` passed; the environment override only permits the repository's existing `npm run` subcommands despite its pnpm-only `devEngines` declaration.
- `pnpm lint --ignore-pattern out --ignore-pattern dist` passed, excluding only the repository's generated build directories.
- `npm_config_force=true pnpm build` passed and electron-vite retained `better-sqlite3` as an external main-process dependency.
- Electron runtime smoke checks opened both a temporary file database and the final packaged arm64 binding with SQLite 3.53.4 and a successful `quick_check`.
- `pnpm exec electron-builder --mac --universal --publish never` passed with the existing unsigned macOS configuration.
- Final package inspection confirmed a Universal x86_64/arm64 executable and unpacked `darwin-x64.node` and `darwin-arm64.node` files with their expected architectures.
- `git diff --check` passed.
