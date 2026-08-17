# Task 006: Simplify the Prompt History Panel Layout

## Status

`completed`

## Goal

Improve the Prompt version-history panel's visual hierarchy and density by removing redundant title information and tightening its header composition.

## Detail

The populated history list no longer supplies a visible `Versions` header to `List`, and the now-unused Astryx `Text` import is removed. `Version History` remains the single panel-level heading, while every `ListItem` continues to use `Version N` as its specific label. This removes the intermediate label that repeated the same concept without sacrificing row identity or the panel's existing accessible label.

The panel header no longer renders a `Section` solely to provide padding around its action row. `LayoutHeader` now owns that spacing directly with `padding={2}`, placing the existing `HStack`, heading, and close button in one compact header composition. This changes the surrounding padding from the previous 12px spacing step to 8px and reduces the header's visual weight. The divider, close action, fixed panel width, compact list density, timestamps, Current token, selected and pending states, loading skeleton, empty state, error feedback, queries, and selection callbacks remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- One visible panel-level title without a redundant list-level title.
- A tighter Prompt history header owned directly by `LayoutHeader`.
- Removal of the unused `Text` import and header-only `Section` wrapper.

## Acceptance Criteria

- [x] The history panel renders `Version History` as its only visible panel or list title.
- [x] Each history row continues to identify its snapshot as `Version N`.
- [x] The populated `List` does not render the redundant `Versions` header.
- [x] The history header action row renders directly inside `LayoutHeader` without a `Section` wrapper.
- [x] `LayoutHeader` uses the 8px spacing step for its header padding.
- [x] The close action, panel divider and width, list density, timestamps, status, selection, loading, empty, and error states remain unchanged.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing the panel width, fixed sizing, divider, placement, open or close behavior, or version-row density.
- Changing version labels, timestamp formatting, Current status presentation, query behavior, selection, copying, restoration, or confirmation dialogs.
- Redesigning the Prompt form, fixed editor header, or any Prompt list, detail, or Trash surface.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 006 establishes the compact, single-title Prompt history panel as the cumulative Prompt editor baseline. A later Prompt-focused optimization may be implemented and synchronized as Task 007 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that the populated `List` renders without a `Versions` header while every row retains its `Version N` label.
- Repository search confirmed that the history panel no longer imports Astryx `Text` or renders the removed visible title.
- Static inspection confirmed that `LayoutHeader` contains the header `HStack` directly with `padding={2}` and no header-only `Section` wrapper.
- Static inspection confirmed that the close button, panel divider and width, list and query states, timestamps, status token, and selection callbacks remain unchanged.
- The user accepted the completed optimization by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
