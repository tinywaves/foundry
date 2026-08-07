# Task 002: Migrate Provider Read Workflows

## Status

`completed`

## Goal

Move Provider list, avatar, and Edit-detail reads to TanStack Query while preserving existing loading, error, retry, security, and mutation compatibility behavior.

## Detail

Add a Provider query-key hierarchy with independently addressable runtime lists, runtime-and-Provider avatars, and runtime-and-Provider Edit details. Add a typed request adapter that converts unsuccessful `ProviderApiResult` values into an Error retaining the original `ProviderApiError`, and converts unexpected rejected IPC Promises into the existing operation-specific fallback messages. Later mutation tasks must be able to reuse the same error boundary without losing field errors.

Replace the two permanently mounted `useProviderList` instances with one list query for the selected runtime. Continue filtering returned values so only summaries matching the requested runtime and `user-custom` source can enter the table. Configure successful list data with `staleTime: Infinity` and `gcTime: Infinity`, and disable mount refetching and error retry-on-mount. The first visit to a runtime renders the existing loading table, a failed request renders the existing Banner and explicit Retry control, and later visits during the same application session render cached summaries immediately without an automatic request. Data or errors from one runtime must never appear in the other runtime view.

Preserve temporary `reload` and `replaceProvider` compatibility operations for the manual mutations that remain until Tasks 003 and 004. `reload` will clear the selected runtime's avatar queries and reset its active list query so existing create, update, and delete callbacks retain the current loading-state refresh behavior. `replaceProvider` will update only a matching cached row with the same runtime and `user-custom` source so the existing saved connection test can continue replacing its returned summary without a list request. Neither helper may insert a missing row or update another runtime.

Move custom-avatar reads into row-scoped queries subscribed only by visible Provider rows. Store only the validated avatar MIME-and-bytes payload in the query cache. Configure avatar data with `staleTime: Infinity` and a five-minute inactive `gcTime` so switching away briefly can reuse the bytes without retaining every visited avatar for the full session. Avatar failures remain optional and silent in the table, which continues to render the Astryx default avatar.

Object URLs are renderer resources rather than remote data and must never enter the query cache. A focused row-level hook will create an object URL from successful avatar bytes and revoke it when the bytes change or the row unmounts because of a runtime switch, list reset, deletion, or page departure. Every successful URL creation must have one deterministic replacement or cleanup path.

Refactor the Provider Dialog into a read-query gate and a local form session. Add mode mounts its form session directly and never creates a detail query. Edit mode starts detail and stored-avatar queries concurrently. The detail query alone gates the existing Spinner, error Banner, Retry, and form availability; a slow or failed stored avatar never blocks editing. Once detail succeeds and defensively matches the selected row's ID, runtime, and `user-custom` source, mount a keyed form session whose state initializer converts that detail to form values. Do not copy query data into form state through an effect.

Edit details contain the complete API key. Configure their query with `gcTime: 0`, and on Dialog close or replacement explicitly cancel and remove the exact detail query. The already-dispatched `ipcRenderer.invoke` operation may continue in the main process, but TanStack Query cancellation and removal must prevent a late result from restoring the cache, updating the closed Dialog, or exposing the API key. Detail Retry resets the exact detail query and its stored-avatar query, discards the failed form session, and restores the existing loading state before refetching.

Keep stored-avatar preview adaptation separate from remote query ownership. Apply asynchronously loaded stored-avatar bytes only while the form's avatar intent remains `preserve`. If the user selects a replacement or removes the stored avatar first, a late stored-avatar result must not overwrite the new preview or editing intent. A stored-avatar failure shows the existing warning, leaves the form editable, and preserves stored bytes on an ordinary save unless the user explicitly removes or replaces them.

Retain the existing mutation-owned mounted guard, draft-test revision, loading flags, error mapping, Toasts, and other local state that Tasks 003 and 004 have not yet migrated. No mutation, user-visible text, Astryx component, StyleX rule, main-process behavior, preload contract, IPC channel, or SQLite behavior changes in this task.

