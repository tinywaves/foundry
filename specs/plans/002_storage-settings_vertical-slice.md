# 002 Storage And Settings Vertical Slice

## Summary

Design and implement Foundry's first durable local storage system, then prove
it with one complete Settings capability: `ui.theme`.

This plan keeps the scope intentionally narrow. The storage layer is SQLite
only, the storage root is one hidden local directory, and the only business
module in scope is `settings`. The first Settings slice must run through the
same shared `settingsService` from the Web UI, Hono API, CLI, and
`foundry-settings` Skill.

## Goals

- Establish one local Foundry storage root.
- Use one SQLite database as the first storage backend.
- Keep storage initialization idempotent and transaction-based.
- Keep storage behavior behind module repositories and an application service.
- Define a static Settings registry in code.
- Store Settings values as `{ "value": ... }` envelopes.
- Persist default Settings during initialization.
- Repair structural payload damage with defaults.
- Preserve business-invalid values and return `valid: false`.
- Run the first real Settings slice for `ui.theme`.
- Expose the same capability through Web UI, Hono API, CLI, and Skill.
- Keep the implementation small enough to review in slices.

## Non-Goals

This plan does not implement:

- Backup or restore.
- Export or import.
- Cloud sync.
- Agent, Session, Profile, or Workspace modules.
- Multi-user support.
- Multilingual settings.
- Root relocation through Settings.
- JSON storage as an alternate backend.
- Migration tooling between storage backends.
- Secret encryption or provider integration.
- Unknown-setting lifecycle rules such as expiry or tombstones.
- Custom theme packs or theme scheduling.

## Product Boundaries

Foundry remains a local, single-user runtime.

There is one shared storage system, but each module owns its own repository and
service. There is no universal "query everything" layer for all modules.

Every user-facing capability in this plan follows the same pattern:

```text
Web UI -> Hono API route -> settingsService
CLI    -> settings command -> settingsService
Skill  -> settings CLI command
```

The Web API and CLI must use the same `settingsService`. The Skill wraps the
module-level CLI command and must not access storage, repositories, or the
service directly.

Domain code lives under `src/modules/`. Settings is therefore implemented as
one cohesive module:

```text
src/modules/settings/
├── command.ts
├── registry.ts
├── repository.ts
├── routes.ts
├── service.ts
└── types.ts
```

Shared Settings contracts live in `types.ts`. Types used only by one
implementation file remain local to that file.

## Storage Root

Foundry uses one hidden directory as its local storage root:

```text
~/.foundry
```

The root is derived from the current user's home directory on every supported
platform. There is no `bootstrap.json`, no `Library/Application Support`
pointer file, and no separate relocation layer in this plan.

The storage path is fixed for this plan. Runtime APIs do not accept a storage
root option or pass a path through the application composition chain. Tests
may isolate filesystem access with module mocks, but that is not a product
configuration surface.

The storage root is the complete local application state for this stage of the
project.

The first physical layout is intentionally minimal:

```text
~/.foundry/
└── foundry.sqlite
```

SQLite sidecar files stay next to the database file. `files/` and
`temporary/` are not part of this plan.

## Storage Initialization

Application startup orchestrates independent ensure steps. `ensureStorage`
stays thin and delegates to specific checks instead of owning every branch.

Conceptually:

```text
createApplication()
  -> ensureStorage()
       -> ensureStorageRoot()
       -> ensureDatabase()
  -> ensureModules()
       -> ensureSettingsModule()
  -> create settingsService
  -> return application context
```

Rules:

- A missing storage root is created.
- A missing database is created.
- A partially initialized database is completed.
- Settings defaults are seeded on first initialization.
- Any repair write happens in a transaction.
- A startup failure stops the server or CLI command.

The startup path does not validate business correctness of default values at
boot time. Default values are trusted code, while database reads handle
structural corruption and business validation separately.

## SQLite Backend

The first backend is one SQLite database at `~/.foundry/foundry.sqlite`.

