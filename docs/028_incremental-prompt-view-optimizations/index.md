# Incremental Prompt View Optimizations

## Status

`completed`

## Goal

Coordinate a sequence of focused Prompt detail and authoring optimizations that align active, trashed, and editable Prompt presentation while preserving existing Prompt workflows and process boundaries.

## Detail

This plan records incremental optimizations to active, trashed, and editable Prompt surfaces. Each requested round is implemented and verified before it is appended as a completed task, keeping accepted refinements independently reviewable without predicting future work.

The first optimization moves Prompt View from the sidebar-owned application shell to the same full-window route layout used by New Prompt and Edit Prompt. View now shares their compact title drag region and fixed action row, with Back to Prompts at the start and Copy, Move to Trash, and Edit at the end. Its body follows the authoring field order with non-editable Title and Description controls followed by a rendered Markdown Content preview. The previous Updated At metadata and raw preformatted Content presentation are removed from this surface. Prompt loading uses the same full-window header structure. Trash View remained unchanged in that round and was aligned by the third optimization.

The second optimization preserves the source of Edit Prompt navigation. Editing from the Prompt list returns to the original list history entry with a Back to Prompts label, while editing from Prompt View returns to that View entry with a Back to Prompt label. Both known entry paths use browser history so source page state remains intact. A directly opened Edit route or malformed source state safely falls back to the canonical Prompts list, and existing unsaved-change protection still intercepts contextual Back navigation.

The third optimization moves Prompt Trash View into the same full-window detail structure. It shares the Prompt-owned window header and read-only Title, Description, and Markdown Content presentation with active Prompt View, provides Back to Trash, and keeps Restore and Remove from Trash as compact header actions. The previous Version, Created At, Updated At, and Moved to Trash metadata presentation is removed without changing stored data or Prompt contracts. Active and trashed View now share one `PromptReadOnlyContent` implementation, and the superseded raw `PromptContent` renderer is removed.

The fourth optimization prevents successful Prompt lifecycle actions from briefly refetching a detail that cache reconciliation has already made inaccessible. Move to Trash from active View, Restore from Trash View, and Remove from Trash now synchronously commit their replacement navigation before mutation observers can resubscribe the removed detail query. The renderer uses the DOM-aware `RouterProvider` from `react-router/dom` so React Router can execute those commits through `ReactDOM.flushSync`. Successful actions therefore reach their intended destination without a spurious `Prompt not found` toast, while genuine mutation failures, cache reconciliation, and list-page actions remain unchanged.

The fifth optimization connects the lazy-loaded CodeMirror Markdown Source editor to Astryx's resolved color mode. `PromptMarkdownSourceEditor` reads `useTheme().mode` and passes the resulting `light` or `dark` value through CodeMirror's existing `theme` prop. Light mode keeps the built-in light theme, while dark mode activates the existing One Dark extension so the editor canvas, text, syntax highlighting, cursor, selection, and gutters switch together. System color-mode changes reconfigure a mounted editor, and the existing lazy-loading boundary, editing behavior, and dependency set remain unchanged.

## Scope

- Focused visual, structural, and exit-flow refinements to active and trashed Prompt detail routes.
- Full-window ownership for active Prompt View and Prompt Trash View without the application sidebar.
- Shared Prompt window chrome across active View, Trash View, New, and Edit.
- Shared read-only Title, Description, and Markdown Content presentation across active and trashed View.
- Compact active-View and Trash-View actions with source-specific Back navigation.
- Source-aware Edit Prompt return navigation from the Prompt list and active Prompt View.
- Safe canonical-list fallback for direct or malformed Edit Prompt entries.
- Synchronous replacement navigation after successful lifecycle actions invalidate the current detail.
- Theme-aware CodeMirror Markdown Source presentation in Prompt New and Edit.
- Runtime CodeMirror reconfiguration when Astryx resolves a different system color mode.
- Preservation of existing Prompt copy, loading, Save, History, mutation failure, cache reconciliation, and unsaved-change behavior.
- Task-specific non-visual verification under the repository's renderer policy.
- Cumulative documentation for explicitly requested Prompt View optimization rounds.

## Out of Scope

