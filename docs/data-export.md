# Data export and import

The Web UI exports Foundry application data through `POST /api/data-export`
and imports it through `POST /api/data-import`. The CLI commands
`foundry data-transfer export/import` call the same feature services.
Settings → Advanced contains the entry point; export is its own feature on both
the server and Web client.

`FoundryData` in `packages/shared/src/data-export.ts` defines the current data
payload. It currently contains settings because Settings is the feature
implemented in the new UI. As other features are implemented, extend this
payload and `src/features/data-export/repository.ts` to collect their data, and
`src/features/data-import/repository.ts` to replace that data on import.
The download, password dialog, archive and encryption pipeline remain shared.
The archive and encryption utilities live in `src/lib/backup`.

The `.foundry-backup` download uses the existing AES-256-GCM envelope. Inside
is a ZIP containing `manifest.json` and `data/foundry.json`. The manifest uses
format `foundry.data`, archive version 1, app version, creation time, data size
and SHA-256 checksum. The data JSON currently has the shape `{ "settings": … }`.
The runtime config-folder path is not application data and is excluded.
Import and export both follow `normalizeSettings`: missing or unsupported values
use its defaults, and fields are retained or removed according to that one rule.

The backup format is `foundry.data` version 1. Legacy `foundry.snapshot`
backups are not accepted. The old data-transfer service, routes, preview
sessions, task blocking and status reporting have been removed. The CLI retains
its `data-transfer` command name (alias `data`) with export/import operations.

## Full replacement import

The Web UI asks for the selected backup's password and displays the overwrite
warning in one dialog. Confirming sends a single `POST /api/data-import` request
with an octet-stream body and URL-encoded passphrase header. There are no preview
sessions, inspect/commit/cancel endpoints, expiration times, or application size
caps on the upload, manifest, or expanded archive. Available disk and memory
still bound the operation.

Tabs submit independently. Imports are applied in transaction commit order;
the last successful write wins without invalidating another tab's selected file.

Import decrypts into a private temporary directory and checks the backup format,
version, expected ZIP entries, data size/checksum, valid JSON, and the existence
of a settings object. It does not validate individual settings fields or reject
partial settings. It normalizes the backup settings and replaces the complete
settings file inside a FoundryStorage transaction. Current settings are not
merged into the backup, and the runtime config-folder path stays local.

Temporary files are removed afterward. Failures before the transaction commits
preserve existing data. After success, the frontend performs a full navigation
to the app's root URL without the settings hash; the new page fetches its data
from scratch. It does not patch or invalidate the previous page's query cache.
