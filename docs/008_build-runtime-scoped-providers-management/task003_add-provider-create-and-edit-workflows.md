# Task 003: Add Provider Create and Edit Workflows

## Status

`completed`

## Goal

Add complete Codex and Claude Code Provider creation and editing workflows that persist the approved common fields, runtime-specific model configuration, plaintext API key, and optional avatar through the existing typed Provider API.

## Detail

Extend the existing Providers page without changing its runtime isolation or read-only list behavior. Add a text-only `Add provider` Button at the far right of the runtime TabList; no new icon dependency is justified because the installed Astryx semantic icon registry has no add icon. Opening Add captures the currently selected runtime. The dialog will identify that runtime in its title and will not expose a runtime selector, so the captured value cannot change during the workflow.

Add an Actions column to the Provider table. Each row will receive an Astryx MoreMenu containing only `Edit` in this task. The Name presentation remains non-interactive and never opens the dialog. Copy, Reveal, Delete, and Test connection controls remain absent until Task 004.

Use an Astryx `Dialog` with `purpose="form"` and a structured `Layout`: `DialogHeader`, scrollable `LayoutContent`, and a fixed `LayoutFooter`. The content will use `FormLayout`, input components, Stack primitives, StyleX, and existing design tokens without Card-wrapped sections or raw layout elements. The footer will contain only Cancel and Save. A backdrop click will not dismiss the form. Cancel, the header close action, or Escape will close the dialog and discard its current unsaved state without an additional confirmation in this task. While a mutation is running, disable form fields, avatar actions, closing, cancellation, and repeat submission.

The common form will contain:

- An optional avatar preview with Choose image, Replace, and Remove actions as applicable. With no usable custom image, the Astryx `Avatar` default fallback is shown.
- Required Name and Base URL inputs.
- An optional API key rendered as a password input for both Add and Edit.
- An optional Remark textarea.
- An optional Official website input.

The Codex form will require one Default model input and initialize it empty for Add. The Claude Code form will mirror the confirmed mapping structure with Model role, Display name, and Actual request model columns. Sonnet, Opus, Fable, and Haiku each require a display name and request model. Subagent has no display-name input and requires only its request model. A required Default fallback model input follows the mapping rows. New Claude Code forms prefill the four display names as `Sonnet`, `Opus`, `Fable`, and `Haiku`; every request-model input, the Subagent request model, and the fallback model start empty.

Keep renderer validation aligned with the existing main-process rules while retaining the main process as the final trust boundary. Trim and require Name. Require Base URL to be a valid HTTP or HTTPS URL without credentials, query, or fragment. Permit localhost, IP addresses, ports, and paths, and preserve the trimmed textual value rather than normalizing its trailing slash. Trim optional Official website values and require HTTP or HTTPS without credentials while permitting path, query, and fragment. Preserve a non-empty API key exactly, including surrounding whitespace, and convert only an empty string to `null`. Trim Remark and convert an empty result to `null`. Trim and require the active runtime's model values. Do not add name uniqueness, remote model, or connection validation.

Map local and main-process field errors to the owning Astryx input `status`, including nested Claude Code model paths and avatar validation paths. A non-field error or an unrecognized field path will render in a persistent in-dialog error Banner. Changing a field clears its stale field error. A failed create or update keeps the dialog open with all current values. A successful mutation closes the dialog, reloads the active runtime through the existing list revision boundary, and shows a short `Provider added` or `Provider updated` Toast. The refreshed list preserves the repository's existing creation ordering: new Providers appear first, while editing does not move an existing row.

Editing is an explicit sensitive-data action. Selecting Edit opens a dialog-owned loading state and calls `getProviderForEdit(id)` to retrieve complete editable detail, including the plaintext API key and runtime-specific model configuration. If the summary indicates a custom avatar, request it independently through `getProviderAvatar(id)`. The password input receives the complete key, or an empty string for `null`; clearing it and saving stores `null`. Reject a defensive mismatch between the selected row runtime and returned detail rather than rendering or saving it.

The Edit dialog will provide stable loading and detail-error states with Retry and Cancel. Closing one dialog and opening another invalidates obsolete detail, avatar, picker, and mutation responses so late results cannot populate the new form, close it, show a false success Toast, or reload the wrong runtime. Individual stored-avatar failure does not block editing: show the default avatar and an in-dialog warning, but keep the update avatar field omitted so an ordinary save preserves the stored bytes. The user may still explicitly remove or replace that unreadable avatar.

Add one constrained native avatar-selection method to the shared contract and preload surface:

- `selectProviderAvatar()` returns `ProviderApiResult<ProviderAvatarSelection | null>`.
- `null` represents native-picker cancellation without changing form state.
- `ProviderAvatarSelection` contains only a display filename and the existing validated `ProviderAvatar` MIME-and-bytes payload. It never contains an absolute path.

The main process will own Electron's native single-file picker and restrict its visible filters to PNG, JPEG, and WebP. Treat filters and extensions as advisory: inspect the file size and signature bytes, infer an accepted MIME type from actual content, enforce the existing 2 MB maximum, and reject unsupported, empty, oversized, or spoofed files through the stable non-sensitive Provider error model. Do not expose arbitrary path selection, filesystem reads, or Electron APIs. Create and Update continue to validate the returned avatar payload independently before persistence.

