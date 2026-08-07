# Task 003: Migrate Provider Dialog Mutations

## Status

`completed`

## Goal

Move Provider Dialog save, draft connection-test, and avatar-selection operations to TanStack Query mutations while preserving current interaction and error behavior and materially reducing manual asynchronous state.

## Detail

Replace the Dialog form session's three manually orchestrated mutation workflows with three `useMutation` instances: one for Create or Update save, one for draft connection testing, and one for avatar selection. Continue using `resolveProviderRequest` and `ProviderRequestError` from Task 002 so unsuccessful `ProviderApiResult` values retain their original `ProviderApiError` and unexpected rejected IPC Promises use the existing operation-specific fallback messages. Keep the mutation functions close to the Dialog and do not introduce a generic mutation store, mutation-key registry, or another abstraction layer in this task.

Derive save, test, and avatar-selection pending states directly from their mutation results. Derive the general save Banner, connection-test Banner, and successful or failed connection result from mutation error or data rather than copying them into local state through effects or callbacks. Remove the local `generalError`, `isSelectingAvatar`, `isSaving`, `isTesting`, `connectionResult`, and `connectionError` state values that mutation ownership supersedes.

Keep form values, synchronous validation errors, API field-error projections, avatar errors, avatar intent, and avatar preview as local React state. Add or extract the smallest pure error-projection helpers needed to map a retained `ProviderApiError` into known form fields, avatar fields, and an optional general message. Preserve the current behavior in which editing one field clears only that field's error. A valid resubmission clears prior form and avatar errors before starting; an invalid local submission does not dispatch an IPC mutation and clears the previous general save failure through mutation reset.

The save mutation accepts the already validated and avatar-enriched Create or Update input. Add mode calls `createProvider`; Edit mode calls `updateProvider` with the selected ID. Preserve the current defensive validation that a successful response has the expected runtime and `user-custom` source; an invalid response becomes a typed mutation error and does not close the Dialog or reset the list.

On a valid save success, a hook-level mutation callback starts `resetProviderList` for the saved runtime. Hook-level cache synchronization must still run if the Dialog or Providers page observer has already unmounted. Preserve the existing non-optimistic experience: do not insert or replace a row directly, and continue showing the loading table while the active runtime list reloads. Observer-owned callbacks then show the existing success Toast, reset current page-action state through `onSaved`, and close the Dialog. Those UI callbacks must not run after their Dialog observer has been removed. Edit close continues to cancel and remove the complete-API-key detail query through the Task 002 close wrapper.

The draft connection-test mutation accepts only locally validated connection input. Preserve runtime validation of the returned `ProviderConnectionSummary`: `never-tested`, a null timestamp, or inconsistent `lastError` values remain invalid-response failures. A Provider API `baseUrl` field error continues to project into the form instead of the connection Banner; other domain or IPC failures keep the existing Banner text. Editing Base URL or API key resets the mutation observer. TanStack Query's reset behavior removes the observer from the still-running mutation, so a late IPC result cannot restore loading, data, error, or field-error callbacks for obsolete input. Remove the superseded test revision ref.

The avatar-selection mutation treats native-picker cancellation as a successful no-op. A successful selection creates the existing preview URL and changes avatar intent to `replace`; domain avatar field errors and unexpected read failures retain their current messages. Use mutation pending state for the existing button loading and Remove-button disabling behavior. Observer-owned selection callbacks must not update local preview or errors after unmount. Keep `previewUrlRef`, deterministic URL revocation, the stored-avatar intent guard, and the two resource-lifecycle effects because those own renderer resources rather than remote mutation state.

Remove the general mounted guard once all mutation UI callbacks are observer-owned. Keep interaction work in event handlers and derive render state directly from mutation results; do not add effects that mirror mutation state into React state. Preserve existing functional state updates for field errors. The implementation target is to reduce the Dialog form session from eleven `useState` values to five and remove two mutation-lifecycle refs plus the three manual `try`/`catch`/`finally` request blocks.

Update the direct `ProviderForm` callback type only if needed so avatar selection can invoke the mutation without manufacturing a Promise. No user-visible text, Astryx component, StyleX rule, layout, preload contract, IPC channel, main-process behavior, repository behavior, or SQLite behavior changes in this task.

