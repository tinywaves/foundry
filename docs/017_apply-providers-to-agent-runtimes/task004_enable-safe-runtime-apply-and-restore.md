# Task 004: Enable Safe Runtime Apply and Restore

## Status

`completed`

## Goal

Enable the reviewed Runtime target to be safely applied to the macOS Codex or Claude Code user configuration, record the successful Foundry-owned Runtime state, and connect Runtime-effective edits of an In-use Provider to the same application operation.

## Detail

Extend the Runtime contract with one constrained application operation that accepts only the validated `runtime + target` pair already used by Preview and returns the resulting `RuntimeSummary`. The renderer must never submit a configuration path, rendered preview, generated file content, backup path, or plaintext credential. Main-process validation must again confirm the fixed Runtime, target shape, Provider existence, Provider source, and Provider Runtime. The operation must create a fresh configuration plan from the current Provider record and the current on-disk file at execution time; it must not trust a cached Preview or the Provider data visible when the dialog opened.

The main process owns a per-Runtime in-flight guard. Codex and Claude Code operations may run independently, but a second Apply for the same Runtime must fail with a typed conflict while the first is running. Renderer loading states prevent ordinary duplicate submission, while the main-process rule remains authoritative across callers.

Replace `smol-toml` with `@decimalturn/toml-patch` as the single Codex TOML dependency. Use its parser for Preview and Apply validation, its formatting-preserving patch behavior for an existing Codex file, and its stringifier when a new Codex file is required. Construct an updated full object from the freshly parsed configuration, changing or deleting only the fields named by the internal configuration plan. This preserves unrelated keys, table content, ordering, comments, whitespace, and established formatting as far as the patch library's supported TOML structures allow. The execution-time Codex Provider key follows Task 003's rule: reuse the current `model_provider` when it resolves to an existing Provider table, otherwise reuse the sole existing Provider table. Create `foundry_managed` only when no Provider table exists, reject multiple unselected tables as ambiguous, and leave every Provider table unchanged for Official Default.

For Claude Code, parse the fresh `~/.claude/settings.json` as a JSON object, clone its existing structure, and update or delete only Foundry-managed `env` entries. Preserve every unrelated top-level and `env` field. Serialize valid JSON while retaining the source newline convention, detected indentation style, and trailing-newline presence when an existing file provides them. Remove an empty `env` object only when it became empty through removal of Foundry-managed entries; never remove an `env` object that still contains unowned fields.

Applying a Provider writes every proposed managed value from the fresh plan, including removing a managed credential field when that Provider has no API key. Applying `Official Default` removes `model`, `model_provider`, and `forced_login_method` for Codex, or the listed managed Claude Code environment entries. Codex Provider tables remain complete so a later Provider application keeps the same configuration key and conversation identity. This reset is not a snapshot restoration. An Official Default operation against a missing file or a file that already contains none of the managed fields is an external no-op but may still record `official-default` as Foundry's successful state.

Perform a safe external write in the fixed Runtime configuration directory:

1. Re-read and plan from the current configuration and Provider data.
2. If the configuration exists and its generated content will change, replace the Runtime's single fixed backup with the exact pre-write bytes at `~/.codex/config.toml.foundry-backup` or `~/.claude/settings.json.foundry-backup`, with permissions `0600`. No backup history or backup UI is created.
3. If the original file is absent, ensure an older fixed backup cannot be mistaken for the immediately previous state.
4. Create a uniquely named temporary file in the same directory, write the generated content with permissions `0600`, close it, and parse it again with the Runtime's parser.
5. Verify the parsed temporary content contains the planned managed values or removals and retains the unowned values captured by the fresh source read.
6. Atomically rename the validated temporary file over the fixed configuration path.
7. Only after the external replacement succeeds, call the existing `RuntimeRepository` transition for the Provider or Official Default target.

If backup creation, generation, temporary-file writing, validation, or replacement fails, leave the persisted Runtime association unchanged and leave or restore the previous external content. If the configuration replacement succeeds but SQLite recording fails, atomically restore the backed-up content; when the original file did not exist, remove the newly created configuration instead. Always attempt to remove operation-owned temporary material. If recovery itself fails, return a sanitized failure that explicitly states recovery was incomplete rather than claiming the old configuration was restored. Plaintext API keys must not appear in IPC errors, logs, backup-related messages, or successful results.

