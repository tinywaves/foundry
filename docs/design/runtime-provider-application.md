# Runtime Provider Application

## Status

Implemented. The Runtime Assignment migration was approved and is applied to the
persistent Foundry database.

## Scope

- Support both Codex and Claude Code from the Runtime page.
- Show one fixed card for each Runtime.
- Detect each Runtime when the page opens and provide manual detection retry.
- Disable configuration application when the Runtime executable cannot be detected and executed successfully.
- Use only `~/.codex/config.toml` and `~/.claude/settings.json` in the initial version.

## Runtime State

- Store one row for each supported Runtime.
- `managed = false` with no Provider means Foundry has not taken ownership.
- `managed = true` with a Provider reference assigns that saved Provider.
- `managed = true` without a Provider reference assigns Official Default.
- Store the most recent successful application time.
- Database state represents Foundry's management intent; external file edits do not change the Runtime Assignment.
- Do not infer or import a Runtime Assignment from existing configuration files.

## Card Interaction

- The card selects a compatible saved Provider or Official Default.
- The card action is named `Save` and remains available when the selected option has not changed, allowing the assignment to be applied again.
- Clicking `Save` opens the Preview Dialog; no file or database state changes before final confirmation.
- The Dialog's final action is named `Apply`.

## Preview Dialog

- Show the target configuration file path.
- Show changed managed fields in the expanded upper section.
- Show unchanged managed fields in a collapsed lower section.
- Render configuration keys and values in a code-oriented style.
- Render API keys as hidden SecretInput-style values with explicit Reveal controls for current and proposed values.
- Keep a permanent `Refresh` action that rereads the file and replaces the Preview and file hash.
- Keep the Dialog open and show an error Toast when Apply detects that the file changed after Preview.
- Do not add a separate stale-preview state; the user may refresh after an Apply error.
- When multiple Codex Provider keys exist, first return the candidate keys without their configurations. After the user selects a key, request and render the Diff for that key.
- Keep the multiple-key selector visible above the Diff while still rendering `model_provider` itself in Changes or Unchanged according to its current and proposed values.

## Codex Provider Key

- Scan every `[model_providers.<key>]` table without using the top-level `model_provider` to choose a key.
- Use `foundry` when no Provider table exists.
- Automatically use the sole key when exactly one Provider table exists.
- When multiple keys exist, show a key selector in the Preview Dialog and update the Preview for the selected key.
- Propose the selected key as the top-level `model_provider` value.
- Ignore direct values under `[model_providers]`; only nested `[model_providers.<key>]` tables are candidates.
- Overwrite invalid value types in Foundry-managed candidate fields and show their current serialized values in the Diff instead of rejecting the Preview.
- Reject only configuration content that cannot be parsed or safely preserved as a whole.
- Preserve all Provider tables and all fields outside Foundry's managed field set.
- Switching saved Providers modifies the managed fields under the chosen key rather than creating another key.
- Official Default removes the top-level active selection but retains all Provider tables.

## File Safety

- Create the standard user configuration directory and file when the Runtime is installed but they do not exist.
- Never create project-level Runtime configuration.
- Preserve existing file permissions and formatting where possible; use user-only permissions for new files and backups.
- Keep only the latest backup beside each configuration file using the `.foundry-backup` suffix.
- Apply only when the current file hash matches the Preview hash.
- Write through a temporary file and atomically replace the target.
- Persist the Runtime Assignment only after the file write succeeds.
- Restore the backup if persistence fails; delete a newly created file if the overall operation must roll back.

## Official Default

- Applying Official Default to an unmanaged Runtime is an explicit authorization to remove the full Foundry-managed field set and records the Runtime as managed with no Provider reference.
- Remove every Foundry-managed active field from Claude Code while preserving unrelated `env` entries and all credential state.
- Remove Codex top-level Provider and model selection fields while retaining all Codex Provider tables and credential state.
- Never invoke Runtime logout or modify official account credential files.