SQLite-specific details stay inside storage and repository layers. They do not
leak into the CLI, API, Web UI, or Skill surface.

The backend must support:

- transactions;
- atomic writes;
- basic integrity checks;
- brief local contention without turning concurrency into a product feature.

This plan does not introduce a migration framework or a `foundry_migrations`
table yet.

## Settings Registry

Settings are defined statically in code.

For this plan, the only active setting is:

```text
ui.theme
```

The registry defines the business schema, default value, and metadata needed
by the service and Web UI. The full key is derived from the registry
components rather than stored as a second source of truth.

The registry remains small and explicit. Dynamic providers, plugin-defined
settings, and late-bound settings sources are out of scope.

## Settings Storage Model

Settings are stored in a dedicated SQLite table.

The row identity is module-owned and stable. The logical value is always stored
as a JSON envelope:

```json
{ "value": "dark" }
```

The outward business value for `ui.theme` is just `dark`. The storage envelope
keeps the persisted structure explicit and easy to repair.

The service also stores `created_at` and `updated_at` as integer millisecond
timestamps.

Rules:

- `created_at` and `updated_at` are numbers, not SQL datetime types.
- Missing records are backfilled with defaults.
- Structural corruption is repaired with defaults.
- Business-invalid values are preserved.
- Reset writes the default back into the record rather than deleting it.

## Read And Repair Rules

The `settingsService` applies the following read rules:

1. No database record exists:
   - use the default value;
   - write the default envelope back in a transaction;
   - return the default as valid.
2. `JSON.parse(payload)` fails:
   - use the default value;
   - write the default envelope back in a transaction;
   - return the default as valid.
3. JSON parses, but the result is not an object with its own `value` field:
   - use the default value;
   - write the default envelope back in a transaction;
   - return the default as valid.
4. The envelope is structurally valid:
   - read the raw `value`;
   - validate it against the registered schema;
   - if valid, return `valid: true`;
   - if invalid, return the raw value with `valid: false`;
   - do not overwrite the stored value.

Structural repair is storage behavior. Business validation is service behavior.
If a value is readable but invalid, the caller gets the raw value plus a
validation flag instead of a hard failure.

## Settings Service Contract

The service is the shared use-case layer for all surfaces.

Initial operations:

```text
get(key)
setMany(entries)
resetMany(keys)
list()
```

The service returns a serializable entry shape that includes at least:

- `key`
- `value`
- `valid`
- `created_at`
- `updated_at`

Write behavior:

- Unknown keys are rejected.
- Invalid writes are rejected atomically.
- A successful batch writes only the submitted keys.
- `resetMany` writes defaults back into existing rows.
- Successful writes return the updated entries.

Read behavior:

- `get` returns one entry.
- `list` returns all registered entries.
- Business-invalid stored values remain readable with `valid: false`.

The service does not expose database primitives or schema internals to the
Web UI or CLI.

## Secret Reservation

The registry may mark a setting as secret metadata, but this plan does not add
security policy.

No encryption, redaction, or provider integration is introduced here. The Web
UI only needs to use a password-style input when a setting is marked secret.

## CLI

The CLI owns one module-level command:

```text
foundry settings get ui.theme
foundry settings set ui.theme dark
foundry settings reset ui.theme
foundry settings list
```

The command is the automation contract for the Skill.

JSON output is supported for the settings command. Non-JSON output can stay
human-friendly, but it must not be the only surface for programmatic use.

CLI failure means the command or service failed. A readable setting with
`valid: false` is still a successful command result.

## Hono API

The local API stays intentionally small and thin.

Required routes:

```text
GET  /api/settings
POST /api/settings
POST /api/settings/reset
```

Behavior:

- `GET /api/settings` returns all settings.
- `POST /api/settings` accepts
  `[{ "key": "ui.theme", "value": "dark" }]` and applies only the changed
  keys sent by the Web UI.
- `POST /api/settings/reset` accepts `{ "keys": ["ui.theme"] }` and resets
  the requested keys to defaults.
- Routes call `settingsService` only.
- Routes do not access SQLite directly.

