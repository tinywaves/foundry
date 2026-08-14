# Task 001: Establish Versioned Prompt Persistence and APIs

## Status

`completed`

## Goal

Establish transactional, versioned Prompt persistence and a constrained typed API that later tasks can use without direct renderer access to Electron, SQLite, or the filesystem.

## Detail

Extend the existing Foundry database from schema version 2 to version 3 through the established ordered, transactional `PRAGMA user_version` migration mechanism. Preserve every existing Provider and Runtime Application row. Add a normalized Prompt ownership model with a `prompts` table for immutable identity, content-update timestamps, and lifecycle timestamps, plus a `prompt_versions` table for immutable full snapshots. Keep the migration inside the existing database module and retain the current WAL, foreign-key, busy-timeout, consistency-check, future-version rejection, and non-destructive failure behavior.

The Prompt record will use a main-process-generated UUID and Unix-millisecond `created_at` and `updated_at` values. Nullable `trashed_at` and `removed_at` values represent the lifecycle without deleting data: both null means active; `trashed_at` set and `removed_at` null means visible in Trash; both set means removed from Trash and permanently inaccessible through product APIs. Database constraints will reject invalid lifecycle combinations and timestamps. Add partial indexes for active Prompts ordered by `updated_at DESC` and Trash ordered by `trashed_at DESC`.

Each Prompt version will use its owning Prompt ID and a one-based, monotonically increasing version number as its stable identity. Store the complete normalized title, nullable description, exact content, and version creation timestamp in every version. Enforce referential integrity and positive version numbers. The latest version is the greatest stored version number for the Prompt; versions are append-only and have no count, expiration, or retention limit.

Add shared Prompt contracts and validation constants under `src/shared/`. A required title is trimmed before storage, contains at most 200 Unicode code points, and rejects line-breaking or other control characters. An optional description is trimmed, converts an empty result to `null`, and contains at most 2,000 Unicode code points. Required content must be a string containing at least one non-whitespace character and at most 1 MiB when encoded as UTF-8, but its stored value must otherwise remain byte-for-byte equivalent to the input string: do not trim it, normalize Unicode, parse Markdown, or transform line endings. Validate UUIDs, positive safe-integer version numbers, object shapes, and every input again in the main process.

Add a Prompt repository that owns all SQL and stored-row decoding. `createPrompt` transactionally creates the Prompt and version 1. `updatePrompt` compares the normalized input with the latest snapshot; an actual title, description, or content change appends the next version and updates `updated_at`, while a no-op returns the current detail without changing storage. Do not add expected-version input, stale-write conflict detection, automatic merging, or retries. Concurrent writes serialize through immediate transactions, each operation compares against the then-current latest version, and the last appended version becomes current while all earlier versions remain available.

`restorePromptVersion` accepts an active Prompt ID and an existing version number, then appends a new latest snapshot copied from the selected version and updates `updated_at`. Restoring an historical version remains an explicit version-producing operation even when its snapshot happens to match the current content. `listPromptVersions` returns newest-first version metadata without content, and `getPromptVersion` returns one explicit full snapshot. All history operations reject trashed, removed, unknown, or invalid Prompt identities through the stable error model.

`movePromptToTrash` sets `trashed_at` without changing `updated_at` or creating a version. `listTrashedPrompts` returns current-version metadata for rows in Trash without full content, while `getTrashedPrompt` returns only the current full snapshot needed by the later read-only Trash View. `restoreTrashedPrompt` clears `trashed_at` without changing `updated_at`, creating a version, or changing identity. `removePromptFromTrash` sets `removed_at`, and `emptyPromptTrash` sets it for every current Trash row and returns the affected count. Removed rows and all of their versions remain stored but every normal, history, Trash-detail, copy, restore, and mutation operation treats them as not found. Calling Empty Trash when it is already empty succeeds with a zero count.

Expose renderer-safe summary, detail, version, Trash, input, result, field-error, and API types. Normal Prompt summaries include the current title, optional description, current version number, and lifecycle timestamps but not content. Explicit active detail and version-detail methods return content. Trash summaries expose the current title and Trash timestamp needed by the approved table; Trash detail exposes the current snapshot but no version collection.

Expose a narrow `globalThis.api.prompts` surface through preload with `listPrompts`, `getPrompt`, `createPrompt`, `updatePrompt`, `movePromptToTrash`, `listPromptVersions`, `getPromptVersion`, `restorePromptVersion`, `copyPrompt`, `copyPromptVersion`, `listTrashedPrompts`, `getTrashedPrompt`, `restoreTrashedPrompt`, `removePromptFromTrash`, and `emptyPromptTrash`. Keep clipboard ownership in the main process by reading an allowed active current or historical snapshot and passing its exact content to Electron `clipboard.writeText`. Do not permit copying from Trash or from removed records.

Add a Prompt subsystem beside the existing Provider and Runtime subsystems. It receives the shared database or a mapped storage-initialization failure, registers one Prompt IPC controller, registers trusted application windows, and disposes all Prompt handlers during shutdown. The IPC controller accepts requests only from the main frame of explicitly registered application windows and maps every operation to a discriminated `PromptApiResult<T>` without exposing `ipcRenderer`, arbitrary channels, SQL, driver objects, filesystem paths, or Electron APIs.

