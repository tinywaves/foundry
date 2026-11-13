# Encrypted data export and import

Foundry remains local-first and does not provide synchronization. Data portability and disaster recovery use a full encrypted snapshot with the `.foundry-backup` extension.

## Archive format

The outer file is an authenticated encrypted container. It uses a versioned plaintext header containing the KDF parameters and nonce, followed by an AES-256-GCM encrypted ZIP. The passphrase is processed with scrypt and is never stored. The ZIP contains:

- `manifest.json`
- `database/foundry.sqlite`

The manifest records the archive version, application version, database schema version, file size, and SHA-256 checksum. Settings are stored in and exported with the database. Device connection configuration is not part of the archive.

## Compatibility

- A newer envelope, archive, or database schema is rejected.
- An older database schema is migrated on the staged snapshot before import.
- Archive version 2 stores settings in SQLite. Version 1 archives remain importable:
  their separate `settings.json` is validated and copied into the staged database.
- `appVersion` is shown in the import preview only.

## Import behavior

Import replaces all Providers, Captures, Fetch Jobs, and application settings stored in the database. It is not a merge operation.

Export and import are both blocked while a Fetch Job is `pending` or `running`. The decrypted archive is also rejected if it contains an active Fetch Job, preventing an imported snapshot from unexpectedly starting paid work.

The renderer displays a blocking modal during import. The server owns the maintenance lock, pauses the runner, rechecks active jobs, and replaces all database rows, including settings, in one SQLite transaction. The lock is released and the runner resumes after the operation completes.

## Consequences

- The archive includes credentials and must remain encrypted.
- Forgetting the passphrase makes the archive unrecoverable.
- Logs, caches, and other device-local state are not exported.
- The device-local connection configuration is never imported or replaced.
- Merge import, selective import, and passphrase recovery are intentionally out of scope.
