# Task 004: Migrate Provider Table Actions and Complete Async-State Cleanup

## Status

`completed`

## Goal

Move the remaining Provider table operations to TanStack Query mutations and complete the Provider async-state cleanup with less production state and lifecycle code while preserving current concurrent-row, sensitive-data, error, and confirmation behavior.

## Detail

Migrate Copy, Reveal, saved connection testing, and Delete through the existing `resolveProviderRequest` and `ProviderRequestError` boundary. Keep the solution local to the Provider page and table: do not add another state library, Context, generic mutation store, global mutation-key registry, or general request abstraction.

Own Copy and saved connection-test requests at row scope in `provider-table.tsx`. The API-key cell will use one row-scoped Copy mutation and derive the Copy button's loading state directly from `isPending`. Its observer-owned success and error callbacks will preserve the existing success Toast, domain-error message, unexpected-rejection fallback, and row-specific Toast ID. Removing the row because of a runtime switch, list reset, deletion, or page departure must remove the observer and suppress obsolete Toasts without a mounted guard.

The row action cell will own one saved connection-test mutation. Its mutation function will reject unsuccessful Provider API results, unexpected IPC rejections, and successful responses that do not match the requested ID, runtime, and `user-custom` source. A hook-level success callback will call `replaceCachedProvider` for the requested runtime so valid connection results still synchronize the cache after the row observer has been removed. The error Toast will remain observer-owned. Because the connection status and action menu are separate table cells, add only the smallest exact saved-test mutation-key factory needed for the status cell to derive the matching row's pending state through `useIsMutating`. Do not introduce a general mutation-key registry or duplicate pending IDs in React state.

Keep one Reveal mutation in `providers-page.tsx` because only one API key may be revealed at a time. Derive `revealingProviderId` from the mutation's pending state and variables instead of storing it. A successful observer callback will transfer the returned key into the existing local `revealedApiKey` value, immediately reset the observer result, and start the existing 30-second expiry timer. The complete key must never be written to Query cache. A null result retains the current "Provider does not have an API key" error, while domain and unexpected failures retain their existing Toast messages.

Keep the Reveal value and timer as explicit renderer resources. Hiding a key, revealing another row, switching runtime, retrying the list, opening Edit, completing a save for the visible runtime, or leaving the page must clear the current timer and local value as applicable. Resetting the Reveal mutation observer before those transitions must prevent a late IPC result from restoring the key, its loading state, or its Toast. The page-unmount effect will clean up only the timer; mutation observer removal will own request-result suppression.

Replace the manual Delete workflow with one page-level mutation because the page owns the confirmation dialog. Derive the deleting ID and confirmation loading state from the mutation's variables and `isPending`. The mutation function will use the existing typed request adapter. A hook-level success callback will start `resetProviderList` for the deleted Provider's runtime even if the page observer has been reset or removed. Observer-owned success handling will show the existing Toast and clear the confirmation state. A failure will show the existing error Toast, leave the confirmation open, and allow another attempt. The confirmation cannot be dismissed while its mutation is pending.

Reset the Delete observer and clear its confirmation when page actions are reset. A runtime switch or other reset may suppress obsolete UI callbacks, but a completed Delete must still invalidate the runtime carried by its mutation variables. Keep all operations non-optimistic. A successful Delete continues to show the loading table while the affected runtime list reloads, and a successful saved connection test continues to update only an existing matching cached row.

Key the successful `ProviderTable` instance by runtime so switching runtimes deterministically removes all row-scoped Copy and saved-test observers. Preserve independent concurrent operations on different rows: each Copy button and connection status must reflect only its own row, and one row's pending saved test must disable only that row's action menu.

Remove the temporary `reload` and `replaceProvider` compatibility callbacks from `useProviderList`; it will return only the query-derived list state. Provider list Retry will reset the current runtime through `resetProviderList`, and saved-test cache synchronization will call `replaceCachedProvider` from its mutation callback. Remove the page's `updateIdSet`, `copyingProviderIds`, `testingProviderIds`, `deletingProviderId`, `revealingProviderId`, `pageRevisionRef`, `revealRequestRef`, `isMountedRef`, and all four manual request `try`/`catch`/`finally` blocks.

After cleanup, `ProvidersPage` will retain exactly four local state values: runtime selection, Dialog request, revealed API-key value, and Delete confirmation target. It will retain only the Dialog session-key ref and Reveal timer ref. The sole page effect will own timer cleanup rather than remote request state. Keep interaction logic in event handlers and derive mutation state during rendering; do not mirror mutation state through effects.

No visible text, Astryx component, StyleX rule, layout, main-process behavior, preload API, IPC contract, repository behavior, SQLite behavior, API-key persistence, or lower-level cancellation behavior changes in this task.

## Findings

None.

## Dependencies

