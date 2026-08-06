# Task 004: Complete Provider Actions and Connection Testing

## Status

`completed`

## Goal

Complete Provider API-key actions, soft-delete interaction, and saved or draft Codex and Claude Code connection testing, while standardizing application-authored icons on Lucide.

## Detail

Extend the existing typed Provider contract with four purpose-specific operations rather than exposing complete Provider details, arbitrary clipboard access, or arbitrary network requests. `revealProviderApiKey(id)` returns only the active Provider's plaintext API key or `null`. `copyProviderApiKey(id)` reads the active Provider's key and writes it directly through Electron's main-process clipboard API without returning the key to the renderer. `testSavedProviderConnection(id)` tests the currently persisted connection values, stores the resulting historical summary, and returns the updated `ProviderSummary`. `testDraftProviderConnection(input)` accepts only a runtime, Base URL, and optional API key, validates them at the main-process boundary, and returns a transient `ProviderConnectionSummary` without changing SQLite. The preload bridge will expose only these constrained methods and their typed results.

Keep complete API keys out of list responses, connection-test responses, connection summaries, errors, logs, Toasts, and network-failure descriptions. Reveal remains an explicit sensitive-data operation separate from Edit. A missing key is a valid Provider state: Reveal returns `null`, Copy reports that no key is set, and connection tests omit the authentication header. Unknown or soft-deleted UUIDs are `not-found` for Reveal, Copy, and saved connection testing.

Implement connection testing in a focused main-process service using Electron's network stack and an injectable request boundary for deterministic tests. Build request URLs by appending path segments to the validated Base URL while preserving its existing path. Codex sends `GET <Base URL>/models`. Claude Code sends `GET <Base URL>/v1/models`, except that a Base URL whose trailing path segment is already `v1` receives only `/models`. Codex sends `Authorization: Bearer <key>` when a key exists. Claude Code sends `x-api-key: <key>` when a key exists and always sends `anthropic-version: 2023-06-01`. No authentication header is sent for a missing key.

Each probe has a 15-second timeout, performs no retry, uses manual redirect handling so redirects are rejected without forwarding credentials, and does not consume or persist the response body. Any `2xx` response is `connected`; configured model names are not remotely validated. Every completed result receives a completion timestamp. Expected remote failures are successful Provider API responses with a `failed` summary rather than `ProviderApiError` values. Persist only bounded, sanitized categories: timeout, network or TLS failure, rejected redirect, or `HTTP <status> <sanitized status text>`. Remove control characters, cap persisted text to a small fixed length, and never include response bodies, request headers, API keys, or credential-bearing URLs. Validation, IPC, repository, or storage failures continue to use the existing non-sensitive Provider error boundary.

Saved tests must not hold a SQLite transaction open during network I/O. The repository will return an internal connection target containing the active Provider's runtime, Base URL, optional plaintext key, and a connection-identity snapshot. After the request completes, persist the summary only if the row remains active and its Base URL, API key, and versioned model configuration still match that snapshot. A deleted row returns `not-found`; changed connection values reject the stale write with a stable non-sensitive conflict response so an obsolete test cannot overwrite a newer configuration. Multiple tests of the same unchanged connection may complete normally, with the most recently completed result becoming the historical summary.

Update Provider persistence without a schema migration. Create continues to initialize `never-tested`. Update compares normalized Base URL, API key, and serialized runtime model configuration with the active stored row. A change to any of those values atomically resets `connection_status`, `last_tested_at`, and `last_test_error` to the valid `never-tested` tuple. Name, remark, official website, and avatar-only edits preserve the existing summary. Recording a saved connection result updates the existing summary columns and `updated_at` while retaining the row's creation ordering.

Make API-key Copy and Reveal direct actions in the API-key table cell using Astryx `IconButton` controls with Lucide `Copy`, `Eye`, and `EyeOff` icons, specific accessible labels, and tooltips. Rows without a key show only `Not set`. Copy works without Reveal, delegates the complete operation to the main process, shows a brief success Toast, and never automatically clears the system clipboard. Copy or Reveal failures show persistent error Toasts without changing the displayed mask.

The Providers page owns at most one revealed `{ id, key }` value and its timer. Revealing a second row immediately masks the first. The revealed control switches to `EyeOff` and supports explicit early masking. Clear the plaintext state and timer after 30 seconds, on runtime change, list invalidation, successful deletion, and page unmount. Row- and revision-scoped request guards prevent late Reveal, Copy, test, or delete responses from affecting a newer runtime or row state.

Extend each row MoreMenu to contain `Edit`, `Test connection`, a divider, and `Delete`; Copy and Reveal never appear there. While a saved test is running, disable repeat actions for that row and temporarily render `Testing` in its status cell. Completion replaces that row with the returned persisted summary only when it still belongs to the active request revision. A failed persisted status exposes its sanitized `lastError` through a keyboard-focusable Astryx Tooltip while retaining visible `Failed` status text. Internal saved-test failures leave the prior persisted summary visible and use a persistent error Toast.

