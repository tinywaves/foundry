# Encrypted data export and import

Status: accepted. Updated for JSON file storage.

Foundry exports an authenticated encrypted `.foundry-backup` envelope containing
an archive version 3 ZIP with `manifest.json` and `data/foundry.json`. The JSON
snapshot includes settings, providers, captures and fetch jobs. The manifest
records the app version, data format version, file size and SHA-256 checksum.
Device connection configuration is excluded.

Only JSON snapshots are accepted. There is no SQLite conversion path or
compatibility importer for earlier SQLite backup formats.

Inspect validates the envelope, allowed ZIP entries, checksums, format version,
record shapes, active uniqueness rules, references and successful-job pointers.
It returns a preview without changing live records. Newer formats are rejected.
Pending/running jobs block export, inspect and import.

Import replaces settings and all records under the workspace maintenance gate.
The runner pauses and active jobs are rechecked under the storage process lock.
A durable redo journal records the replacement before record files are changed;
recovery completes an interrupted committed replacement before serving reads.
A failure before the journal commits leaves the previous records intact. The
runner resumes and settings changes are announced when the operation finishes.

Backups preserve the existing AES-256-GCM envelope and passphrase handling.
Data format changes require validation and encrypted round-trip tests.
