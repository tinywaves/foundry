# 002 Storage And Settings Vertical Slice

## Summary

Implement Foundry's local SQLite storage foundation and expose Settings as one
complete capability across the Web UI, Hono API, CLI, and
`foundry-settings` Skill.

Settings use a small static registry, a `(group, name)` identity, and a JSON
payload envelope. The shared `settingsService` remains intentionally narrow:
it reads values, lists stored settings, writes submitted values, and resets
registered settings to their defaults.

## Goals

- Establish one local Foundry storage root.
- Use one SQLite database as the storage backend.
- Keep storage initialization idempotent and transaction-based.
- Keep Settings data access behind its repository and application service.
- Define Settings statically in a registry.
- Identify settings by `group` and `name`.
- Derive display keys such as `ui.theme` from registry components.
- Store values as `{ "value": ... }` JSON envelopes.
- Seed registered defaults during initialization.
- Return registered defaults when stored payloads cannot be read through their
  schema.
- Expose Settings through Web UI, Hono API, CLI, and Skill.
- Keep the implementation direct and avoid speculative configuration
  abstractions.

## Non-Goals

This plan does not implement:

- Backup or restore.
- Export or import.
- Cloud sync.
- Agent, Session, Profile, or Workspace modules.
- Multi-user support.
- Multilingual settings.
- Storage-root relocation through Settings.
- JSON files as an alternate storage backend.
- A migration framework.
- Secret encryption or provider integration.
- Dynamic or plugin-defined settings.
- Unknown-setting expiry or tombstones.

## Product Boundaries

Foundry remains a local, single-user runtime.

Every user-facing Settings path uses the same application service:

```text
Web UI -> Hono API route -> settingsService
CLI    -> settings command -> settingsService
Skill  -> settings CLI command
```

The Hono routes and CLI command call `settingsService`. The Skill wraps the
module-level CLI command and does not access storage, repositories, or the
service directly.

Settings is implemented as one domain module:

```text
src/modules/settings/
├── command.ts
├── constants.ts
├── registry.ts
├── repository.ts
├── routes.ts
├── service.ts
└── types.ts
```

Shared Settings contracts live in `types.ts`. File-private schemas and helpers
remain next to their consumers.

## Storage Root

Foundry uses one hidden directory as its local storage root:

```text
~/.foundry
```

The root is derived from the current user's home directory. Runtime APIs do not
accept a storage-root option or pass a path through the application composition
chain.

The initial physical layout is:

```text
~/.foundry/
└── foundry.sqlite
```

SQLite sidecar files remain next to the database.

## Storage Initialization

Application startup owns storage initialization and module setup:

```text
createApplication()
  -> ensureStorage()
       -> ensureStorageRoot()
       -> ensureDatabase()
  -> createSqliteStorage()
  -> createSettingsService()
       -> ensureSettingsModule()
       -> createSettingsRepository()
  -> return application context
```

Rules:

- Create the storage root when it is missing.
- Create the SQLite database when it is missing.
- Run the database integrity check before creating module services.
- Create the Settings table when it is missing.
- Seed every registered default with `INSERT OR IGNORE`.
- Run seed writes in one transaction.
- Stop startup when initialization fails.

## SQLite Backend

The first backend is one SQLite database at `~/.foundry/foundry.sqlite`.

SQLite-specific behavior stays inside `src/storage/` and module repositories.
The backend provides:

- synchronous local access through `node:sqlite`;
- explicit transactions;
- integrity checks;
- a finite busy timeout;
- idempotent close behavior.

This plan does not introduce a migration table or generalized migration
framework.

## Settings Registry

Settings are declared statically in `registry.ts`.

Each definition contains:

- `group`;
- `name`;
- `defaultValue`;
- a Zod `schema`;
- `secret` presentation metadata kept inside the registry.

The active settings are:

| Key | Schema | Default |
| --- | --- | --- |
| `ui.theme` | `system`, `light`, or `dark` | `system` |
| `ui.pointer` | boolean | `true` |

The full key is derived with `getSettingKey(group, name)`. It is a CLI and
presentation identifier rather than the persisted row identity.

## Settings Storage Model

Settings are stored in one module-owned table with these columns:

- `group`;
- `name`;
- `payload`;
- `created_at`;
- `updated_at`.

The composite primary key is `(group, name)`.

The logical value is stored as a JSON envelope:

```json
{ "value": "dark" }
```

`created_at` and `updated_at` are integer Unix epoch milliseconds. They remain
repository data and are not part of the service output.

Repository operations are:

```text
get({ group, name })
getAll()
upsert(group, name, payload)
```

`upsert` preserves the original `created_at` value on conflict and refreshes
`updated_at`.

## Settings Read Model

The service reads a record with the schema from its registry definition:

1. Resolve the requested `(group, name)` definition.
2. Parse the stored JSON payload.
3. Validate `{ value }` with the registered schema.
4. Return the parsed value when validation succeeds.
5. Return the registered default when the record is missing or the payload
   cannot be read through the schema.

Read fallback does not expose a separate validity flag and does not write a
repair record.

`list()` reads stored rows and returns the same simplified output shape as
`get()`.

## Settings Service Contract

The service is the shared use-case boundary for all Settings surfaces.

Operations:

```text
get(group, name)
list()
setMany(entries)
resetMany(keys)
```

Input shapes:

```ts
type SettingInput = {
  group: string;
  name: string;
  value: unknown;
};
```

