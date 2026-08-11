# Switch Provider Runtime During Creation

## Status

`completed`

## Goal

Allow users to select the destination Agent Runtime inside Add Provider so they can create a Codex or Claude Code Provider without first navigating to that runtime's page tab.

## Detail

Add Provider defaults to the runtime selected on the Providers page when the dialog opens and presents a compact Codex and Claude Code runtime selector before the Provider fields. The selected runtime determines the form fields, initial defaults, validation, connection-test behavior, and create destination. Edit Provider does not offer runtime selection, and an existing Provider's runtime remains immutable.

An unmodified Add form switches runtimes immediately. If the user has changed a field or avatar relative to the current runtime's initial defaults, switching requires confirmation because the current form will be cleared. Cancelling the confirmation preserves the runtime and all current state. Confirming discards every current field value and avatar choice, clears validation, save, and connection-test feedback, rejects obsolete asynchronous results, and initializes a fresh form with the target runtime's defaults. Runtime-specific drafts are not retained when switching away or restored when switching back.

The dialog's runtime selection remains independent from the Providers page tab while the dialog is open. Creating a Provider successfully closes the dialog, shows the existing success feedback, refreshes the destination runtime's list, and changes the page tab to that runtime so the new record is visible. A failed create keeps the selected runtime and current form available for correction.

The work remains in the renderer and preserves the existing Provider persistence, typed Electron boundaries, query ownership, security model, design system, and non-visual verification policy.

## Scope

- Add a Codex and Claude Code runtime selector to Add Provider with the page runtime as its initial value.
- Keep form fields, initial values, validation, and draft connection testing aligned with the selected runtime.
- Switch an unmodified form immediately and confirm before discarding modified fields or avatar intent.
- Reset all form, avatar, validation, mutation-feedback, and connection-test state after a confirmed switch.
- Prevent obsolete asynchronous work from affecting the new runtime form.
- Refresh the created Provider's runtime list and switch the Providers page tab after successful creation.
- Preserve existing Add failure recovery, unsaved-close confirmation, and Edit behavior.
- Verify the renderer behavior with focused automated checks, type checking, linting, build validation, and static inspection.

## Out of Scope

- Changing the runtime of an existing Provider or adding runtime selection to Edit Provider.
- Preserving, restoring, copying, or converting form drafts across runtimes.
- Sharing runtime-specific model configuration between Codex and Claude Code.
- Changing Provider persistence, SQLite, shared contracts, preload APIs, IPC, or main-process behavior.
- Adding runtimes beyond Codex and Claude Code.
- Changing normal Providers page tab or list behavior outside the successful create handoff.
- Applying a Provider to an external Agent Runtime or modifying external runtime configuration.
- Adding a dependency or a new general-purpose form or state-management system.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or automated visual acceptance.

## Decisions

- Runtime selection is available only during Add Provider; Edit Provider remains runtime-locked.
- Add Provider initially selects the current Providers page runtime.
- The runtime selector appears before runtime-dependent form content so the create destination is explicit.
- Runtime selection alone is not an unsaved change; modification is measured against the selected runtime's initial defaults, including Claude Code's prefilled display names.
- Switching an unmodified form is immediate, while switching a modified form requires explicit destructive confirmation.
- Confirmed switching clears all common fields, runtime-specific fields, avatar intent, errors, and connection-test feedback instead of retaining a per-runtime draft.
- The target runtime's initial form becomes the new unchanged baseline after a confirmed switch.
- Cancelling a runtime switch preserves the current runtime and complete form state.
- The background page tab does not change while the Add dialog is open.
- Successful creation switches the page to the saved Provider's runtime and exposes the refreshed list; failure leaves the dialog state intact.
- Late results belonging to the previous runtime cannot update, close, or report success in the reset form state.
- Existing Astryx, StyleX, React, TanStack Query, and Provider validation patterns remain in use without a new dependency.

## Tasks

- [x] [Task 001: Add Runtime Switching to Provider Creation](./task001_add-runtime-switching-to-provider-creation.md)
