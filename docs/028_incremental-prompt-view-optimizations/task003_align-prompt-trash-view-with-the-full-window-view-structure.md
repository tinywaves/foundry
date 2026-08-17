# Task 003: Align Prompt Trash View with the Full-Window View Structure

## Status

`completed`

## Goal

Align Prompt Trash View with the full-window active Prompt View structure while preserving its trash-specific navigation and lifecycle actions.

## Detail

Prompt Trash View now belongs to `FullWindowLayout` alongside active Prompt View, New Prompt, and Edit Prompt instead of rendering under the sidebar-owned `AppShellLayout`. Both the loading and loaded Trash View states use the shared `PromptWindowHeader`. The header provides Back to Trash at the start, keeps Remove from Trash as a compact destructive secondary action, and keeps Restore as the compact trailing primary action. Back is disabled while either lifecycle mutation is pending, and the two actions retain their existing mutual exclusion and loading behavior.

The Trash View body now uses the same read-only Title, Description, and Markdown Content order as active Prompt View. The shared presentation was extracted into `PromptReadOnlyContent`, which keeps Title and Description non-editable through the established Astryx field presentation, displays `None` for a missing Description, and renders Content through the shared fixed-height Markdown Preview. Active Prompt View consumes the same component so both detail contexts stay structurally aligned. The superseded raw `PromptContent` component had no remaining caller and was removed.

The previous Trash View metadata presentation for Version, Created At, Updated At, and Moved to Trash is no longer rendered. The underlying version and timestamp values, `TrashedPromptDetail` contract, persistence, preload, IPC, database, query, mutation, and cache behavior remain unchanged.

Trash-specific behavior is preserved. Back returns to the Trash list, Restore moves the Prompt into active storage and opens its active Prompt View, and Remove from Trash retains its destructive confirmation before returning to the Trash list. Existing success and error toasts, pending-state guards, and lifecycle mutation ownership remain in `usePromptTrashActions`.

## Findings

None.

## Dependencies

None.

## Deliverables

- Full-window route ownership for Prompt Trash View.
- Shared Prompt window header in loaded and loading Trash View states.
- Shared read-only Title, Description, and Markdown Content presentation across active and trashed View.
- Compact Back to Trash, Remove from Trash, and Restore controls with existing pending-state protection.
- Removal of the superseded Trash View metadata presentation and raw Prompt content renderer.

## Acceptance Criteria

- [x] Prompt Trash View renders without the application sidebar under the same full-window route layout as active Prompt View, New, and Edit.
- [x] Loaded and loading Trash View states present Back to Trash through the shared Prompt window header.
- [x] Remove from Trash remains a compact destructive secondary action and Restore remains the compact trailing primary action.
- [x] Back and mutually exclusive lifecycle actions remain protected while a Trash View action is pending.
- [x] Title, Description, and Content use the same read-only field order and Markdown Preview presentation as active Prompt View.
- [x] A missing Description continues to display `None`, and Content remains non-editable.
- [x] Version, Created At, Updated At, and Moved to Trash are no longer shown on Prompt Trash View without changing their stored values or contracts.
- [x] Back, Restore, Remove from Trash, confirmation, destination, toast, and cache behavior remain unchanged.
- [x] Type checking, linting, the full test suite, production build, diff validation, and static Astryx inspection pass without automated visual verification.

## Out of Scope

- Changes to Prompt Trash list layout, cards, Empty Trash, list-level Restore, or list-level Remove from Trash behavior.
- Changes to active Prompt View actions or Edit Prompt navigation.
- Changes to Prompt contracts, versions, timestamps, persistence, preload, IPC, database, queries, mutations, caches, or main-process behavior.
- Editable Trash View fields, Source mode, CodeMirror loading, or new Trash metadata presentation.
- New dependencies, renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Handoff

Task 003 establishes shared full-window chrome and read-only content across active and trashed Prompt detail surfaces as the cumulative baseline for subsequent Prompt View optimizations.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 22 test files and 145 tests.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static route inspection confirmed that Prompt Trash View moved from `AppShellLayout` to `FullWindowLayout`.
- Static behavior inspection confirmed that Back, Restore, Remove from Trash, confirmation, destinations, mutation ownership, toast handling, pending-state guards, and cache reconciliation remained intact.
- Static Astryx inspection found no application-authored raw `div` or `span` layout, standalone CSS, raw colors, raw pixel values, or utility classes in the changed Trash View and shared read-only source.
- The user approved documentation synchronization after reviewing the completed behavior and verification summary.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
