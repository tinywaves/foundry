# Task 003: Add Read-only Runtime Configuration Preview

## Status

`completed`

## Goal

Add a read-only, on-disk configuration preview for Codex and Claude Code so a macOS user can review the exact Foundry-managed field changes for a draft Runtime target before Task 004 enables Apply.

## Detail

Extend the shared Runtime contract with a purpose-specific `previewRuntimeConfiguration` operation. Its input identifies one fixed Runtime and either an active Provider ID or the `official-default` target. The main process must validate the discriminated input, confirm that a Provider target exists, is active, is user-custom, and belongs to the selected Runtime, and reject mismatches before reading configuration. The renderer cannot supply a filesystem path. Resolve the current macOS user's fixed configuration paths in the main process from the home directory supplied by application initialization and expose only the logical paths `~/.codex/config.toml` and `~/.claude/settings.json`. Do not honor `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, or process-launch-specific path overrides in this plan.

Introduce a main-process Runtime configuration planner that reads the selected Provider detail through the existing Provider repository boundary, reads the fixed Runtime configuration file, parses it, extracts only Foundry-managed values, constructs the proposed managed values, and compares them without mutating either SQLite or the external file. Keep the raw configuration and plaintext credentials inside the main process. Project the internal plan into a sanitized IPC result containing the Runtime, authoritative target identity, logical file path, file-existence state, and ordered field rows with `add`, `update`, `remove`, or `no-change` operations. Values crossing IPC must be explicitly discriminated as plain, absent, or secret. Secret projections may contain only presence state and an optional saved-Provider suffix; the planner may compare plaintext values internally to determine the operation but must never return the current on-disk credential or include either credential in an error or log message.

For Codex, read `~/.codex/config.toml` with `smol-toml` and resolve the configuration Provider key before constructing the field plan. If the current top-level `model_provider` is a non-built-in Provider ID and resolves to an explicit table under `model_providers`, reuse that exact ID. This preserves the Provider identity stored in existing Codex conversations, such as `custom`, when Foundry first takes over and across later Foundry Provider switches. Treat the current Codex built-in IDs `openai`, `ollama`, `lmstudio`, and `amazon-bedrock` as ineligible for takeover. When there is no eligible active custom Provider, use `foundry_managed`; the field preview remains responsible for showing any updates to an existing table under that fallback key.

The resolved key is part of the internal fresh configuration plan, not a Foundry Provider association and not additional SQLite state. Preview reads resolve it from the current file, and Task 004 must resolve it again from its execution-time read. After the first successful Apply, the top-level `model_provider` keeps the same key, so later Foundry Provider switches naturally reuse it. If another tool later changes the active key, the next explicit Preview or Apply follows that current file under the already accepted no-drift-control boundary.

A Codex Provider target proposes these managed values:

- `model` from `modelConfig.defaultModel`.
- `model_provider` as the resolved configuration Provider key.
- `forced_login_method` as `api`.
- `model_providers.<resolved-key>.name` from the Provider name.
- `model_providers.<resolved-key>.base_url` from the Provider Base URL.
- `model_providers.<resolved-key>.wire_api` as `responses`.
- `model_providers.<resolved-key>.experimental_bearer_token` from the Provider API key, or absence when the Provider has no API key.

For Claude Code, read `~/.claude/settings.json` with the platform JSON parser. A Provider target proposes these managed entries under `env`:

- `ANTHROPIC_BASE_URL` from the Provider Base URL.
- `ANTHROPIC_AUTH_TOKEN` from the Provider API key, or absence when the Provider has no API key.
- `ANTHROPIC_MODEL` from `modelConfig.defaultFallbackModel`.
- `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_FABLE_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` from the corresponding `requestModel` values.
- The matching `ANTHROPIC_DEFAULT_*_MODEL_NAME` entries from the corresponding `displayName` values.
- `CLAUDE_CODE_SUBAGENT_MODEL` from `modelConfig.subagent.requestModel`.

An `official-default` target proposes absence for the selected Runtime's managed fields. For Codex it uses the same active-custom-key resolution, falling back to `foundry_managed`, so Official Default removes the fields Foundry would currently manage without renaming or scanning unrelated Provider tables. It must not infer or restore a pre-Foundry snapshot. Preserve unrelated top-level values, other Claude Code `env` entries, other Codex Provider definitions, and unknown children of the resolved Codex Provider table outside the known managed keys. A missing file is a valid empty configuration. A read or permission failure returns a sanitized configuration-unavailable error. TOML or JSON syntax failure returns a sanitized configuration-invalid error. A syntactically valid file whose required managed parent path has an incompatible type, such as a non-table resolved Codex Provider value or a non-object Claude Code `env`, is also configuration-invalid; do not project a partial diff that would imply a safe narrow update.

