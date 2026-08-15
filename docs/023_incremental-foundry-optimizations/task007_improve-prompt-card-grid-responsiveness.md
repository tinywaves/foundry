# Task 007: Improve Prompt Card Grid Responsiveness

## Status

`completed`

## Goal

Keep Prompt cards at a comfortable browsing width across wider windows instead of stretching sparse gallery rows across the entire content region.

## Detail

The Prompt gallery currently uses Astryx responsive columns with `repeat: 'fit'` and a maximum of three columns. When the gallery contains only the dashed creation card and one Prompt, fitting collapses unused tracks and stretches the two remaining cards to consume the full row. This produces unusually wide cards on large screens and weakens the intended gallery presentation.

Use one shared responsive Grid configuration for both loaded and loading states. Switch the repeat behavior to `fill` so available tracks remain present when there are fewer cards than columns, preserving consistent item widths instead of stretching sparse items. Increase the maximum column count to four so wider content regions can use the additional horizontal space without creating oversized cards.

Retain the existing minimum card width so the grid continues to reduce its column count naturally as the window narrows. Keep card content, creation behavior, navigation, actions, and spacing unchanged.

## Findings

- Astryx recommends `repeat: 'fill'` for consistent gallery item widths and `repeat: 'fit'` only when sparse items should stretch into leftover space.
- The screenshot demonstrates the sparse-item case: two cards expand to approximately half of a very wide content region.
- A four-column cap keeps wide-window cards more compact while preserving the existing automatic reflow at narrower widths.
- Loaded and loading grids require the same column contract to avoid layout shifts.

## Deliverables

- A shared responsive column configuration for loaded and loading Prompt grids.
- Preserved empty tracks when a grid row contains fewer cards than available columns.
- A maximum of four columns on sufficiently wide windows.
- Existing automatic column reduction at narrower widths.

## Acceptance Criteria

- [x] Loaded and loading Prompt grids use the same responsive column configuration.
- [x] Sparse Prompt galleries no longer stretch their cards to fill the entire row.
- [x] The gallery supports up to four columns when sufficient width is available.
- [x] Cards continue to reflow to fewer columns as available width decreases.
- [x] Prompt content, creation, navigation, actions, and lifecycle behavior remain unchanged.
- [x] Type checking, linting, automated tests, and diff validation pass without automated visual verification.

## Out of Scope

- Changing card content, typography, height, spacing, visual styling, or action placement.
- Changing the minimum card width or introducing custom media queries.
- Centering sparse cards or changing their source order.
- Changing the Prompt Trash table or other application grids.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 007 establishes the wide-window Prompt gallery behavior. Add the next requested optimization to Plan 023 as Task 008.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 20 test files and 132 tests.
- `git diff --check` and `git diff --cached --check` passed.
- Astryx Grid documentation confirmed that `repeat: 'fill'` preserves tracks for consistent item widths while `repeat: 'fit'` stretches sparse items into leftover space.
- Static inspection confirmed that both loaded and loading grids reference the same `promptGridColumns` configuration.
- Static inspection confirmed that the configuration uses the existing `minWidth: 280`, `max: 4`, and `repeat: 'fill'` values.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
