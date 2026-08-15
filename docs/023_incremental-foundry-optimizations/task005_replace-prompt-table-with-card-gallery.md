# Task 005: Replace the Prompt Table with a Card Gallery

## Status

`completed`

## Goal

Replace the active Prompt list's traditional table presentation with a polished responsive card gallery, make Prompt creation the gallery's first item, and keep Trash actions contextual to the Trash view.

## Detail

The active Prompt table separates title, description, update time, and actions into rigid columns even though each Prompt is a document-like content object. A first implementation explored an edge-to-edge rich list, but user review established a clear preference for cards as the more attractive presentation for this page.

Use a responsive Astryx `Grid` of `ClickableCard` components. Each card presents a small Prompt icon tile, a two-line title, a three-line description, and a footer containing the current version, relative update time, and the existing Copy, Edit, and Move to Trash actions. The entire card navigates to Prompt detail, while ClickableCard's nested-interaction handling keeps the three action buttons independent from card navigation.

Limit the gallery to three columns and let it reduce the column count automatically when the available width narrows. Use equal-height card content so metadata and actions align consistently across each grid row. Replace the table-specific loading state with matching Card skeletons that preserve the final gallery geometry.

Task 007 later refines the responsive contract by switching the grid from fitting sparse items to preserving available tracks and increasing the wide-window cap from three to four columns. This prevents one or two cards from stretching across the entire content width.

Remove the `New Prompt` Button from the Header and place a restrained dashed `New Prompt` `ClickableCard` first in the `All` grid. Keep this creation entry visible when the Prompt collection is empty and while Prompt data is loading so creation remains immediately available without a separate empty-state screen or Header action.

Keep the tab toolbar focused on `All` / `Trash` navigation. On the `Trash` tab, move the small destructive `Empty Trash` Button from the toolbar to the Header's right side while preserving its disabled state, confirmation dialog, and mutation behavior.

Rename the implementation to `prompt-card-grid.tsx` and update only the active `All` Prompt view. Keep the Trash table unchanged because its lifecycle-specific columns and bulk operation context are outside this optimization.

## Findings

- Prompt title, description, version, and update time form a self-contained content preview that maps naturally to a card.
- Astryx `ClickableCard` supports whole-card navigation while allowing nested action buttons to operate independently.
- A responsive three-column maximum provides a browsable gallery on wide windows while preserving readable card widths on narrower layouts.
- The user explicitly prefers cards over the initially proposed rich-list presentation.
- A dashed creation card integrates the primary action into the content model without adding another visually heavy Header button.
- `Empty Trash` is a page-specific destructive action and therefore belongs in the Trash Header rather than beside the navigation tabs.

## Deliverables

- A responsive Astryx Prompt card gallery for the active `All` view.
- A dashed `New Prompt` creation card as the first grid item in loaded, empty, and loading states.
- Whole-card navigation to Prompt detail with independent Copy, Edit, and Move to Trash actions.
- Consistent title, description, version, and update metadata hierarchy.
- Equal-height cards with a maximum of three responsive columns.
- A matching responsive Card skeleton loading state.
- A Trash-only small `Empty Trash` action in the Header, with the tab toolbar reserved for navigation.
- Removal of the active Prompt table and intermediate rich-list implementations.

## Acceptance Criteria

- [x] The active `All` view renders Prompts as a responsive Card gallery rather than a Table or List.
- [x] The first `All` grid item is a dashed `New Prompt` card and the Header has no `New Prompt` Button.
- [x] The creation card remains visible when there are no Prompts and while Prompt data is loading.
- [x] Each card groups the Prompt icon, title, description, current version, and last update.
- [x] Clicking the card opens Prompt detail while Copy, Edit, and Move to Trash remain independent accessible actions.
- [x] Cards align consistently within a grid of no more than three columns and reduce columns when width is constrained.
- [x] The loading state matches the Card gallery geometry and no longer renders Table or List skeletons.
- [x] The Trash list remains table-based, and `Empty Trash` appears as a small Trash-only Header action with unchanged lifecycle behavior.
- [x] Type checking, linting, automated tests, and diff validation pass without automated visual verification.

## Out of Scope

- Replacing or redesigning the Prompt Trash table.
- Adding search, filtering, sorting, grouping, selection, pagination, previews, thumbnails, or drag-and-drop.
- Changing Prompt routes, queries, cache behavior, persistence, forms, details, History, or lifecycle operations.
- Main-process, preload, IPC, database, dependency, build, or packaging changes.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 005 establishes the active Prompt Card gallery and its contextual creation and Trash actions. Add the next requested optimization to Plan 023 as Task 006.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 20 test files and 132 tests.
- `git diff --check` passed.
- Static inspection confirmed that the active Prompt view imports `PromptCardGrid` and `PromptCardGridLoading` and contains no active Table or List presentation.
- Static inspection at completion confirmed that the gallery used responsive columns capped at three. Task 007 later changes the cap to four and preserves empty tracks for more consistent card widths on wide windows.
- Static inspection confirmed that `NewPromptCard` is the first item in both the loaded and loading grids, and that an empty loaded collection still renders the grid.
- Static inspection confirmed that `PromptLibraryHeader` no longer owns a `New Prompt` Button and accepts only an optional contextual `headerAction` in addition to the selected tab.
- Static inspection confirmed that the Trash view supplies a small destructive `Empty Trash` Header action and leaves the tab toolbar dedicated to navigation.
- Static inspection confirmed that each card links to Prompt detail while Copy, Edit, and Move to Trash retain independent handlers and accessible labels.
- Static inspection confirmed that `prompt-trash-table.tsx` and Trash lifecycle behavior were not changed.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