Keep the internal configuration-plan representation separate from its sanitized preview projection. It must describe narrow managed-field mutations without committing to whole-file serialization, comment handling, backup behavior, or replacement mechanics. Task 004 will reuse this planning boundary, re-read the external file at execution time, and separately select and approve the write strategy rather than trusting a stale preview result.

Add a `Review Changes` action to each Runtime row. Derive availability during render: it is enabled only when an available draft target exists and differs from the last state persisted by Foundry. Selecting the already persisted target does not expose normal-state Re-apply. A `not-managed` Runtime targeting `Official Default` is a valid reviewable change. Provider loading failures and unavailable targets keep the action unavailable without weakening the existing scoped Retry behavior.

Opening Review Changes captures the current Runtime and draft target as an immutable dialog context, opens the Astryx Dialog immediately, and starts a fresh preview request. Show stable loading content while the request is pending. On success, show the Runtime, target Provider or Official Default, the Provider's persisted connection status as informational context, the logical configuration path, and an ordered Astryx Table with managed key, current value, proposed value, and change operation. Use Astryx status primitives for the operation labels. Include `no-change` rows so the complete managed surface remains inspectable. Do not show a full serialized file, unrelated configuration, Apply, Restore, or any other write confirmation in this task.

On preview failure, retain the dialog context and show a clear error Banner with Retry and Close actions; never show a partial table. Retry performs a new on-disk read. Closing the Dialog unmounts or discards its preview request state so reopening performs a fresh read rather than relying on a long-lived snapshot.

Current on-disk credential fields always render only as `Configured` or `Not configured` and can never be revealed. A proposed Provider credential is masked by default with its persisted suffix and has an Eye icon action only when that Provider has a key. Reuse `providers.revealProviderApiKey()` for the explicit reveal rather than adding a broader filesystem or Runtime secret endpoint. Keep revealed plaintext in dialog-local renderer state only, never in TanStack Query data. EyeOff, dialog close, target-context replacement, and unmount clear the plaintext. Bind an in-flight reveal result to its Provider ID and ignore a late response for a no-longer-current context. A Reveal failure affects only the secret row, presents retryable inline feedback, and does not invalidate the sanitized configuration preview.

Follow existing boundaries and UI conventions: add constrained Runtime IPC and preload methods, validate the preview result again in the renderer adapter, import Astryx components directly, use Astryx and StyleX tokens for presentation, use Lucide Eye, EyeOff, and RefreshCw icons with accessible labels and tooltips, derive action state without Effect-mirrored server data, and keep repeated field and target lookups efficient. Task 003 must make no external configuration write, Runtime application-state write, Provider mutation, or In-use projection change.

## Findings

None.

## Dependencies

### `smol-toml`

- Purpose: Parse the user's Codex TOML configuration in the main process so the preview can compare real managed values without using an ad hoc TOML scanner. Task 003 uses parsing only, not serialization.
- Selected version: `^1.7.1`, resolved by running `pnpm add smol-toml` without an explicit version during approved execution.
- Module format: ESM package with explicit ESM and CommonJS exports.
- TypeScript: Bundled declarations through the package export map.
- Compatibility: Requires Node.js 18 or newer and is compatible with the project's Node.js 24.18.0, TypeScript 5.9, Electron 39, and electron-vite main-process build.
- Maintenance: Version 1.7.1 was released on 2026-07-26; the repository was active in August 2026 and was not archived.
- Adoption: Approximately 107,413,876 npm downloads in the month ending 2026-08-09, with 302 GitHub stars at the time of review. The unpacked package is approximately 206 KB and has no runtime dependencies or install script.
- Security and license: BSD-3-Clause. An OSV query for exact version 1.7.1 returned no applicable advisories. Historical recursion-based denial-of-service advisories were fixed before this version, and the 1.7.1 release includes the latest listed security fix. Parsing remains inside error handling and the input is the fixed local user configuration rather than renderer-supplied content.
- Alternatives: Rejected `@iarna/toml` 2.2.5 because its packaging and release line are materially older despite approximately 26,059,649 monthly downloads. Rejected `@taplo/lib` 0.5.0 because its approximately 35.6 MB unpacked size and additional dependency are excessive for a read-only parse requirement despite the broader Taplo toolkit's activity.
- Sources checked: npm registry metadata and download API, GitHub repository and release APIs, and OSV API on 2026-08-11.

## Deliverables

