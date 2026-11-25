# Data Transfer

## Commands

```bash
foundry data-transfer status
foundry data-transfer export --output <path> [--force]
foundry data-transfer inspect <path>
foundry data-transfer import <path>
```

Alias: `foundry data ...`. `import` also supports `restore`.

Pass the passphrase through `FOUNDRY_PASSPHRASE`; `--passphrase` is also
accepted but may expose the secret in shell history or process inspection.

## Status

```json
{
  "activeJobCount": 0,
  "isBusy": false
}
```

`activeJobCount` counts pending/running fetch jobs. Export, inspect, and import
are blocked when the current Foundry storage has active jobs. Concurrent
transfers return `BUSY`.

## Export

```bash
export FOUNDRY_PASSPHRASE='...'
foundry data-transfer export --output ./foundry.foundry-backup
```

Behavior:

- Exports and imports JSON snapshots with `data/foundry.json`. SQLite-based
  backup archives are not supported.

- Produces an encrypted `.foundry-backup` archive.
- Settings are included in the JSON snapshot. Device connection configuration
  is not exported.
- If `--output` is omitted, writes `foundry-<iso-timestamp>.foundry-backup` in
  the current directory.
- Appends `.foundry-backup` when the destination lacks that extension.
- Creates missing destination directories.
- Refuses to overwrite by default; use `--force` only with explicit intent.
- Uses restrictive file permissions on POSIX systems.

Response:

```json
{
  "filePath": "/absolute/path/foundry.foundry-backup",
  "providerCount": 2,
  "captureCount": 10,
  "jobCount": 14
}
```

Counts describe records present in the exported snapshot.

## Inspect

```bash
foundry data-transfer inspect ./foundry.foundry-backup
```

Inspection:

- requires a non-empty passphrase
- blocks if current Foundry has active jobs
- decrypts and validates the archive
- verifies manifest, checksums, JSON format compatibility, record references, provider/capture/job rows, and capture success pointers
- returns a preview without replacing current data

Response:

```json
{
  "importId": "<temporary-id>",
  "fileName": "foundry.foundry-backup",
  "exportedAt": "<iso>",
  "appVersion": "3.1.3",
  "dataFormatVersion": 1,
  "settingsVersion": 1,
  "providerCount": 2,
  "captureCount": 10,
  "jobCount": 14
}
```

The `importId` is for the temporary API-style inspection flow. The CLI cleans
the staged import before exiting, so do not attempt to reuse that ID in a later
command.

## Import

```bash
export FOUNDRY_PASSPHRASE='...'
foundry data-transfer import ./foundry.foundry-backup
```

Import performs inspection and commit in one process:

1. Validate current state has no active jobs.
2. Decrypt and validate the archive.
3. Stage the imported JSON snapshot, including settings.
4. Replace current providers, captures, fetch jobs, and settings in one
   recoverable JSON file transaction. Device connection configuration is left unchanged.

This operation is destructive: the current Foundry storage and settings are
replaced by the archive. Run `inspect` first and summarize the preview unless
the user explicitly asked for immediate restoration of a known-good file.

Response:

```json
{
  "status": "imported",
  "preview": {
    "importId": "<temporary-id>",
    "fileName": "foundry.foundry-backup",
    "exportedAt": "<iso>",
    "appVersion": "3.1.3",
    "dataFormatVersion": 1,
    "settingsVersion": 1,
    "providerCount": 2,
    "captureCount": 10,
    "jobCount": 14
  }
}
```

After import, query the affected feature commands to verify the new state.

## Errors

- `PASSPHRASE_REQUIRED`: no passphrase supplied.
- `INVALID_PASSPHRASE`: decryption failed.
- `INVALID_ARCHIVE`: malformed, incomplete, corrupt, or semantically invalid
  backup.
- `UNSUPPORTED_ARCHIVE`: unsupported archive or settings version.
- `NEWER_SCHEMA`: archive data format is newer than the installed Foundry.
- `ACTIVE_JOBS`: pending/running jobs block transfer.
- `BUSY`: another transfer is already running.
- `IMPORT_NOT_FOUND`: staged import is unavailable.
- `IO_ERROR`: filesystem or other transfer I/O failure.
- `OUTPUT_EXISTS`: export destination exists and `--force` was not supplied.

Do not extract, patch, or repack a `.foundry-backup` manually. Treat the archive
format and manifest validation as compatibility contracts.