- Task 003: Migrate Provider Dialog Mutations, completed.
- Existing `@tanstack/react-query@5.101.4` runtime dependency.
- No new dependency.

## Deliverables

- Row-scoped Copy and saved connection-test mutations with exact per-row pending-state ownership.
- Page-scoped Reveal mutation with local sensitive-value and timer ownership.
- Page-scoped Delete mutation with observer-independent runtime cache reset.
- Runtime-keyed table observer lifetime and preserved concurrent-row behavior.
- Simplified `useProviderList` without temporary mutation compatibility callbacks.
- Final removal of superseded Provider page loading sets, revisions, mounted guards, and manual request lifecycle blocks.
- Focused mutation-key, cache-synchronization, and observer-lifecycle verification using the existing built-in Node test approach.

## Acceptance Criteria

- [x] Copy exposes pending state through a row-scoped mutation without a page-level Copy ID set, and preserves the current success and error Toasts.
- [x] Reveal exposes pending and failure state through one mutation without a local revealing ID, revision, or mounted guard.
- [x] Only one API key is revealed at a time, manual hide and replacement still work, and the value is cleared after 30 seconds.
- [x] Revealed API-key values never enter Query cache, and a late result after hide, runtime change, list reset, Edit opening, page departure, or visible-runtime save cannot restore the value or obsolete UI callbacks.
- [x] Saved connection tests remain independently concurrent across rows, and only the matching row displays Testing and disables its action menu.
- [x] Saved connection-test API errors, unexpected failures, and mismatched successful responses retain their current error behavior.
- [x] A valid saved connection-test result replaces only the existing matching runtime row, including when its UI observer has already been removed.
- [x] Delete derives its loading and deleting-row state from one mutation without a local deleting ID or mounted guard.
- [x] Delete failure keeps the confirmation open and retryable, while successful Delete shows the current Toast and reloads only the affected runtime list without optimistic removal.
- [x] Runtime switches and list resets remove obsolete row observers and suppress stale Toast or local-state callbacks while preserving required cache callbacks.
- [x] Provider list Retry and Dialog save retain their current loading-table behavior after the temporary list compatibility callbacks are removed.
- [x] `ProvidersPage` contains exactly four local state values, two resource or session refs, no async mounted or revision refs, and no manual request `try`/`catch`/`finally` blocks.
- [x] No additional state-management dependency, Context, generic mutation store, or global mutation-key registry is introduced.
- [x] Visible UI, error text, Astryx, StyleX, IPC, preload, main process, repository, SQLite, and non-optimistic behavior remain unchanged.
- [x] Focused tests, type checking, linting, and the production build pass.

## Out of Scope

- Optimistic Provider list, avatar, saved-test, or deletion updates.
- A generic mutation API, mutation store, global mutation-key registry, or another state-management dependency.
- Query persistence, mutation persistence, offline replay, polling, Devtools, automatic retry, or background refresh.
- Changing API-key storage, encryption, clipboard handling, or the 30-second Reveal duration.
- Changing Provider validation, field behavior, visible text, layout, Astryx components, or StyleX styling.
- Main-process, preload, IPC, shared Provider contract, repository, or SQLite changes.
- True cancellation of an already-dispatched `ipcRenderer.invoke` operation.
- Migrating another page or introducing a new automated test framework.
- Automated visual, browser, screenshot, accessibility-tree, or desktop verification.

## Handoff

This task completes Plan 009 with all Provider reads and operations owned by TanStack Query where appropriate, local state limited to UI and renderer resources, and the temporary migration compatibility layer removed. Its verified result provides the baseline for closing the plan and reviewing Findings without another implementation task.

## Verification

- Focused built-in `node:test` coverage passed all 16 Provider form and query tests after temporary strict CommonJS emission through the project's TypeScript compiler. The added case proved that saved-test pending state is isolated by both runtime and Provider ID. The temporary output and Node-only global declaration were removed after the run.
- `pnpm typecheck` passed both the node and web TypeScript projects.
- `pnpm lint` passed. Existing upstream ESLint deprecation warnings remain non-failing.
- `pnpm build` passed the full typecheck and Electron Vite production build, including 2,414 transformed renderer modules.
- `git diff --check` passed.
- Static inspection confirmed row-scoped Copy and saved-test mutations, exact saved-test pending subscriptions, hook-level cache synchronization, observer-owned Toast and local-state callbacks, no Reveal value written through a Query cache API, and paired Reveal timer creation and cleanup.
- Static inspection confirmed exactly four `ProvidersPage` state values, two remaining refs, one timer-cleanup effect, no page mounted or request-revision refs, no loading ID sets, and no manual async `try`/`catch`/`finally` blocks.
- The four production files directly changed by Task 004 decreased from 1,171 to 1,152 lines while removing the temporary list compatibility callbacks and page request orchestration.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