- Prompt list or Trash list layout and card interaction changes.
- Behavioral changes to Prompt New, History, validation, or saving.
- Edit Prompt behavior outside source-aware Back navigation and shared presentation components.
- Prompt persistence, preload, IPC, database, API contract, query-key, mutation-request, or cache-reconciliation changes.
- Stored Prompt timestamps, versions, trash timestamps, or other domain data changes.
- General navigation scheduling changes outside successful lifecycle exits from Prompt detail pages.
- Custom CodeMirror palettes, new editor theme packages, or application theme controls.
- Markdown Source editing, validation, language support, keyboard, sizing, or lazy-loading changes outside color-mode integration.
- New dependencies or broader renderer redesigns outside Prompt View.
- Speculative future optimization tasks.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Decisions

- Maintain this Prompt View optimization sequence as Plan 028 instead of extending Plan 026 or changing the completed scope of Plan 027.
- Persist each optimization only after implementation, verification, and explicit documentation synchronization approval.
- Place active Prompt View under `FullWindowLayout` in the first optimization; preserve the initially unchanged Trash View boundary in Task 001, then move Prompt Trash View under `FullWindowLayout` as the explicit third optimization.
- Reuse one Prompt-owned window header across View, New, and Edit so the title drag region, contextual Back action, spacing, and macOS window-control inset remain synchronized.
- Keep Copy and Move to Trash as secondary actions and Edit as the trailing primary action, using the same compact action size as the editor header.
- Present Title and Description through the established vertical form layout inside a native disabled fieldset so the values remain non-editable without Astryx field-level muted styling.
- Render Content through the same fixed-height, internally scrolling Astryx Markdown Preview used by New and Edit.
- Preserve the existing Preview link policy: external HTTP and HTTPS links use the Electron-controlled window-opening path, while relative and hash links cannot navigate Foundry.
- Remove Updated At from active Prompt View and preserve its stored value and underlying Prompt contract unchanged.
- Record `list` or `view` as explicit Edit navigation state at each in-application entry instead of inferring origin from an arbitrary history entry or URL shape.
- Return through browser history for a validated in-application Edit source so the list or View page retains its existing state, and use source-specific Back labels.
- Treat missing or malformed Edit source state as a direct entry and replace it with the canonical Prompts list on Back.
- Keep contextual Back navigation inside the existing unsaved-change blocker and leave successful Save navigation to active Prompt View unchanged.
- Reuse `PromptWindowHeader` and `PromptReadOnlyContent` across active and trashed View, with Back to Trash and compact Restore and Remove from Trash actions remaining specific to the trashed detail context.
- Remove Version, Created At, Updated At, and Moved to Trash from Prompt Trash View while preserving their stored values and shared contracts.
- Preserve successful lifecycle destinations: Move to Trash returns to Prompts, Restore opens the restored active Prompt View, and Remove from Trash returns to Trash.
- Use shared `{ flushSync: true, replace: true }` navigation options for lifecycle actions that invalidate the currently observed detail, and render through the DOM-aware `RouterProvider` from `react-router/dom` so the old route actually unmounts through `ReactDOM.flushSync` before mutation observers update.
- Keep ordinary Back navigation and list-page lifecycle actions on their existing navigation behavior because they do not resubscribe a removed current-detail query.
- Preserve actual mutation failure handling and cache reconciliation instead of suppressing `Prompt not found` errors globally.
- Resolve CodeMirror's effective theme through Astryx `useTheme` because the third-party editor requires a JavaScript mode value rather than ordinary StyleX styling.
- Use CodeMirror's existing `theme` prop and bundled light and One Dark themes so every editor-owned visual state switches together without custom raw colors or a new theme dependency.
- Preserve the existing lazy Source-editor boundary and allow `@uiw/react-codemirror` to reconfigure the mounted editor when the resolved Astryx mode changes.
- Continue using Astryx, StyleX, design tokens, and Lucide icons without adding dependencies.

## Tasks

- [x] [Task 001: Align Prompt View with the Prompt Editor Structure](./task001_align-prompt-view-with-the-prompt-editor-structure.md)
- [x] [Task 002: Preserve Prompt Edit Entry Context](./task002_preserve-prompt-edit-entry-context.md)
- [x] [Task 003: Align Prompt Trash View with the Full-Window View Structure](./task003_align-prompt-trash-view-with-the-full-window-view-structure.md)
- [x] [Task 004: Prevent Prompt Detail Refetches During Lifecycle Exits](./task004_prevent-prompt-detail-refetches-during-lifecycle-exits.md)
- [x] [Task 005: Synchronize CodeMirror with the Application Color Mode](./task005_synchronize-codemirror-with-the-application-color-mode.md)
