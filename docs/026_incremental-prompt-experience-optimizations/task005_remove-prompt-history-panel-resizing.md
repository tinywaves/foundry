# Task 005: Remove Prompt History Panel Resizing

## Status

`completed`

## Goal

Simplify the Prompt version-history panel by removing its drag-resize interaction while preserving a stable panel boundary and all history workflows.

## Detail

`PromptHistoryPanel` no longer imports or renders `ResizeHandle`, creates state through `useResizable`, passes `resizable` props to `LayoutPanel`, or declares the `prompt-version-history-panel` persistence key. The interactive separator and its mouse and keyboard resize behavior are therefore absent, and the panel no longer reads or writes a user-selected width.

The panel uses the previous 320px default size as its fixed `LayoutPanel.width`. Because the removed `ResizeHandle` previously owned the boundary line, `LayoutPanel.hasDivider` now renders the same static separation from the Prompt editor without exposing a drag affordance. The existing nested `Layout`, header, close action, loading and error states, version list, active and pending indicators, internal scrolling, query behavior, and version-selection callbacks remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- A fixed-width Prompt history panel without an interactive resize handle.
- Removal of Prompt history resize state and local width persistence.
- A static panel divider owned by `LayoutPanel`.

## Acceptance Criteria

- [x] The Prompt history panel does not render a drag handle or separator control.
- [x] The Prompt history panel does not initialize `useResizable` or pass `resizable` props.
- [x] The obsolete `prompt-version-history-panel` persistence key has no remaining source reference.
- [x] The panel uses a stable 320px width matching the previous default size.
- [x] A non-interactive divider continues to separate the history panel from the editor.
- [x] History loading, errors, empty state, version rows, active and pending states, selection, scrolling, and closing behavior remain unchanged.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing the fixed history-panel width, responsive behavior, panel placement, opening or closing behavior, or header design.
- Changing Prompt version queries, selection state, snapshot loading, copying, restoration, errors, toasts, or confirmation dialogs.
- Removing resizable behavior from the application SideNav or any unrelated surface.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 005 establishes the fixed, non-resizable Prompt history panel as the cumulative Prompt editor baseline. A later Prompt-focused optimization may be implemented and synchronized as Task 006 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that `PromptHistoryPanel` renders one fixed-width `LayoutPanel` with `hasDivider` and no adjacent separator.
- Repository search confirmed that `ResizeHandle`, `useResizable`, `resizable`, `HISTORY_PANEL_STORAGE_ID`, and `prompt-version-history-panel` have no remaining references in `PromptHistoryPanel`.
- Static inspection confirmed that the nested history layout, query, feedback states, list rows, selection callback, and close action remain unchanged.
- The user accepted the completed optimization by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
