# Data export and import

## Scope and entry points

Settings > Advanced hosts the current Export and Import controls. Export and
import remain separate data features on the server and Web client; hosting their
entry points in Settings does not make the backup format a four-setting format.

| Entry point | Export | Import |
| --- | --- | --- |
| Web/API | `POST /api/data-export` | `POST /api/data-import` |
| CLI | `foundry settings export` | `foundry settings import <file>` |
| Services | `DataExportService` | `DataImportService` |

`FoundryData` in `packages/shared/src/data-export.ts` defines the payload. It
contains normalized settings, instruction records, and agent assignment
records. Instructions include their Markdown content and epoch-millisecond
timestamps. Agent records contain the ordered instruction IDs, enabled state,
and timestamps.

The payload excludes the runtime config-folder path, provider records, capture
and fetch-job collections, and the external agent instruction files at
`~/.codex/AGENTS.md` and `~/.claude/CLAUDE.md`. Export is not a complete copy of
`<home>/.foundry`. Import replaces settings, instructions, and agent profiles,
but does not rewrite external agent files; reapply an enabled agent to write its
current assignment.

As application data support grows, extend the shared payload and the collection
and replacement repositories together. Reuse the archive, encryption, and Web
transfer flows.

## Normalization

Export reads settings through `FoundryStorage.readSettings`, which applies
`normalizeSettings`. Import requires a settings object, then runs the same
normalization before writing it in a storage transaction. It does not merge the
backup with current settings.

Import also requires `instructions` and `agents` arrays. Instruction IDs must
be unique UUIDs, names and content must be non-empty within their normal limits,
and timestamps must be non-negative safe integers. Agent records are limited to
the fixed agent IDs and cannot repeat. Each assignment must contain unique
instruction IDs that exist in the same backup. An enabled agent must have at
least one assignment. Invalid references reject the whole backup before any
replacement.

The rules in `src/features/settings/contracts.ts` are authoritative. For example,
unsupported workspace enum values use defaults, retained capture numeric values
are normalized, and feature fields are retained or removed according to that
function. Import does not reject a backup merely because individual settings are
missing or invalid, and it does not promise to preserve every arbitrary field
verbatim. There is no separate backup-specific settings schema to maintain.

This differs from interactive CLI set and Settings PATCH, which validate supplied
values and reject unsupported inputs.

## Archive and encryption

A `.foundry-backup` file is protected by the shared AES-256-GCM envelope with
scrypt key derivation. The decrypted ZIP contains exactly:

```text
manifest.json
data/foundry.json
```

The manifest records format `foundry.data`, archive version `2`, app version,
creation time, payload byte length, and SHA-256 checksum. `data/foundry.json`
contains the current `FoundryData` payload. Legacy `foundry.snapshot` and SQLite
backup archives are unsupported. Version-1 backups created before instructions
and agents were included are also unsupported.

Import verifies decryption/authentication, expected ZIP entries, manifest format
and version, payload length/checksum, valid JSON, settings, instructions, and
agent records. There is no app-version ordering gate. Changes to archive or
encryption compatibility need focused validation and encrypted round-trip tests.

## Request and file handling

Web export submits a JSON passphrase and receives an octet-stream attachment.
The export dialog requests passphrase confirmation and provides reveal/hide
controls. CLI export accepts `--output`, appends `.foundry-backup` when needed,
and uses a timestamped working-directory filename when output is omitted. An
existing destination requires `--force`.

Web import sends the selected file as `application/octet-stream`, with the
passphrase URI-encoded in `x-foundry-passphrase`. It displays a full-replacement
warning before submission. CLI import reads the supplied file path. Both CLI
operations accept `FOUNDRY_PASSPHRASE` or `--passphrase`.

There are no preview sessions, inspect/commit/cancel endpoints, transfer locks,
active-job gates, expiration times, or application file-size caps. Disk and
memory availability still bound an operation. Tabs import independently; the last
successful transaction write wins. One import does not invalidate another tab's
selected file.

Export, import, and the Web import upload use private temporary directories under
the operating system's temporary location. Cleanup runs in `finally` paths.
Cleanup failures are logged without reporting an already committed import as a
failed replacement. Temporary plaintext files are not stored under the
repository or retained as import sessions.

## Completion and refresh

An error before the storage transaction commits preserves the current supported
data. Instruction Markdown writes, agent profile replacement, and settings
replacement commit through the storage transaction journal. A successful import
returns `{ "status": "imported" }`. CLI callers can verify settings with
`foundry settings get` and instructions with `foundry instructions list`.

Imported agent profiles preserve their enabled state and assignment order, but
the external agent files are independent and are not part of the backup. After
import, run `foundry agents instructions reapply <agent>` for each enabled agent
that should rewrite its managed block.

After Web import, `location.replace(location.pathname + location.search)` removes
the hash route and performs a full navigation. Startup fetches data again with a
fresh query cache. The normal root route then opens Dashboard; Appearance remains
the default only when visiting Settings. The importing page does not manually
patch its cached settings. Other connected Web clients receive a Settings change
notification and refetch through the normal realtime path.

## Source map

- `packages/shared/src/data-export.ts`: payload and manifest contracts
- `src/features/data-export/`: collection, encryption orchestration, API
- `src/features/data-import/`: validation, normalization, replacement, API
- `src/lib/backup/`: archive, crypto, and temporary-directory cleanup
- `app/web/src/features/data-export/` and `data-import/`: Web dialogs and adapters
- `src/cli/commands/backups.ts`: CLI file handling and service calls
