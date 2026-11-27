# Encrypted backups

## Overview

Foundry can export its supported data to an encrypted `.foundry-backup` archive
and import such an archive as a complete replacement. Import is destructive and
does not merge records.

The current payload contains normalized settings, instruction records, and agent
assignment profiles. It is not a snapshot of all Foundry runtime files.

| Data | Included in backup |
| --- | --- |
| Normalized settings and retained backend feature settings | Yes |
| Instructions, including Markdown content and timestamps | Yes |
| Agent assignments, order, and enabled state | Yes |
| External `~/.codex/AGENTS.md` and `~/.claude/CLAUDE.md` files | No |
| Provider, capture, and fetch-job records | No |

## When to use

Use export/import when the user wants to:

- Move supported Foundry settings to another installation.
- Move the instruction library and agent assignments to another installation.
- Preserve settings before a risky change.
- Replace current settings, instructions, and assignments with a snapshot.

Do not use a backup to preserve external agent files, providers, captures, or
fetch jobs. Those require a separate, explicitly chosen process.

Import updates Foundry's own agent profiles but never rewrites external agent
instruction files. If an imported agent is enabled, run
`foundry agents instructions reapply <agent>` to write its managed block on the
current machine.

## Passphrase handling

Export and import require the same non-empty passphrase.

- Preferred: set `FOUNDRY_PASSPHRASE` in the execution environment so the value
  does not appear in shell history.
- Alternative: pass `--passphrase <text>`.
- Never print a passphrase or include it in logs, issue reports, or responses.
- A lost passphrase cannot be recovered. A wrong passphrase cannot be bypassed.

If neither the environment variable nor the flag is present, the command fails
with `PASSPHRASE_REQUIRED`.

## Export

```bash
foundry settings export --output ./backup.foundry-backup
```

Behavior:

- Writes an encrypted archive with private file permissions (`0600` where
  supported).
- Omitting `--output` creates a timestamped filename in the working directory.
- The `.foundry-backup` extension is appended when absent.
- An existing destination fails with `OUTPUT_EXISTS` unless `--force` is used.
- The response contains the absolute destination:

  ```json
  { "filePath": "/home/alice/backup.foundry-backup" }
  ```

Overwrite only when the user explicitly intends to replace that file:

```bash
foundry settings export \
  --output ./backup.foundry-backup \
  --force
```

## Import

```bash
foundry settings import ./backup.foundry-backup
```

Import:

1. Reads and decrypts the archive.
2. Validates the manifest version, checksum, archive structure, settings,
   instruction records, agent profiles, and instruction references.
3. Normalizes settings with Foundry's regular rules, including defaults and
   numeric bounds for retained backend fields.
4. Replaces settings, instructions, and agent profiles completely.
5. Returns `{ "status": "imported" }`.

There is no preview, merge, or partial apply. The last successful write wins.
Invalid or missing settings fields are normalized rather than rejected field by
field; invalid instruction or agent records are rejected instead. An unreadable
archive, wrong checksum, unsupported version, or wrong passphrase fails before
replacement.

### Verify after import

```bash
foundry settings get
foundry instructions list
foundry agents instructions list
```

Confirm the expected theme, language, time zone, and time format. If the import
was initiated from the Web UI, the page reloads without the hash route and the
normal root route opens Dashboard.

For every imported agent that should be active, reapply its managed block:

```bash
foundry agents instructions reapply chatgpt
foundry agents instructions reapply claude-code
```

## Common scenarios

### Back up current data before a migration

```bash
export FOUNDRY_PASSPHRASE="<secret>"
foundry settings export --output ./before-migration.foundry-backup
```

### Restore a known-good data snapshot

```bash
export FOUNDRY_PASSPHRASE="<secret>"
foundry settings import ./before-migration.foundry-backup
foundry settings get
```

Only run the import after confirming that replacing current data is the user's
intent.

### Export without overwriting an existing file

Use a new filename, or add `--force` only after confirming the destination is
disposable. Without `--force`, the command fails instead of silently replacing
the archive.

## Failure modes

| Code | Meaning | Data changed? |
| --- | --- | --- |
| `PASSPHRASE_REQUIRED` | No passphrase supplied | No |
| `INVALID_PASSPHRASE` | Wrong passphrase or corrupted encrypted content | No |
| `INVALID_BACKUP` | Invalid manifest, checksum, structure, records, or references | No |
| `OUTPUT_EXISTS` | Export destination exists and `--force` was not supplied | No |
| `IMPORT_FAILED` | Unexpected import failure | No verified replacement |
| `IO_ERROR` | Export encryption or filesystem read/write failure | No verified replacement |

Successful export does not verify that the archive can be decrypted with a
different copy of the passphrase; store the passphrase securely.

## Related

- [Settings](settings.md): the CLI-visible preference keys.
- [Instructions](instructions.md): backed-up instruction records and deletion.
- [Agents](agents.md): assignment state and reapplying external files.