Use stable Prompt error codes `invalid-input`, `not-found`, `storage-unavailable`, `storage-corrupt`, `unsupported-database-version`, and `internal`. Wrong-lifecycle and removed-record access returns `not-found`; this task intentionally introduces no `conflict` behavior. Field errors may identify the invalid field but may not echo its value. Stored-row decoding must validate lifecycle state, timestamps, version ordering, normalized metadata, and content bounds, mapping malformed rows to `storage-corrupt`. Logs and errors must never contain Prompt content or complete request payloads. A database initialization failure must leave unrelated Foundry functionality available while every Prompt API method returns the mapped non-sensitive storage error.

Add focused Vitest coverage using in-memory and temporary SQLite databases. Extend migration verification to prove version 2 Provider and Runtime Application data survives the version 3 migration. Add repository tests for duplicate titles, exact content preservation, field limits, creation, material and no-op updates, append-only history, historical restoration, latest-version ordering, active and Trash list filtering, unchanged content timestamps across Trash restore, retained removed rows, inaccessible removed data, empty Trash counts, corruption mapping, and non-sensitive errors. Verify the IPC and preload surface through type checking and focused static inspection; do not add a new test framework or Electron UI automation.

## Findings

None.

## Dependencies

None.

## Deliverables

- A transactional Foundry schema version 3 migration with normalized Prompt and immutable Prompt-version persistence.
- Shared Prompt contracts, validation constants, input parsing, stable errors, and renderer-safe result types.
- A Prompt repository covering current data, append-only history, Trash, logical removal, and exact-content retrieval.
- A Prompt subsystem, trusted-main-frame IPC controller, and narrow `globalThis.api.prompts` preload surface.
- Main-process copy operations for active current and historical Prompt content.
- Focused migration and repository behavior tests using the existing Vitest and SQLite foundations.

## Acceptance Criteria

- [x] A version 2 Foundry database upgrades transactionally to version 3 without changing existing Provider or Runtime Application data, and a new database receives the complete schema in migration order.
- [x] Prompt identity uses non-reused UUIDs, duplicate titles are accepted, and active lists are ordered by content `updated_at DESC` without returning Prompt content.
- [x] Title, description, content, UUID, version, and input-shape validation follows the approved normalization and size rules at the authoritative main-process boundary.
- [x] Stored Prompt content preserves the original string exactly, including Markdown-like syntax, line endings, indentation, and leading or trailing whitespace.
- [x] Creation writes version 1 atomically, a material edit appends one immutable version, and a no-op edit changes neither version count nor content update time.
- [x] Prompt writes use immediate transactions without expected-version conflict detection, automatic merging, or retry behavior; the latest appended version is current and earlier versions remain intact.
- [x] Version metadata omits content, explicit version detail returns one snapshot, and restoring an active historical version appends a new latest snapshot.
- [x] Moving a Prompt to Trash and restoring it change lifecycle state without creating a version or changing its content update time.
- [x] Trash listing and explicit Trash detail expose only their approved current-version data, and Empty Trash succeeds with the number of affected rows, including zero.
- [x] Remove from Trash and Empty Trash retain complete Prompt and version rows in SQLite while making them permanently inaccessible through every product API.
- [x] Copy writes exact active current or historical content through the main process, while Trash, removed, unknown, and invalid targets cannot be copied.
- [x] Prompt IPC accepts only purpose-specific methods from registered application-window main frames and never exposes arbitrary IPC, SQL, filesystem, Electron, or database-driver access.
- [x] Invalid input, inaccessible records, unavailable or corrupt storage, unsupported schema versions, and internal failures produce stable non-sensitive results without logging Prompt content or complete payloads.
- [x] Prompt storage initialization failure does not prevent unrelated Foundry subsystems or renderer routes from starting.
- [x] Focused tests, type checking, linting, the production build, diff validation, and planned static security inspections pass without launching the application or using visual automation.

## Out of Scope

- Prompts renderer pages, route and terminology changes, tables, forms, query hooks, dialogs, History panels, and Trash presentation.
- Unsaved-edit prompts, delete or restore confirmations, success and failure notifications, and other interaction state.
- Version comparison, branching, expected-version conflict detection, automatic merging, or automatic retry behavior.
- Search, tags, categories, import, export, synchronization, sharing, external Runtime integration, or physical deletion.
- New dependencies, changes to native packaging configuration, a new test framework, or visual-test infrastructure.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 002 will consume the typed `globalThis.api.prompts` current-version operations, exact plain-text contracts, lifecycle-safe errors, main-process copy command, and local persistence to rename the active product surface and build the Prompts table and core management workflows. Tasks 003 and 004 can later consume the already constrained history and Trash operations without broadening the renderer's native access.

## Verification

- `pnpm test` passed 16 test files and 108 tests, including the new Prompt repository suite and version 2 to version 3 migration coverage.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the Node and Web type checks and built the main, preload, and renderer production outputs with electron-vite.
- `git diff --check` passed.
- Static inspection confirmed that Prompt SQL and Electron clipboard ownership remain in the main process, preload exposes only the typed `globalThis.api.prompts` methods, IPC requires a registered web contents main frame, lifecycle filters exclude removed data, and Prompt content or complete payloads are not logged.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
