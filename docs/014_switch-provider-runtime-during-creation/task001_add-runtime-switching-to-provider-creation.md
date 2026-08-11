# Task 001: Add Runtime Switching to Provider Creation

## Status

`completed`

## Goal

Add safe runtime selection to Add Provider so a user can create a Codex or Claude Code Provider from either Providers page tab while preserving the semantic distinction between page navigation and a form value.

## Detail

Turn the renderer-local Provider runtime presentation module into the shared source for runtime ordering, labels, official icon assets, and icon rendering. Reuse the shared presentation in the Providers page, Dashboard runtime table, and new Add form control so existing repeated image markup and sizing styles are consolidated. Continue importing the ordered `providerRuntimes` tuple from the shared Provider contract rather than declaring another renderer-only runtime list.

Keep controls aligned with their actual semantics. The Providers page continues to use Astryx `TabList` because it navigates between runtime-scoped list views. Add Provider uses an Astryx `Field` containing a `SegmentedControl` with visible Codex and Claude Code labels and their shared official icons because it selects a submitted form value. Do not wrap both interactions in one visual-control abstraction merely because they share options. Edit Provider does not render the runtime field and continues to derive its immutable runtime from the selected Provider.

Keep the selected Add runtime inside the existing dialog form session, initialized from the runtime captured when the page opens the dialog. The form session continues to own fields, form and avatar errors, avatar intent and preview, save mutation, draft-test mutation, and avatar-picker mutation. A runtime-change event creates the target defaults through `createProviderFormValues(runtime)`, replaces the dirty baseline and controlled form values, resets mutation observers and local feedback, and revokes the renderer-owned avatar object URL. The Dialog, Layout frame, and runtime control remain mounted throughout the reset so changing runtime does not replay the dialog entrance transition. Only the API-key input's local visibility state is keyed by runtime.

Move the existing form and avatar dirty comparison into the smallest pure form-model helper needed by both dialog behavior and focused tests. Compare the current values with the selected runtime session's initial values and include non-preserve avatar intent. Runtime selection by itself is not dirty. An untouched Claude Code form, including its prefilled display names, is clean, and reverting every field and avatar intent to the current session baseline makes the form clean again.

When the user selects a different runtime from an unmodified form, reset the active form state immediately. When the form is modified, retain the requested target runtime and open a destructive Astryx `AlertDialog` titled `Switch Runtime?`. Its description states that the current Provider details will be cleared, and its action identifies the target runtime. Cancelling retains the current runtime, fields, avatar, errors, and test feedback. Confirming resets the active form and therefore clears all common fields, runtime-specific fields, avatar state, API-key visibility, validation and save errors, and completed connection-test feedback. Switching back later creates another fresh default form and never restores the discarded draft.

Disable the runtime `SegmentedControl` while Save or Test Connection is pending. Use the control's `disabledMessage` to explain that a running connection test must finish before the runtime can change. A completed or failed test does not independently block switching, although the modified-form confirmation still applies. The existing native avatar picker remains constrained by its modal interaction and observer lifecycle; resetting its mutation observer must continue preventing late avatar callbacks from changing the reset form or showing obsolete feedback.

Preserve the runtime-specific form rendering, local and main-process validation, draft connection-test request semantics, sensitive API-key handling, avatar ownership, and create response validation. A save failure leaves the selected runtime, current inputs, and errors available for correction. A successful create continues to start a reset of the saved runtime's Provider list before observer-owned UI completion. Update the Providers page success handoff to clear row-level transient actions and set the canonical `runtime` search parameter to the saved Provider's runtime. This keeps the background tab unchanged while the dialog is open, then closes the dialog and shows the refreshed destination list after success. Existing Edit success behavior remains on its already matching runtime.

The implementation must first inspect existing comparable components, helpers, and constants and reuse them when their meaning and ownership match. It must not force reuse across different UI semantics or across renderer and main-process validation trust boundaries. This task applies that principle through the runtime presentation extraction but does not add a repository-wide policy or perform a general duplication audit.

## Findings

None.

## Dependencies

- Existing shared `providerRuntimes` contract and renderer-local Provider runtime labels and official icon assets.
- Existing Astryx `Field`, `SegmentedControl`, `TabList`, and `AlertDialog` components.
- Existing React form-session ownership and TanStack Query mutation observer behavior.
- Existing StyleX design tokens and Provider form-model test approach.
- No new dependency is required.

## Deliverables

- Shared renderer runtime metadata and official icon presentation consumed by Providers, Dashboard, and Add Provider.
- Add-only runtime field with Codex and Claude Code segmented options.
- Stable Add dialog sessions with event-driven runtime resets, current-runtime dirty detection, and destructive switch confirmation.
- Save- and test-pending runtime-switch restrictions with accessible disabled feedback.
- Successful-create handoff that refreshes and navigates to the saved runtime's Provider list.
- Focused form-model verification for runtime baselines and dirty-state behavior.