Represent avatar mutation intent separately from its preview. Add with no custom selection omits avatar data. Edit uses the existing three states: omitted preserves the stored avatar, `null` removes it, and a validated payload replaces it. Renderer-owned object URLs created from selected or stored bytes must be revoked on replacement, removal, dialog close, obsolete request cleanup, and component unmount. The selected display filename is transient UI state and is not added to SQLite.

No SQLite schema or repository storage behavior changes are required. Expected implementation areas are the shared Provider contract, main-process Provider validation and IPC modules, preload bridge, the Providers page and table, and focused page-local dialog, form-state, validation, and avatar-preview modules. No new third-party dependency will be installed.

## Findings

None.

## Dependencies

None.

## Deliverables

- A runtime-capturing Add provider action and a row-level Edit MoreMenu action.
- Accessible Astryx Add/Edit dialogs with complete common and runtime-specific Provider fields.
- Renderer form-state, normalization, field-error mapping, loading, retry, mutation, and stale-response handling.
- A constrained main-process native avatar picker and typed preload contract that return validated bytes without exposing filesystem paths.
- Avatar choose, preview, replace, remove, preserve, fallback, and object-URL lifecycle behavior.
- Successful create/update refresh integration and brief success Toast feedback.
- Focused behavior verification for form initialization and normalization, runtime model payloads, avatar mutation intent, and native avatar byte validation.

## Acceptance Criteria

- [x] Add provider remains available beside both runtime tabs and creates a Provider only in the runtime captured when the dialog opens.
- [x] Edit is available only through a row MoreMenu, Name remains non-interactive, and Task 004 actions do not appear early.
- [x] Both dialogs expose every approved common field, use a password input for the API key, and persist duplicate names through immutable UUID identity.
- [x] Codex requires one Default model, while Claude Code requires all confirmed display-name, request-model, Subagent, and fallback values with the approved Add defaults.
- [x] Local validation identifies the same URL, optional-value, and model errors as the main boundary without adding remote validation or altering non-empty API-key text.
- [x] Field errors appear on their owning inputs, general failures remain visible in the dialog, and a failed mutation neither closes the dialog nor discards current values.
- [x] Edit explicitly loads the complete Provider detail and API key, clearing the password field persists `null`, and a runtime-mismatched detail cannot be displayed or saved.
- [x] The native picker accepts only actual PNG, JPEG, or WebP content no larger than 2 MB, treats cancellation as no change, and never exposes a selected filesystem path to the renderer.
- [x] Add and Edit implement avatar choose, preview, replace, remove, default fallback, and preserve semantics; stored-avatar load failure cannot silently remove existing bytes.
- [x] Every renderer-created avatar object URL is revoked when replaced, removed, abandoned by a stale request, closed with the dialog, or released on unmount.
- [x] Closing and reopening dialogs cannot allow obsolete detail, avatar, picker, or mutation responses to populate or affect a newer workflow.
- [x] Save disables duplicate actions, successful create/update closes the dialog, refreshes the correct runtime list, and shows the approved success Toast.
- [x] The implementation uses Astryx, StyleX, and design tokens without raw layout elements, standalone CSS, a SQLite migration, or a new dependency.
- [x] Focused behavior tests, type checking, linting, the electron-vite build, and repository whitespace checks pass.

## Out of Scope

- Copying or revealing complete API keys from the table.
- Deleting Providers or confirming deletion.
- Testing saved or unsaved Provider connections and updating connection summaries.
- Applying a Provider to Codex, Claude Code, or an Agent or modifying either runtime's external configuration.
- Runtime selection inside a Provider dialog or changing a Provider's persisted runtime.
- Unsaved-change confirmation when closing Add or Edit.
- Avatar cropping, transformation, remote avatar URLs, drag-and-drop, or persisting the local filename.
- Remote Provider or model discovery and model-name validation.
- SQLite schema changes, encryption, secure storage, or a new test framework.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or automated visual acceptance.

## Handoff

Task 004 will consume the persisted Add/Edit workflows, active-runtime list refresh path, table Actions column, complete controlled form values, and stable row identities. It will add direct API-key Copy and Reveal controls, Delete, and saved/unsaved connection testing without changing the create/edit persistence and validation behavior completed here.

## Verification

- Compiled the focused Provider form-state, native avatar-picker, and existing repository tests to a temporary directory and ran them through `node:test` under Electron's embedded Node.js runtime: all 13 tests passed.
- `pnpm typecheck:node` passed.
- `pnpm typecheck:web` passed.
- `pnpm exec eslint . --ignore-pattern out --ignore-pattern dist` passed. The command emitted only existing package-manager and ESLint-rule deprecation warnings.
- `pnpm exec electron-vite build` passed for the main, preload, and renderer bundles.
- `git diff --check` passed.
- Static inspection confirmed that the renderer receives no selected filesystem path, the main process bounds reads and validates actual image signatures, and Create/Update revalidate avatar payloads.
- Static inspection confirmed that list responses still exclude complete API keys and avatar bytes and that only explicit Edit calls `getProviderForEdit(id)`.
- Static inspection confirmed that each dialog instance owns its detail, avatar, picker, and mutation effects and that every renderer-created object URL has an explicit replacement, retry, close, or unmount cleanup path.
- Static inspection confirmed that Task 003 renderer files contain no raw layout `div` or `span`, standalone CSS, hardcoded color values, or inactive Task 004 controls.
- Visual acceptance was not run because repository policy reserves application launch and visual inspection for the user.
