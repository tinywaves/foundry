# Refactor Provider List into Cards

## Status

`completed`

## Goal

Replace the runtime-scoped Providers table with a single-column card list that presents each Provider as an independent connection configuration with clear status and explicit actions.

## Detail

Present every Provider as a full-width card in a single vertical list. Each card uses a stable horizontal hierarchy with the avatar at the horizontal start and optically centered against the two-line content, flexible Provider content in the middle, and explicit actions aligned at the end. The card itself is not interactive.

Keep the content area to two compact lines. The first line presents the Provider name immediately followed by its persisted connection status. The second reserves the available Content width for the Base URL. Connected, Failed, and Never tested remain visible states; hovering or focusing a tested status exposes the last-tested time, and a failed result adds its sanitized failure detail to the same Tooltip. Narrow content truncates without overlapping or wrapping the action region.

Replace the row action menu with direct ghost Edit, Test Connection, and Delete icon actions. A saved connection test disables all three actions for that card while the Test Connection action shows progress. The previously persisted status remains visible until the test completes, then the returned summary updates the card. Delete remains visually quiet in the card and continues to require explicit destructive confirmation.

Remove API-key presentation, Copy, and Reveal from the Provider list. API keys remain managed through the existing Add and Edit Provider dialogs. The underlying credential storage and typed Provider APIs remain unchanged.

Align loading placeholders with the card hierarchy while preserving the existing runtime switcher, page header, empty state, load-error recovery, dialogs, mutation ownership, and runtime-scoped data behavior. The work remains in the renderer and uses the existing Astryx, StyleX, Lucide, React, and TanStack Query foundations without a new dependency.

## Scope

- Replace the Provider table with a full-width, single-column card list.
- Establish the Avatar, two-line Content, and end-aligned Actions hierarchy for every Provider.
- Preserve connection status, last-tested metadata, and sanitized failure-detail access.
- Expose Edit, Test Connection, and Delete as direct icon actions with clear accessible labels and tooltips.
- Remove API-key display, Copy, Reveal, and their list-owned transient renderer state.
- Replace table loading rows with loading cards that preserve the final layout dimensions.
- Preserve runtime switching, empty and error states, editing, saved connection testing, and confirmed deletion behavior.
- Verify the focused automated tests, type checking, linting, and static diff quality.

## Out of Scope

- A multi-column or responsive card grid.
- Whole-card activation, selection, bulk operations, or drag-and-drop ordering.
- Provider search, sorting, filtering, or pagination.
- Provider form or dialog redesign.
- Connection-test request semantics, status persistence, or error-contract changes.
- Database, shared-contract, main-process, preload, or IPC changes.
- Removing the underlying API-key Copy or Reveal APIs or changing credential storage.
- New dependencies or a new general-purpose list abstraction.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or automated visual acceptance.

## Decisions

- Each Provider is an independent Card because it is a discrete configuration that can be edited, tested, or removed independently.
- Cards form one vertical column regardless of available page width because the primary workflow is recognition and management rather than dense comparison.
- The card itself has no click behavior; every mutation or navigation starts from an explicit action.
- The card keeps a horizontal Avatar, Content, and Actions structure, with the Avatar optically centered against the two-line content, flexible truncating content, and a stable non-wrapping action region.
- The first content line keeps the Provider name and connection status adjacent; the second reserves the full available Content width for the Base URL, while Last tested and failure details move into the status Tooltip.
- API-key values and Copy or Reveal controls leave the list entirely, while Add and Edit dialogs retain API-key management.
- Edit, Test Connection, and Delete use direct ghost Lucide icon actions instead of MoreMenu; the confirmation dialog retains the destructive Delete treatment.
- A saved connection test disables all actions on only its matching card, shows progress on the Test Connection action, and leaves the prior persisted status visible until completion.
- Delete retains the existing confirmation interaction and failure recovery.
- Existing page header, runtime navigation, empty state, load error, Provider dialogs, persistence, and process boundaries remain unchanged.

## Tasks

- [x] [Task 001: Refactor Provider List into Single-Column Cards](./task001_refactor-provider-list-into-single-column-cards.md)