- A typed Runtime configuration-preview request, sanitized result contract, error model, preload method, and trusted main-frame IPC handler.
- A main-process Runtime configuration planner with fixed macOS path resolution, Provider-target validation, TOML and JSON readers, active custom Codex Provider-key resolution, managed-field mappings, operation classification, and secret-safe preview projection.
- Focused Codex and Claude Code configuration-planning tests covering Provider and Official Default targets, including active custom Codex Provider reuse and safe fallback behavior.
- Renderer preview query/request adaptation with boundary validation and fresh-per-dialog loading and Retry behavior.
- A Review Changes action and read-only Astryx Dialog with target context, connection status, file metadata, field-level operations, and complete loading and failure states.
- Dialog-local proposed API-key Reveal with race protection, explicit re-masking, and isolated failure feedback.

## Acceptance Criteria

- [x] Each Runtime exposes Review Changes only when its available draft target differs from Foundry's persisted Runtime state; selecting the persisted target does not create a Re-apply path.
- [x] Opening Review Changes performs a fresh read of the fixed Runtime user configuration and presents the captured Runtime and target without modifying the selector, SQLite, Provider data, In-use state, or any external file.
- [x] Codex preview uses `~/.codex/config.toml`, reuses an eligible active custom Provider key or safely falls back to `foundry_managed`, and includes exactly the approved model, Provider, authentication, Base URL, wire API, and optional bearer-token managed fields.
- [x] Claude Code preview uses `~/.claude/settings.json` and exactly the approved Base URL, optional token, fallback model, role model and display-name, and subagent `env` fields.
- [x] Provider and Official Default targets accurately classify every managed field as add, update, remove, or no change while excluding unrelated configuration and full serialized file content.
- [x] A Provider without an API key proposes credential-field removal rather than an empty credential value.
- [x] A missing configuration file is previewed as an empty configuration, while unreadable, malformed, or structurally conflicting managed configuration produces a sanitized blocking error with Retry and Close and no partial table.
- [x] Current on-disk credentials never cross IPC as plaintext or become revealable, and no preview result, error, log, or automated-test failure includes a plaintext credential.
- [x] A proposed saved Provider key is masked by default, is revealed only through the existing explicit Provider capability, and is cleared by Hide, dialog close, context replacement, or unmount; late Reveal results cannot populate a stale context.
- [x] Provider connection-test state is visible context but never changes preview availability or failure behavior.
- [x] Loading, successful preview, preview failure, Reveal loading, Reveal failure, and no-key states remain coherent at supported application window sizes with accessible controls and no overlapping content.
- [x] Existing Provider and Runtime behavior remains passing, and focused tests cover target validation, both Runtime mappings, missing and invalid files, diff operations, secret sanitization, and renderer contract validation.

## Out of Scope

- Apply, Restore Official Default execution, Retry Apply, external writes, backups, validation-before-replacement, atomic replacement, recovery, or Runtime application-state recording.
- Provider Edit Save-then-Apply orchestration.
- Trusting or submitting a previously rendered preview as a write payload; Task 004 must generate a fresh main-process plan.
- Whole-file TOML serialization, comment or formatting preservation, and selection of Task 004's write strategy.
- Persisting the resolved Codex configuration Provider key in SQLite, migrating existing Codex conversation metadata, or controlling Codex history filtering.
- `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `auth.json`, shell profile edits, process environment mutation, `models.json`, `model_catalog_json`, `model_reasoning_effort`, and `preferred_auth_method`.
- Normal-state Re-apply, drift detection, full-file inspection, unrelated-field preview, or current-disk-secret Reveal.
- Non-macOS behavior or browser, screenshot, accessibility-tree, and desktop-automation visual verification.

## Handoff

Task 004 will consume the validated Runtime target contract, fixed configuration paths, active custom Codex Provider-key resolution, Provider-to-managed-field mappings, on-disk readers, narrow internal configuration-plan representation, operation classification, and secret-safe preview UI. It will re-read and re-plan from current disk content at Apply time, add the separately designed preservation and write strategy, perform backups and atomic recovery, record Runtime state only after external success, and replace the read-only dialog action with the approved Apply or Restore confirmation without accepting renderer-supplied file content or paths.

## Verification

- `pnpm test` - Passed: 12 test files and 60 tests, including active custom Codex Provider-key reuse, built-in Provider fallback, and dynamic renderer preview validation.
- `pnpm typecheck` - Passed for the main/preload and renderer TypeScript projects.
- `pnpm lint` - Passed; only existing ESLint configuration deprecation warnings were reported.
- `pnpm build` - Passed for the Electron main process, preload, and renderer production bundles.
- `git diff --check` - Passed.
- Manual contract inspection - Passed: the Runtime preload exposes only list and sanitized preview operations, accepts no renderer path, and exposes no Runtime mutation operation.
- User visual inspection in the Electron application - Accepted by proceeding to Task 004.
