# Encrypted backups

Use `FOUNDRY_PASSPHRASE` from the execution environment to keep secrets out of
shell history. Both commands also accept `--passphrase <text>`.

```bash
foundry settings export --output ./backup.foundry-backup
foundry settings import ./backup.foundry-backup
```

Export writes an encrypted `.foundry-backup` file with private file permissions.
An omitted output uses a timestamped filename in the working directory. The
extension is appended when absent. An existing destination is rejected unless
`--force` is supplied. The response contains `filePath`.

Import validates the encrypted archive, manifest version, checksum and basic
data structure, normalizes settings using Foundry's settings rules, and fully
replaces the supported data. It does not merge or offer a preview session.
Missing or invalid fields follow the same normalization rules as regular settings
reads, including default values and numeric bounds. The last successful write
wins. Current backup data includes retained backend feature settings. It is not
limited to the four CLI get/set fields. Instruction Markdown files, provider,
capture, and fetch-job records are outside this backup dataset. Exporting a
backup does not preserve or restore instructions.

Import is destructive. Run it when the user intends to replace current data.
After `{"status":"imported"}`, verify with `foundry settings get`. Import from
the Web UI reloads the page without the hash route; the normal root route opens
Dashboard.

Never print passphrases. A lost passphrase cannot be recovered. Wrong
passphrases or invalid backups return a JSON error without replacing settings.