Upgrade `RuntimePreviewDialog` from read-only closure to confirmation. Once Preview has loaded successfully, its footer contains `Cancel` and exactly one primary command: `Apply Provider` for a Provider target or `Restore Official Default` for the Official Default target. `Restore Official Default` is therefore not an additional action in a Provider dialog. While the operation is running, use the primary button's loading state, prevent dismissal and duplicate submission, and do not add a progress bar. An application failure keeps the review dialog open, shows the sanitized error, and changes the primary command to `Retry Apply`; Retry invokes only the application operation, which re-reads and re-plans again.

On Runtime-page success, close the dialog, clear the successful Runtime's draft target, refresh Runtime and Runtime-scoped Provider query state, and show feedback telling the user to reopen the affected Codex or Claude Code Runtime. Do not terminate, launch, or restart a Runtime. The successful response and refreshed SQLite state are authoritative even when third-party changes later make the external file differ.

Extend the Provider edit workflow without combining Save and Apply into one backend transaction. Categorize `remark`, `officialWebsite`, and avatar changes as display-only. Categorize `name`, `baseUrl`, `apiKey`, and the Runtime-specific model configuration as Runtime-effective. After editing, always call `updateProvider` first. A Save failure stops the workflow and uses the existing Save error handling. A successful display-only edit closes normally without Apply. When Runtime-effective data changed, use the returned Provider summary's authoritative `isInUse` value; if it is true, call the Runtime application operation with that Provider as a distinct second request.

If that second request succeeds, refresh Provider and Runtime state, close the Provider dialog, and give the same reopen-Runtime guidance. If it fails, keep the successfully saved Provider data, move the dialog to an Apply-only failure state with `Provider saved, but couldn't apply`, and expose `Retry Apply` and `Close`. The failure state must not imply that the Provider save rolled back. Retry repeats only Apply against the saved Provider ID and fresh disk content; it must not submit the Provider update again. Do not allow unsaved form edits inside this Apply-only failure state. This retry context is renderer memory only and is intentionally lost when the dialog closes or Foundry restarts.

The application endpoint intentionally permits applying the Provider already persisted for a Runtime because the In-use Provider edit workflow needs to write updated Runtime-effective values. The Runtime page still does not expose a normal-state Re-apply command because its existing draft-target rules keep an unchanged target non-reviewable.

## Findings

None.

## Dependencies

### `@decimalturn/toml-patch`

- Purpose: Parse, patch, stringify, and validate Codex TOML while preserving comments, whitespace, ordering, and source formatting during narrow managed-field changes.
- Selected version: `^3.0.2`, to be resolved by replacing `smol-toml` through `pnpm add @decimalturn/toml-patch` without an explicit version during approved execution.
- Module format: ESM package with explicit package exports and no runtime dependencies.
- TypeScript: Bundled declarations for `parse`, `patch`, `stringify`, `TomlDocument`, and formatting options.
- Compatibility: Declares Node.js `>=16`; compatible with Foundry's Node.js `24.18.0`, TypeScript, Electron main process, and electron-vite build. Its approximately 170 KB unpacked package adds no native or transitive runtime packaging cost.
- Maintenance: Version `3.0.2` was published on 2026-08-09; the registry records 31 releases since April 2025, including active 2.x and 3.x releases during the preceding three months.
- Adoption: The npm downloads API reported 250,652 downloads for 2026-07-11 through 2026-08-09 and 596,237 downloads for 2025-08-10 through 2026-08-09. The official Git repository remained reachable at its current default revision.
- Security and license: MIT licensed, npm provenance and registry signatures are present, the package declares no runtime dependencies or install script, and the OSV query for npm version `3.0.2` returned no advisories.
- Alternatives: Existing `smol-toml` remains a strong parser and serializer but cannot preserve comments or local formatting when an object is serialized, so keeping it would require either a second TOML implementation or whole-file rewriting. A local textual patcher was rejected because correctly handling TOML keys, tables, strings, arrays, comments, and deletion ownership would recreate parser responsibilities and carry greater configuration-corruption risk. Replacing `smol-toml` lets one dependency own parsing, patching, stringifying, and final validation.
- Sources checked: npm registry package metadata, npm downloads API, npm package documentation and bundled declarations, official Git repository, and OSV API on 2026-08-11.

## Deliverables

- A typed Runtime Apply IPC contract, preload method, main-process in-flight guard, and application orchestration that accept only `runtime + target`.
- Runtime-specific Codex TOML and Claude Code JSON mutation/validation behavior that preserves unowned configuration.
- Fixed single-version backups, same-directory temporary files, atomic replacement, SQLite-after-file ordering, and compensating recovery.
- A confirmation-capable Runtime review dialog with target-specific primary text, loading, failure, Retry Apply, success refresh, draft cleanup, and reopen guidance.
- A two-stage In-use Provider edit flow that distinguishes display-only and Runtime-effective changes and preserves stage-specific results.
- Replacement of `smol-toml` with the approved `@decimalturn/toml-patch` dependency and updated automated coverage.