Add `Test connection` at the start side of the Add/Edit Dialog footer while Cancel and Save remain at the end. Draft testing validates only the current runtime and Base URL, preserves a non-empty API key exactly, permits a missing key, and does not require Name or any model field because the probe does not send model data. The Test button alone enters a loading state; the form remains editable and Save remains independent. Changing Base URL or API key invalidates an in-flight result and clears the previous transient result. Closing or replacing the Dialog also invalidates late results. Show Connected or Failed through an in-dialog Banner. Draft results are never persisted or carried into a later Save: a newly saved Provider starts `Never tested`, and saving changed connection values resets an edited Provider to `Never tested` even after a successful draft probe.

Use Astryx `AlertDialog` for Delete. The confirmation names the Provider and explains that it will be removed from Foundry's active list. The destructive action shows a loading state and prevents duplicate submission. Success closes the confirmation, clears any revealed key for the row, refreshes the selected runtime, and shows a brief `Provider deleted` Toast. Failure keeps the confirmation open and shows a persistent error Toast. The repository continues to perform the existing complete soft delete; this task does not expose restore, purge, or deleted-record browsing.

Install `lucide-react` with `pnpm add lucide-react` and use Lucide for every application-authored icon. Replace the existing Astryx semantic navigation icon names `viewColumns`, `wrench`, and `arrowsUpDown` with Lucide `LayoutDashboard`, `Wrench`, and `ArrowUpDown`, respectively. Provider actions introduced here also use Lucide. Update `AGENTS.md` with the repository convention that application-authored icons come from `lucide-react` and that code must not use Astryx semantic icon strings or hand-authored SVGs when Lucide provides a suitable icon. Icons rendered internally by unmodified Astryx components, including MoreMenu and StatusDot internals, remain owned by Astryx and are not swizzled or replaced.

Expected implementation areas are the shared Provider contract, repository and validation modules, a focused main-process connection-test service, Provider IPC and preload bridges, the Providers page, table, and Dialog, the application navigation, dependency manifests, and `AGENTS.md`. Renderer layout continues to use Astryx, StyleX, and design tokens without raw layout elements or standalone CSS. No external Codex or Claude Code configuration is changed.

## Findings

None.

## Dependencies

### `lucide-react`

- Purpose: Supply the complete application-authored icon set, including distinct `Eye` and `EyeOff` states, and replace the current Astryx semantic navigation icon strings with one explicit icon source.
- Selected version: `^1.28.0`, installed with the repository-required unversioned `pnpm add lucide-react` command so pnpm resolves the current release at execution time.
- Module format: Maintained dual ESM and CommonJS builds with `sideEffects: false`; named imports allow electron-vite to tree-shake the small set of icons used by the renderer.
- TypeScript: Bundled declarations through `dist/lucide-react.d.ts`.
- Compatibility: The published peer range includes React 19, matching Foundry's React 19, TypeScript 5.9, Vite 7, and electron-vite renderer stack. `@astryxdesign/theme-neutral` already resolves Lucide through its own runtime dependency, so declaring it directly should not add a second package instance under the current lockfile.
- Maintenance: Version `1.28.0` was published on 2026-07-30. Current registry metadata, signed package provenance, the active official repository, and frequent recent versions show active maintenance.
- Adoption: The official npm downloads API reported 362,879,386 downloads for 2026-07-05 through 2026-08-03 and 6,186,184 downloads of version `1.28.0` during the checked week.
- Security and license: ISC license, registry integrity and provenance metadata present, no runtime dependencies or install script, and the OSV query for `lucide-react@1.28.0` returned no advisories.
- Operational cost: The published package contains approximately 31 MB and 4,054 unpacked files, but it is already present through the Astryx theme and is tree-shakeable. Foundry adds only a stable direct dependency declaration and selected renderer imports.
- Alternatives: Astryx's semantic registry was rejected because it has `copy` and `eyeSlash` but no distinct `Eye`, and continuing semantic strings would conflict with the confirmed repository-wide Lucide convention. `@heroicons/react@2.2.0` is smaller and maintained but would introduce a second icon visual system, is not already used by the Astryx theme, and had materially lower current npm adoption.
- Sources checked: Official npm package metadata, npm downloads API, npm provenance metadata, official Lucide repository tags, OSV API, local `@astryxdesign/theme-neutral@0.2.0` package metadata, and official Astryx Icon documentation on 2026-08-05.

## Deliverables

