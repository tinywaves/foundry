# Encrypted data export and import

Foundry remains local-first and does not provide synchronization. Data portability and disaster recovery use a full encrypted snapshot with the `.foundry-backup` extension.

## Archive format

The outer file is an authenticated encrypted container. It uses a versioned plaintext header containing the KDF parameters and nonce, followed by an AES-256-GCM encrypted ZIP. The passphrase is processed with scrypt and is never stored. The ZIP contains:

- `manifest.json`
- `database/foundry.sqlite`
- `settings.json`

The manifest records the archive version, application version, database schema version, settings version, file sizes, and SHA-256 checksums. The application version is informational and never participates in compatibility decisions.

## Compatibility

- A newer envelope, archive, database schema, or settings version is rejected.
- An older database schema is migrated on the staged snapshot before import.
- An older settings version is normalized by the current settings reader.
- `appVersion` is shown in the import preview only.

## Import behavior

Import replaces all Providers, Captures, Scrape Jobs, and application settings. It is not a merge operation.

Export and import are both blocked while a Scrape Job is `pending` or `running`. The decrypted archive is also rejected if it contains an active Scrape Job, preventing an imported snapshot from unexpectedly starting paid work.

The renderer displays a blocking modal during import. The Electron main process owns the actual maintenance lock, pauses the runner, rechecks active jobs, writes the imported settings, and replaces all database rows in one SQLite transaction. The current process remains locked after a successful import and requires a restart.

## Consequences

- The archive includes credentials and must remain encrypted.
- Forgetting the passphrase makes the archive unrecoverable.
- Logs, caches, and other device-local state are not exported.
- SQLite replacement is atomic, but the separate settings file write is not part of the SQLite transaction. This small crash window is accepted for the first version.
- Merge import, selective import, and passphrase recovery are intentionally out of scope.