The API is for the Web UI and local automation, not a public REST design.

## Web UI

The existing shell stays in place, but the Settings route becomes real.

The Web app should have a `pages/` directory, with a dedicated Settings page
and room for other pages to follow.

`SettingsPage` should:

- load all settings on mount;
- render the `ui.theme` control;
- submit only changed values;
- use the reset route for reset actions;
- reflect `valid: false` without inventing extra validation rules;
- leave invalid selections visibly unselected when the schema does not match;
- keep Web UI behavior aligned with the service response.

The Web UI uses Hono's typed `hc` client for the HTTP transport and TanStack
React Query for remote-state lifecycle, caching, retries, and mutations. It
does not use Effect or hand-written `fetch` wrappers for API requests, reach
into storage, or call the service directly.

## Application Wiring

The application composition layer owns startup and shutdown.

Conceptually:

```text
createApplication()
  -> ensureStorage()
  -> ensureModules()
  -> create settingsService
  -> inject settingsService into Hono routes and CLI commands
  -> return context with close()
```

The same service instance powers both the Web route layer and the CLI command
layer.

One-shot CLI commands close the application context after execution. The Web
server keeps the context open for the lifetime of the process.

## Skill

Add one `foundry-settings` Skill for the module-level `foundry settings`
command. Store the installable Skill at
`skills/foundry-settings/SKILL.md`; `.agents/skills/` is reserved for
repository-local agent guidance and is not a distribution location.

The Skill:

- wraps the `settings` CLI command;
- exposes its subcommands and options;
- delegates all work to the installed CLI;
- does not implement storage, validation, or repository logic on its own.

## Implementation Sequence And Review Checkpoints

### Slice 1: Storage foundation

Implement only the storage substrate:

- hidden storage-root resolution;
- root creation;
- SQLite file creation;
- transaction support;
- integrity checks;
- application context lifecycle primitives.

This slice has no user-facing Settings capability.

### Slice 2: Settings vertical slice

Implement the full `ui.theme` capability as one connected delivery slice:

- static Settings registry;
- Settings table and repository;
- `settingsService`;
- `foundry settings` command;
- Hono GET/POST/reset routes;
- `/settings` Web UI page;
- `foundry-settings` Skill;
- focused tests around the real SQLite-backed path.

The capability is not complete until Web, API, CLI, service, storage, and Skill
all work together.

## Verification

Storage verification:

- the storage root resolves to `~/.foundry`;
- a missing root is created;
- a missing database is created;
- startup is idempotent;
- transactions commit atomically and roll back on failure;
- integrity failure stops startup.

Settings verification:

- `ui.theme` is seeded with its default;
- missing records backfill to defaults;
- parse failures backfill to defaults;
- malformed envelopes backfill to defaults;
- business-invalid values are preserved with `valid: false`;
- reset writes the default back into the row;
- list returns the registered setting.

Capability verification:

- CLI `get`, `set`, `reset`, and `list` work;
- Hono routes use the same `settingsService`;
- Web UI loads and updates `ui.theme`;
- the Skill wraps the CLI command only;
- no Web UI code touches storage directly.

Repository verification:

- `pnpm run lint`;
- focused Vitest coverage for storage and settings behavior;
- `pnpm run build`;
- `git diff --check`.

## Dependency Changes

1. Dependencies to remove: None
2. Dev dependencies to remove: None
3. Dependencies to add:
   - root `package.json`: `zod` for Settings value schemas;
   - `packages/web/package.json`: `hono` for the typed `hc` API client;
   - `packages/web/package.json`: `@tanstack/react-query` for Web remote-state
     management.
4. Dev dependencies to add: None

## Assumptions

- Foundry remains a local, single-user runtime.
- `ui.theme` is the first and only active setting in this plan.
- The storage root is the complete local application state for this stage.
- Backups and restores will be handled by a later plan.
- The first backend is SQLite.
- The Web UI keeps the current shell but gains a real Settings page.
- The CLI and Skill surface are part of the same delivery slice.