## Findings

None.

## Dependencies

- Task 001: Establish Renderer Query Foundation, completed.
- Existing `@tanstack/react-query@5.101.4` runtime dependency.
- No new dependency.

## Deliverables

- Typed Provider request adapter and hierarchical query keys.
- Active-runtime Provider list query with temporary mutation compatibility helpers.
- Row-scoped avatar queries with bounded inactive retention and deterministic object URL ownership.
- Ephemeral Edit-detail query with explicit sensitive-cache cancellation and removal.
- Query-gated Edit Dialog and locally initialized Add/Edit form sessions.
- Focused query-model and cache-behavior tests using the existing Node test approach.

## Acceptance Criteria

- [x] Only the selected runtime requests a Provider list on its first visit.
- [x] Development StrictMode consumers with the same query key reuse the in-flight list request.
- [x] A runtime's first visit shows the existing loading state, while later visits use its session cache without automatic refetching.
- [x] A failed list remains failed until the user explicitly selects Retry.
- [x] Provider data or errors for one runtime never render in another runtime view.
- [x] Existing create, update, and delete callbacks can reset the selected list, and the existing saved test can replace one matching cached row.
- [x] Avatar loading or failure never changes a successful list into a list error.
- [x] Inactive avatar bytes become collectible after five minutes, while every row-owned object URL is revoked immediately when its data or row ownership ends.
- [x] Edit detail loading, failure, Retry, and Cancel retain their current visible behavior.
- [x] Stored-avatar loading or failure does not block editing, and an ordinary save still preserves unreadable stored bytes.
- [x] A stored-avatar response arriving after user replacement or removal cannot overwrite the user's preview or avatar intent.
- [x] Closing or replacing an Edit Dialog cancels and removes its complete-API-key detail query, and a late IPC result cannot restore it.
- [x] Add Dialogs never create a sensitive detail query.
- [x] No Provider mutation is migrated, and existing Toast, Banner, field-error, and button-loading semantics remain unchanged.
- [x] Focused tests, type checking, linting, and the production build pass.

## Out of Scope

- Migrating Create, Update, Delete, Copy, Reveal, avatar-picker, saved-test, or draft-test mutations.
- Optimistic cache or UI updates.
- Provider form validation or field-model redesign.
- Main-process, preload, IPC, SQLite, or shared Provider contract changes.
- True lower-level cancellation of an already-dispatched IPC operation.
- Query persistence, polling, focus refresh, reconnect refresh, or automatic retry.
- User-visible text, layout, Astryx component, or StyleX changes.
- A new automated test framework or visual automation.

## Handoff

Task 003 will consume the typed request adapter, query keys, list cache helpers, and ephemeral-detail ownership established here. It will migrate Dialog mutations to `useMutation` and remove the mutation lifecycle state deliberately retained by this task without revisiting read-query or sensitive-cache design.

## Verification

- Focused built-in `node:test` coverage passed all 6 tests after temporary CommonJS emission with the project's TypeScript compiler. It covered request adaptation, query-key isolation, list and detail validation, cache replacement and reset behavior, approved cache lifetimes, sensitive-detail removal, and late-result suppression. The temporary output was removed after the run.
- `pnpm typecheck` passed both the node and web TypeScript projects.
- `pnpm lint` passed. Existing upstream ESLint deprecation warnings remain non-failing.
- `pnpm build` passed the full typecheck and Electron Vite production build, including 2,414 transformed renderer modules.
- `git diff --check` passed.
- Static inspection confirmed one active-runtime list subscription, in-flight request reuse through the shared QueryClient, explicit Retry-only recovery, runtime-isolated keys and caches, row-scoped avatar queries, and paired object URL creation and revocation paths.
- Static inspection confirmed that Add mode bypasses the detail query, Edit close and replacement remove the exact sensitive detail query, stored-avatar results cannot overwrite replacement or removal intent, and no Provider mutation was migrated.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
