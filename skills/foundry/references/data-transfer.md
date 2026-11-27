# Data Backup Commands

The CLI and Web UI share the `data-export` and `data-import` services and the
`foundry.data` version 1 backup format. The command group retains the name
`data-transfer` (alias `data`).

## Export

```bash
foundry data-transfer export --output <path> [--force]
```

Use `FOUNDRY_PASSPHRASE` for the encryption password, or pass `--passphrase`.
Passwords preserve case and whitespace. Output is an authenticated encrypted
`.foundry-backup` file. Existing destinations require `--force`; a missing
extension is added automatically. The JSON result contains `filePath`.

The application data contract currently contains settings. Provider, capture,
and fetch-job collections are not yet included. Runtime paths are excluded.

## Import

```bash
foundry data-transfer import <path>
```

Use the same password as export. This command directly replaces the current
application data with the backup, without merging or retaining a preview
session. The JSON result is `{ "status": "imported" }`.

Only current `foundry.data` backups are accepted; legacy `foundry.snapshot`
archives and raw JSON are unsupported. Decryption, archive structure, checksum,
and the presence of a settings object are checked. Import and export both use
the application normalization rules for defaults and supported fields. Import
replaces the complete normalized settings without merging current values.
The operation has no application file-size limit. Storage transactions protect
writes; the last successful import wins. Failed imports leave previous data
intact. There is no automatic pre-import backup or undo.

`status` and `inspect` are no longer commands. The Web UI reloads at its root
route after import; CLI callers can verify with `foundry settings get`.
