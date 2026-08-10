# Task 004: Improve Provider Form and Feedback

## Status

`completed`

## Goal

Make Provider create and edit workflows easier to understand and recover from while protecting users from accidental loss of unsaved changes.

## Detail

Assign each Provider text control a stable HTML field name matching its form-state path, including nested runtime model configuration fields. When local validation or an API response produces field errors, focus the first matching control after React applies the error state. Keep avatar-only and general errors in their existing non-field feedback regions.

Capture the initial form values when a dialog session starts and compare them with current values and avatar intent. If the user closes a dirty Add or Edit dialog, keep the form open and show a destructive confirmation before discarding changes. Close immediately when the session is unchanged, and continue preventing dismissal while a save is pending.

Clarify dialog titles, section headings, primary actions, connection-test actions, success and failure Banners, loading labels, and detail-load recovery guidance. Use Add Provider for creation and Save Changes for editing so the primary action reflects the workflow outcome. Preserve form values after failures, the existing field-error mapping, draft connection testing, avatar ownership, API-key handling, and TanStack Query cleanup.

## Findings

None.

## Dependencies

- Task 003: Refine Provider Runtime Navigation, completed.
- Existing Provider form-state, validation, API-error mapping, and avatar-intent modules.
- Existing TanStack Query create, update, draft-test, detail, and avatar mutations.
- Existing Astryx Dialog, AlertDialog, Banner, form, and input components.

## Deliverables

- Stable HTML names for all Provider text inputs.
- First-invalid-field focus for local and API validation failures.
- Dirty-form detection covering values and avatar intent.
- Destructive confirmation before discarding unsaved Provider changes.
- Clearer workflow actions, loading states, and feedback text.

## Acceptance Criteria

- [x] Every validation-owned text input can be located by its Provider form-state path.
- [x] Local save validation focuses the first invalid field.
- [x] Draft connection validation and API field errors focus the first relevant field.
- [x] Changing a value, replacing an avatar, or removing an avatar marks the dialog as dirty.
- [x] Closing a dirty dialog requires explicit discard confirmation.
- [x] Closing an unchanged dialog remains immediate.
- [x] Saving continues to block dialog dismissal and preserves existing success behavior.
- [x] Creation uses Add Provider and editing uses Save Changes as the primary action label.
- [x] Detail-loading and mutation failures retain retryable, persistent feedback.
- [x] Provider validation, persistence, sensitive-data lifetime, and query cleanup remain unchanged.

## Out of Scope

- Adopting a form library or another state-management dependency.
- Autosave, drafts, undo, navigation blocking outside the Provider dialog, or persistence of incomplete values.
- Changing field requirements, URL validation, model mappings, or API-key storage.
- Changing avatar file constraints, storage format, or native file selection.
- Main-process, preload, IPC, repository, or SQLite changes.

## Handoff

Provider dialogs now provide a clear correction path and explicit protection against accidental dismissal without expanding the renderer's native capabilities or data contract.

## Verification

- Type checking, linting, and the Electron Vite production build passed for the completed renderer implementation.
- Static inspection confirmed that every validation-owned field has a matching HTML name, first-error focus is scheduled after state updates, and dirty detection covers both values and avatar intent.
- The application was not launched and no automated visual inspection was performed, as required by repository policy.