```ts
type SettingKey = {
  group: string;
  name: string;
};
```

Output shape:

```ts
type SettingOutput = {
  group: string;
  name: string;
  key: string;
  value: JSONType;
};
```

Behavior:

- `get` returns one simplified setting output.
- `list` returns simplified outputs for stored settings.
- `setMany` writes submitted values in one transaction.
- `resetMany` resolves registered definitions and writes their defaults in one
  transaction.
- Mutation methods return `void`; transport layers choose their own success
  representation.
- The service does not expose database objects, timestamps, schemas, or
  registry definitions.

## CLI

The CLI owns one module-level command:

```text
foundry settings get <key> [--raw]
foundry settings list [--raw]
foundry settings set <key> <value> [--raw]
foundry settings reset <key> [--raw]
```

The dotted key is parsed at the CLI boundary into `group` and `name`.

Output behavior:

- Non-raw `get` and `list` render a `Key` and `Value` table.
- Raw `get` prints only the setting value.
- Raw `list` prints each setting value.
- `set` and `reset` print a boolean mutation result.
- CLI output is routed through `src/cli/output.ts`.

The CLI command remains the automation contract used by the Skill.

## Hono API

The local API exposes:

```text
GET  /api/settings
POST /api/settings
POST /api/settings/reset
```

Behavior:

- `GET /api/settings` returns `SettingOutput[]`.
- `POST /api/settings` accepts:

```json
[
  {
    "group": "ui",
    "name": "theme",
    "value": "dark"
  }
]
```

- `POST /api/settings/reset` accepts:

```json
{
  "keys": [
    {
      "group": "ui",
      "name": "theme"
    }
  ]
}
```

- Mutation routes return `true` after the service call completes.
- Request bodies are validated with `@hono/zod-validator`.
- Invalid request shapes return HTTP 400 with Zod issues.
- Service failures return HTTP 500 with a short error payload.
- Routes call `settingsService` only.

## Web UI

The Settings page consumes the Hono API through the typed `hc` client and uses
TanStack React Query for remote-state lifecycle.

The page:

- loads the Settings list;
- identifies settings by their derived `key`;
- submits updates as `{ group, name, value }` entries;
- submits resets as `{ group, name }` keys;
- refreshes or invalidates the Settings query after a successful boolean
  mutation result;
- does not access SQLite or the service directly.

Presentation choices such as selectors and switches remain Web UI concerns.
The service output intentionally does not include control options or validity
metadata.

## Application Wiring

The application composition layer owns startup and shutdown:

```text
createApplication()
  -> ensureStorage()
  -> createSqliteStorage()
  -> createSettingsService()
  -> expose settingsService in the application context
```

The Web server creates Settings routes with the shared service. One-shot CLI
commands create an application context, run one action, and close the context
in a `finally` block.

## Skill

The installable Skill lives at `skills/foundry-settings/SKILL.md`.

It:

- wraps `foundry settings`;
- exposes `get`, `list`, `set`, `reset`, and `--raw`;
- documents the registered keys and values;
- delegates all work to the installed CLI;
- does not duplicate repository or service behavior.

## Implementation Sequence And Review Checkpoints

### Slice 1: Storage foundation

- hidden storage-root resolution;
- root and database creation;
- SQLite storage wrapper;
- transaction support;
- integrity checks;
- application context lifecycle.

### Slice 2: Settings vertical slice

- static registry and shared key separator;
- Settings table and repository;
- simplified `settingsService`;
- module-level CLI command;
- shared CLI output module;
- validated Hono routes;
- Settings Web UI integration;
- installable `foundry-settings` Skill.

The capability is complete only when Web UI, API, CLI, service, storage, and
Skill use the same contract.

## Verification

Use implementation review and executable workflow checks rather than automated
tests.

Storage checks:

- storage paths resolve under `~/.foundry`;
- initialization creates missing storage;
- module initialization seeds registered defaults;
- transactions and close behavior remain direct and contained.

Settings checks:

- service inputs and outputs match the documented `group/name` contract;
- the persisted payload remains a `{ value }` envelope;
- read fallback returns registry defaults;
- reset writes registry defaults;
- CLI tables and raw output match the command contract;
- Hono request schemas match the Web client payloads;
- the Skill invokes only the Settings CLI.

Repository checks:

- static review of changed files;
- relevant TypeScript checks;
- `pnpm run lint`;
- `pnpm run build` when CLI/Web integration changes;
- `git diff --check`.

Do not add or restore automated tests for this plan unless the user explicitly
requests a separate test-only task.

## Dependency Changes

1. Dependencies to remove: None
2. Dev dependencies to remove: None
3. Dependencies to add:
   - root `package.json`: `zod` for Settings schemas;
   - root `package.json`: `@hono/zod-validator` for Hono request validation;
   - root `package.json`: `cli-table3` for CLI tables;
   - root `package.json`: `consola` for shared CLI output;
   - `packages/web/package.json`: `hono` for the typed `hc` client;
   - `packages/web/package.json`: `@tanstack/react-query` for remote-state
     management.
4. Dev dependencies to add: None

## Assumptions

- Foundry remains a local, single-user runtime.
- `ui.theme` and `ui.pointer` are the active registered settings.
- The storage root is the complete local application state for this stage.
- SQLite remains the only storage backend.
- The CLI command is the automation contract for the Skill.
- Automated tests are not part of the default implementation workflow.