## Acceptance Criteria

- [x] Add Provider initially selects the Providers page runtime, while Edit Provider exposes no runtime selection and cannot change a stored Provider's runtime.
- [x] Providers page navigation continues to use `TabList`, Add runtime selection uses `SegmentedControl`, and both consume one shared source for runtime ordering, labels, and official icon presentation.
- [x] Dashboard consumes the shared runtime icon presentation without changing its visible runtime data or behavior.
- [x] Selecting another runtime from an unmodified Add form immediately displays that runtime's fresh default form.
- [x] Runtime selection alone is not dirty, the selected runtime's initial defaults are clean, and reverting all field and avatar changes restores the clean state.
- [x] Selecting another runtime from a modified form requires destructive confirmation; cancelling preserves the complete current session.
- [x] Confirming a runtime switch clears every field, avatar choice, API-key visibility state, validation or save error, and connection-test result, and switching back does not restore the discarded draft.
- [x] Runtime switching is disabled while Save or Test Connection is pending, with an accessible explanation while a connection test is running.
- [x] A runtime reset keeps the Dialog frame mounted, revokes its avatar preview URL, and cannot apply late save, avatar-picker, or connection-test UI callbacks to the reset form.
- [x] Runtime-specific fields, local validation, draft-test semantics, API-key handling, create validation, and failed-save recovery remain unchanged.
- [x] Successful creation resets the saved runtime list, closes the dialog with the existing success feedback, updates the canonical runtime query parameter, and displays the destination runtime list.
- [x] The background Providers page runtime remains unchanged before successful creation, and existing Edit completion remains on its matching runtime.
- [x] The implementation introduces no shared-contract, preload, IPC, main-process, SQLite, dependency, or broad repository-policy change.
- [x] Focused tests, type checking, linting, the production build, diff validation, and static inspection pass.

## Out of Scope

- Runtime selection or runtime mutation in Edit Provider.
- Cross-runtime draft preservation, recovery, copying, conversion, or model-field mapping.
- A shared visual-control wrapper for semantically different page tabs and form inputs.
- Changes to Provider persistence, shared contracts, preload APIs, IPC, main-process validation, connection requests, or SQLite.
- Additional runtimes, runtime discovery, or external runtime configuration changes.
- A repository-wide `AGENTS.md` reuse policy or a general component, helper, constant, or duplication audit.
- A new form library, state-management layer, UI dependency, or automated test framework.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or automated visual acceptance.

## Handoff

Completion closes Plan 014 with one explicit Add Provider destination-runtime workflow, semantically correct page and form controls, shared runtime presentation, deterministic in-session form reset, and destination-list navigation. Repository-wide reuse-evaluation guidance was added later as a separate maintenance change and does not alter this task's product boundary.

## Verification

- Compiled and ran the focused Provider form-model suite through the repository's existing built-in `node:test` approach: all 8 tests passed. Task-specific coverage proved clean Codex and Claude Code defaults, common-field changes and reversion, replace and remove avatar intent, and cross-runtime baseline isolation.
- `pnpm typecheck` passed for the node and web TypeScript projects.
- `pnpm lint` passed with only the repository's existing package-manager and upstream ESLint deprecation warnings.
- `pnpm build` passed the full typecheck and Electron Vite production build for main, preload, and renderer; the renderer transformed 2,418 modules.
- `git diff --check` passed, and an explicit whitespace scan covered the new untracked plan and runtime-icon files.
- Static inspection confirmed that Providers navigation and the Add form retain distinct `TabList` and `SegmentedControl` semantics while consuming shared runtime ordering, labels, and icon presentation.
- Static inspection confirmed Add-only runtime ownership, clean and dirty switch paths, test- and save-pending restrictions, stable Dialog ownership, event-driven form reset, mutation-observer isolation, avatar URL cleanup, and successful destination-runtime query navigation.
- Static inspection confirmed unchanged Edit runtime ownership and no shared-contract, preload, IPC, main-process, persistence, dependency, standalone CSS, raw layout element, or hardcoded CSS value changes.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.

## Maintenance Adjustments

### 2026-08-11 10:31:56: Preserve Dialog Frame During Runtime Changes

- Change: Runtime changes now reset controlled form state and mutation observers inside the mounted dialog session. The Dialog, Layout frame, and SegmentedControl remain mounted, while the API-key input alone is keyed by runtime to reset its private visibility state.
- Previous state: Changing runtime keyed the entire Add form session by runtime, which unmounted and remounted the Dialog and replayed its visual transition.
- Reason: User validation found a visible flash when switching runtime because the complete dialog frame was recreated.
- Documentation impact: Updated Task 001's current implementation detail, deliverable, acceptance statement, handoff, and static verification record to describe stable dialog ownership and event-driven reset.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed; static inspection confirmed the runtime-level form-session key and Add coordinator were removed.