## Findings

None.

## Dependencies

- Task 002: Migrate Provider Read Workflows, completed.
- Existing `@tanstack/react-query@5.101.4` runtime dependency.
- No new dependency.

## Deliverables

- TanStack Query save mutation for Provider Create and Update operations.
- TanStack Query draft connection-test mutation with stale-result isolation through observer reset.
- TanStack Query avatar-selection mutation with observer-owned callbacks and existing preview resource ownership.
- Pure Provider API error projection and response-validation logic where needed by the mutations.
- Provider list reset initiated by successful save independently of Dialog observer lifetime.
- Focused mutation-model tests using the existing built-in Node test approach.

## Acceptance Criteria

- [x] Add and Edit save operations expose pending and error state through one save mutation without local save loading or general-error state.
- [x] Local validation still prevents invalid save IPC calls and preserves current field messages.
- [x] Provider API form and avatar field errors appear in their current fields, and editing one form field clears only that field's error.
- [x] Unexpected save failures and invalid successful responses retain the existing general save Banner behavior.
- [x] Successful saves remain non-optimistic, start the matching runtime list reset even after Dialog observer removal, show the existing Toast while mounted, reset page-action state, and close the Dialog.
- [x] Edit save closure still removes the complete-API-key detail query.
- [x] Draft connection tests expose pending, error, and connection result through one mutation without local test loading, result, error, or revision state.
- [x] Editing Base URL or API key resets the current draft-test observer, and a late obsolete result cannot restore UI or field errors.
- [x] Draft API `baseUrl` errors and invalid response shapes retain their existing presentation.
- [x] Avatar selection uses mutation pending state, treats picker cancellation as a no-op, and retains current success and error behavior.
- [x] Mutation callbacks cannot update Dialog-local state after observer removal.
- [x] Preview object URLs, stored-avatar intent protection, and deterministic cleanup remain intact.
- [x] The Dialog form session retains only five local state values and no mutation-lifecycle mounted or revision refs.
- [x] No Provider table action is migrated and no mutation-key registry or additional state-management abstraction is introduced.
- [x] Focused tests, type checking, linting, and the production build pass.

## Out of Scope

- Delete, saved connection test, Copy, and Reveal mutations, which remain for Task 004.
- Optimistic list or avatar updates and direct insertion or replacement of saved rows.
- Provider form-field, validation-rule, or error-message redesign.
- Changing visible text, layout, Astryx components, or StyleX styling.
- Main-process, preload, IPC, SQLite, or shared Provider contract changes.
- True lower-level cancellation of an already-dispatched IPC operation.
- A generic mutation store, mutation-key registry, additional state-management dependency, or new automated test framework.
- Automated visual, browser, screenshot, accessibility-tree, or desktop verification.

## Handoff

Task 004 will consume the established `useMutation` ownership pattern, typed Provider request errors, field-error projection, and save-driven list reset behavior. It will migrate Delete, saved connection test, Copy, and Reveal, remove the remaining page-level mounted guards, revisions, loading sets, and temporary list compatibility helpers, and then perform the final async-state complexity audit.

## Verification

- Focused built-in `node:test` coverage passed all 15 Provider form and query tests after temporary CommonJS emission with the project's TypeScript compiler. Task-specific cases covered API error projection, connection response validation, custom save-response matching, and mutation reset preserving the hook-level success callback while suppressing the late observer callback. The temporary output was removed after the run.
- `pnpm typecheck` passed both the node and web TypeScript projects.
- `pnpm lint` passed. Existing upstream ESLint deprecation warnings remain non-failing.
- `pnpm build` passed the full typecheck and Electron Vite production build, including 2,414 transformed renderer modules.
- `git diff --check` passed.
- Static inspection confirmed three Dialog mutations, no mutation-driven effects, exactly five Dialog form-session state values, one preview resource ref, no mutation mounted or revision refs, and unchanged paired preview URL creation and revocation.
- Static inspection confirmed hook-level non-optimistic list reset on successful save, observer-owned Toast and close callbacks, retained sensitive-detail disposal, and unchanged Delete, saved connection test, Copy, and Reveal workflows for Task 004.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
