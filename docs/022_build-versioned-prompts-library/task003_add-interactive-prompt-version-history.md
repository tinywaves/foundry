# Task 003: Add Interactive Prompt Version History

## Status

`completed`

## Goal

Add interactive, read-only Prompt version browsing and confirmed restoration to the existing Edit workflow.

## Detail

Expose History only on the Prompt Edit route through a header toggle with a Lucide history icon. Opening History preserves the current draft and adds a right-side panel that compresses the editor. The panel uses Astryx `LayoutPanel`, `ResizeHandle`, and `useResizable`, defaults to `320px`, is bounded to `280–400px`, and persists the chosen width. It never overlays the editor.

The panel contains a closable header and a compact, ungrouped list ordered newest-first. Each row displays `Version N` and its full timestamp. The latest row is marked `Current`. The list has no pagination or version-count limit.

Clicking `Current` or closing History exits historical viewing and returns to the existing current editor without applying historical content. Any draft remains intact if no historical snapshot was successfully opened.

Selecting a historical row loads its immutable detail on demand. The requested row shows loading while the existing main content remains visible. The main content changes only after a successful load. A failed load retains the previous selection, content, and applicable draft.

When the current editor is dirty, selecting a historical version first opens `Discard Changes and View Version N?`. `Keep Editing` cancels the transition. `Discard and View` permits the transition, but the draft is discarded only after the historical snapshot loads successfully.

A selected historical snapshot replaces the form with a read-only view showing its version, saved time, title, description, and exact plain-text content. Save and Cancel are replaced with Copy and Restore. Historical content cannot be edited directly. Restore is the only operation that can make historical snapshot content become the editable current version.

Restore opens `Restore Version N?` and explains that a new current version will be created while all existing versions remain. The action uses the primary style and does not automatically retry. On success, caches and the history list are updated, the new version becomes `Current`, the panel remains open, and the editor returns to a clean editable state. On failure, the confirmation remains open, the selected snapshot is preserved, and an error toast is shown.

Add Prompt version-list and version-detail TanStack Query keys and options. Reads reuse the existing one-time transient retry policy. Version details remain safely cacheable because they are immutable. Successful normal saves and restores update loaded version-list caches without duplicating no-op saves.

Copy uses `copyPromptVersion`, never retries automatically, and reports success or failure without changing selection or content.

Final list-load failure shows one error toast and an inline non-action failure state. There is no visible Retry control. No main-process, preload, shared-contract, database, or dependency changes are required.

## Findings

None.

## Dependencies

None.

## Deliverables

- Edit-page History toggle and persisted resizable panel.
- Current and historical version list with loading, selected, empty, and failure states.
- Read-only historical snapshot presentation with exact-text Copy and confirmed Restore.
- Dirty-draft protection for historical selection.
- Prompt version query keys, immutable snapshot caching, and current-version cache updates.
- Focused query, retry, cache, and state-transition verification.

## Acceptance Criteria

- [x] History is available only from Edit and opening it never discards the current draft.
- [x] The panel compresses the editor, remains within `280–400px`, remembers its width, and can be closed without overlap.
- [x] Versions appear newest-first with full timestamps and a marked `Current` row.
- [x] Historical selection changes the main content only after a successful load.
- [x] Failed historical loading preserves the prior selection, content, and applicable draft.
- [x] Dirty historical selection requires the confirmed discard dialog.
- [x] Historical snapshots are exact, read-only, and expose only Copy and Restore.
- [x] Current selection and panel closure return to the existing editor without restoring historical content.
- [x] Confirmed Restore creates a new latest version, refreshes loaded caches, and returns to a clean editable current state.
- [x] Read failures use the bounded retry policy; mutations never retry and no Retry control appears.
- [x] Existing Edit Save, Cancel, navigation blocking, and plain-text behavior remain unchanged.
- [x] Automated and static verification passes without launching or visually automating the application.

## Out of Scope

- History outside Edit, including Trash.
- Direct editing of historical snapshots.
- Comparison, diffs, branching, annotations, grouping, pagination, or retention limits.
- Main-process, preload, database, or shared-contract changes.
- New dependencies or visual automation.

## Handoff

Task 004 can invalidate the established active Prompt list, detail, and version caches when moving records to Trash while keeping History unavailable throughout Trash workflows.

## Verification

- `pnpm test` passed 19 test files and 126 tests, including focused version-query, retry, cache-update, and selection-transition coverage.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the Node and Web type checks and built the main, preload, and renderer production outputs with electron-vite.
- `git diff HEAD --check` passed.
- Static inspection confirmed the Edit-only History entry, `320px` persisted panel with `280–400px` bounds, compressed non-overlay layout, newest-first ungrouped rows, current marker, exact read-only snapshots, contextual footer actions, and wrapping controls.
- Static behavior inspection confirmed conditional draft discard, stale-read suppression, immutable snapshot caching, incremental current-version cache updates, unchanged normal Save and Cancel navigation, no visible Retry control, and mutation retry disabled.
- Static boundary inspection confirmed Astryx and StyleX ownership, Lucide application icons, no new dependency or styling system, no direct renderer access to Electron or storage internals, and no main-process, preload, shared-contract, or database changes.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
