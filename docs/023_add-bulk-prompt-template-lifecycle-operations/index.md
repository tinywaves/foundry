# Add Bulk Prompt Template Lifecycle Operations

## Status

`ready`

## Goal

Add safe, atomic bulk lifecycle operations to the active and Trash Prompt Template lists so users can reduce repetitive cleanup and restoration work without extending bulk behavior into content, favorites, tags, or version management.

## Detail

Provide a Select entry point at the top of both the active library and Trash views. Entering selection mode adds a checkbox to each record and presents one page-level bulk action bar above the list. The action bar shows the selected count, Select All, the operations available in the current view, and a way to exit selection mode. Do not repeat bulk commands inside individual records and do not impose a selection-count limit.

Keep Prompt Template lists unpaginated and render the complete result set. In the active view, Select All selects every template in the result produced by the current name search, tag filters, and favorites filter. In Trash, Select All selects every currently displayed Trash record. Changing search or filter conditions, switching between the active and Trash views, or exiting selection mode clears the selection.

Allow only bulk Move to Trash in the active view. Show the exact selected count and require confirmation before execution. Transition all selected records atomically so the complete operation succeeds or no template changes. Do not create Prompt Template versions. On success, preserve the current filters, clear the selection, and leave selection mode. On failure, preserve the valid selection and selection mode and show an error. Do not provide a dedicated Retry control; the user can exit selection mode or trigger the same command again.

Allow bulk Restore and bulk Remove Templates in Trash. Restore does not require confirmation. Remove Templates requires confirmation that the selected records will no longer be accessible or recoverable through Foundry even though their data remains in the local database. Both operations transition all selected records atomically, create no Prompt Template versions, and clear the selection and leave selection mode after success. A failure preserves the valid selection and page-level action bar and reports the error without a dedicated Retry control. Preserve the single-record Trash operations and Empty Trash from the core library.

Authoritatively validate that every selected record remains in the lifecycle state expected by the requested operation. If any selected record is stale, reject the entire operation without changing any record, refresh the list, clear the invalid selection, and require the user to select again from current state. Keep all bulk operations within the existing constrained process boundaries, TanStack Query state model, immutable version-history rules, and three-stage logical lifecycle.

## Scope

- Explicit selection mode in active and Trash lists.
- A selection checkbox on each record.
- One page-level bulk action bar above the list.
- Select All for the complete current result set.
- Atomic bulk Move to Trash.
- Atomic bulk Restore from Trash.
- Atomic bulk transition from Trash to `removed`.
- Authoritative stale-state validation for the complete selection.
- Confirmation, success, failure, and selection-clearing behavior.
- Purpose-specific shared, main-process, preload, and renderer contract extensions.
- TanStack Query cache synchronization and focused automated non-visual verification.

## Out of Scope

- Pagination, cross-page selection, or background selection of unloaded records.
- Bulk favorite or unfavorite actions.
- Bulk tag addition, removal, or replacement.
- Bulk Copy, Duplicate, editing, or version switching.
- Bulk version creation.
- Selection-count limits.
- Partially successful bulk operations.
- Automatic retries or a dedicated Retry action.
- New Trash, `removed`, or version semantics.
- Physical deletion.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for visual acceptance.

## Decisions

- Place one bulk action bar above the list and limit individual records to selection state while selection mode is active.
- Require explicit selection mode to reduce accidental selection during ordinary browsing.
- Keep the list unpaginated, so Select All means the complete current filtered result.
- Clear selection whenever search conditions, filters, or lifecycle views change so actions never apply to a hidden prior set.
- Limit the active view to bulk Move to Trash.
- Limit Trash to bulk Restore and bulk transition to `removed`.
- Make every bulk lifecycle transition atomic.
- Require confirmation for destructive transitions while allowing bulk Restore without confirmation.
- Preserve a still-valid selection after operational failure without adding a dedicated Retry control.
- Reject a stale selection atomically, refresh the list, and clear the invalid selection.
- Do not create Prompt Template versions for lifecycle-only bulk operations.

## Tasks

- [ ] [Task 001: Establish Atomic Bulk Template Lifecycle Operations](./task001_establish-atomic-bulk-template-lifecycle-operations.md)
- [ ] [Task 002: Add Active Library Bulk Trash Selection](./task002_add-active-library-bulk-trash-selection.md)
- [ ] [Task 003: Complete Trash Bulk Lifecycle Operations](./task003_complete-trash-bulk-lifecycle-operations.md)