## Acceptance Criteria

- [x] A Runtime Apply request contains only a supported Runtime and target, is revalidated in the main process, and generates its plan from fresh Provider and disk state without accepting renderer-supplied paths, previews, file content, or credentials.
- [x] At most one Apply per Runtime can run at once, while different Runtimes do not share an unnecessary global lock.
- [x] Applying a Codex Provider reuses the selected or sole existing execution-time Provider key, falls back to `foundry_managed` only when no Provider table exists, updates exactly the approved managed fields, and preserves unowned TOML data, comments, order, whitespace, and formatting supported by the patch dependency.
- [x] Applying a Claude Code Provider updates exactly the approved managed `env` values, preserves unrelated JSON data, and retains the existing indentation, newline convention, and trailing-newline behavior.
- [x] Restore Official Default removes only the three Codex selection fields or the managed Claude Code `env` entries, preserves every Codex Provider table and all other unowned fields, does not restore a snapshot, and does not create an empty configuration file when no file or managed fields require a write.
- [x] Every changed existing configuration receives one `0600` `.foundry-backup` containing the immediately pre-write bytes; later successful attempts replace that backup instead of creating history.
- [x] Generated content is written to a `0600` same-directory temporary file, parsed and checked for planned and unowned values, and atomically renamed only after validation succeeds.
- [x] Runtime SQLite state changes only after successful external replacement; any later persistence failure restores the prior file or removes a newly created file, and incomplete recovery is reported explicitly.
- [x] Apply results, failures, logs, and renderer-visible data never disclose plaintext API keys.
- [x] A loaded Provider preview offers `Cancel` plus `Apply Provider`; a loaded Official Default preview offers `Cancel` plus `Restore Official Default`, with no second restore action in a Provider dialog.
- [x] Apply uses button loading without a progress bar, prevents duplicate submission and dismissal while active, keeps failures open with `Retry Apply`, and clears the successful draft while refreshing Runtime and Provider state.
- [x] Success feedback tells the user to reopen the affected Runtime, and Foundry does not terminate, launch, or restart Codex or Claude Code.
- [x] Display-only edits of an In-use Provider save without Apply, while Runtime-effective edits call Save and then Apply as two observable sequential requests based on the saved Provider's authoritative `isInUse` state.
- [x] A Save failure prevents Apply; a Save-success/Apply-failure state preserves the saved Provider, identifies the failed stage, offers only Retry Apply and Close, and Retry invokes Apply without repeating Save.
- [x] Retry state exists only in renderer memory, and the Runtime page continues to omit normal-state Re-apply.
- [x] `smol-toml` is removed from source, `package.json`, and `pnpm-lock.yaml`; `@decimalturn/toml-patch` is the only TOML implementation used by Foundry.

## Out of Scope

- Normal-state Re-apply, drift detection, external-file monitoring, or automatic reconciliation after Foundry restarts.
- Persisting failed Apply targets, Retry Apply state, file hashes, configuration Provider keys, or backup metadata in SQLite.
- Backup history, backup browsing, manual backup restore, or restoration of a pre-Foundry snapshot.
- Linux or Windows paths and file-write behavior.
- Claude Desktop, Claude Code IDE integrations, or Runtime process control.
- Applying display-only Provider edits or combining Provider Save and Runtime Apply into one transaction or one IPC operation.
- Connection-test gating, automatic connection tests, or remote model validation during Apply.
- Renderer-controlled filesystem paths, arbitrary file operations, or plaintext current-disk credentials in previews.

## Handoff

This is the terminal implementation task for Plan 017. Its completed output will leave macOS Codex and Claude Code Provider application operational end to end, with Foundry's SQLite association reflecting only successful externally recovered writes. Normal-state Re-apply and drift reconciliation remain candidates for a separate plan.

## Verification

- Focused main-process and renderer suites passed for fresh planning, Codex key reuse/fallback, TOML preservation and restoration, Claude Code JSON preservation, fixed backup replacement, missing-file rollback, incomplete-recovery sanitization, per-Runtime concurrency, response validation, draft cleanup, and Runtime-effective edit classification.
- `pnpm test` - Passed: 13 test files and 78 tests.
- `pnpm typecheck` - Passed.
- `pnpm lint` - Passed with only the repository's existing ESLint deprecation notices.
- `pnpm build` - Passed for main, preload, and renderer production bundles.
- `git diff --check` - Passed.
- User visual inspection in the Electron application - Accepted by the user after confirming the feature works normally.