- Narrow typed Reveal, Copy, saved-test, and draft-test Provider APIs across shared contract, main process, and preload.
- A deterministic main-process Codex and Claude Code connection-test service with bounded sanitized outcomes.
- Repository support for connection-target snapshots, stale-result protection, summary persistence, and edit-time summary reset or preservation.
- Direct API-key cell actions with one-row Reveal lifecycle, clipboard feedback, and no MoreMenu duplication.
- Saved row testing, transient Dialog testing, persisted status presentation, and sanitized failure-detail access.
- Confirmed soft-delete interaction with loading, success, refresh, and failure behavior.
- A direct `lucide-react` dependency, complete migration of current application-authored icons, and the corresponding repository convention in `AGENTS.md`.
- Focused behavior tests for persistence, probes, sanitization, validation, and stale-operation boundaries.

## Acceptance Criteria

- [x] API-key cells show masked text with direct Lucide Copy and Reveal actions only when a key exists; Copy and Reveal are absent from MoreMenu.
- [x] Copy succeeds without Reveal through the main-process clipboard, confirms success, never returns the key to the renderer, and does not automatically clear clipboard contents.
- [x] Reveal is explicit, exposes only one row at a time, supports early masking, and clears after 30 seconds, runtime changes, list invalidation, deletion, or page unmount.
- [x] Codex and Claude Code probes use the approved URL paths, authentication headers, optional-key behavior, 15-second timeout, redirect rejection, no retries, and any-`2xx` success rule without validating model names.
- [x] Saved tests use persisted values and atomically store Connected or sanitized Failed summaries, while draft Add/Edit tests use current Base URL and API key without saving form values or connection summaries.
- [x] Response bodies, complete URLs containing credentials, headers, and API keys never enter connection summaries, errors, logs, Toasts, or list responses.
- [x] A saved test cannot overwrite a Provider that was deleted or whose Base URL, API key, or model configuration changed while the request was in flight.
- [x] Editing Base URL, API key, or model configuration resets the summary to Never tested, while name, remark, website, and avatar-only edits preserve it.
- [x] Row Testing, Connected, Failed, Never tested, timestamps, safe failure Tooltip, loading, stale-response, and internal-error states follow the approved interaction behavior.
- [x] Dialog testing requires only a valid runtime and Base URL, allows a missing key, remains transient, is invalidated by Base URL or key changes, and does not block independent Save behavior.
- [x] Delete requires an asynchronous destructive confirmation, uses the existing complete soft delete, refreshes and confirms success, and keeps the confirmation available after failure.
- [x] `lucide-react` is a direct dependency, every current application-authored icon is migrated to Lucide, and `AGENTS.md` records the convention without replacing Astryx component-internal icons.
- [x] The implementation introduces no SQLite migration, external runtime configuration change, raw renderer layout element, standalone CSS, or additional unapproved dependency.
- [x] Focused behavior tests, type checking, source linting, electron-vite build, and repository whitespace verification pass.

## Out of Scope

- Applying a Provider to Codex, Claude Code, an Agent, or either runtime's external configuration.
- Model discovery, model-name validation, billable inference requests, latency measurement, retries, redirect following, or continuous health monitoring.
- Persisting draft Dialog test results, automatically testing on Save, or blocking Save based on connection status.
- Clipboard auto-clear, API-key encryption, secure storage, operating-system credential vaults, or changing the approved local plaintext storage decision.
- Restore, purge, deleted-record browsing, or undo for soft-deleted Providers.
- Swizzling Astryx components or replacing icons rendered internally by Astryx.
- Search, sorting, pagination, selection, bulk actions, or changes to existing avatar and Provider form behavior outside the approved test integration.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or automated visual acceptance.

## Handoff

Completion closes Plan 008 with a fully functional Foundry-internal Provider management surface. A later independently approved plan can consume these runtime-scoped Provider records when configuring Agents or writing external Codex and Claude Code runtime configuration, without broadening this plan's management-only boundary.

## Verification

- Compiled the focused Provider repository, form-model, avatar-picker, and connection-test suites to a temporary directory and ran them through `node:test` under Electron's embedded Node.js runtime: all 19 tests passed.
- `pnpm typecheck:node` passed.
- `pnpm typecheck:web` passed.
- `pnpm exec eslint . --ignore-pattern out --ignore-pattern dist` passed with only existing package-manager and deprecated-rule configuration warnings.
- `pnpm exec electron-vite build` passed for the main, preload, and renderer bundles.
- `git diff --check` passed.
- Static inspection confirmed that list, copy, reveal, draft-test, and saved-test responses expose only their approved sensitive-data surfaces and that the connection tester does not consume response bodies.
- Static inspection confirmed that Provider renderer files contain no raw `div`, `span`, or `svg` layout elements and no standalone CSS additions.
- Static inspection confirmed that every application-authored interface icon imports from `lucide-react`; URL favicon data and unmodified Astryx component-internal icons remain outside that convention.
- `pnpm why lucide-react` confirmed one resolved `lucide-react@1.28.0` instance shared by Foundry and `@astryxdesign/theme-neutral`.
- Visual acceptance was not run because repository policy reserves application launch and visual inspection for the user.
