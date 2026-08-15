# Task 003: Consolidate Prompt List and Trash Navigation

## Status

`completed`

## Goal

Replace the Prompts header's competing actions with a stable primary action and an `All` / `Trash` tab switcher modeled on the Providers page structure, while removing the unexplained extra header divider.

## Detail

The active Prompts list currently presents both `Trash` and `New Prompt` as header buttons, even though Trash represents a sibling content view rather than an immediate command. The Prompt Trash page then uses a separate `Trash` title and places `Empty Trash` in the same page-level action position. Both pages also wrap `PageHeader` in `LayoutHeader hasDivider`, adding a bottom border that is absent from the shared `PageHeader` itself and unnecessary for this composition.

Create a shared Prompt library header that follows the existing Providers structure: render the stable `Prompts` page header first, keep only the primary `New Prompt` action at its end, and render a small Astryx `Toolbar` below with an `All` / `Trash` `TabList`. Selecting `All` navigates to the active Prompt list, and selecting `Trash` navigates to the existing Prompt Trash route.

Use the shared header on both list pages so the title, creation action, tab position, and selection behavior remain stable during navigation. Keep `Empty Trash` available as a contextual action at the end of the Trash tab toolbar rather than replacing the page-level primary action. Replace the existing `Layout` and `LayoutHeader hasDivider` wrappers with the same `VStack` and fill-content structure used by Providers, removing the redundant border at its source.

## Findings

- `LayoutHeader hasDivider` is the direct source of the additional header bottom border on both Prompt list pages.
- Trash is a sibling view of the Prompt library and is better represented as navigation than as a header command.
- `Empty Trash` remains a destructive contextual command and should appear only when the Trash tab is active.

## Deliverables

- A shared Prompt library header with a stable `Prompts` title and `New Prompt` action.
- An Astryx `All` / `Trash` tab switcher below the page header.
- Route-backed tab navigation between the active list and Trash list.
- A contextual `Empty Trash` action on the Trash tab toolbar.
- Removal of the redundant Prompt list `LayoutHeader hasDivider` wrappers and their bottom border.

## Acceptance Criteria

- [x] The Prompts header shows only the `New Prompt` primary action.
- [x] `All` is selected on the active Prompt list and navigates to the canonical Prompt list route.
- [x] `Trash` is selected on the Prompt Trash list and navigates to the existing Trash route.
- [x] Both list pages retain the stable `Prompts` title and tab placement.
- [x] `Empty Trash` remains available only as a contextual Trash toolbar action and preserves its disabled and confirmation behavior.
- [x] The additional header bottom border from `LayoutHeader hasDivider` is removed.
- [x] Existing Prompt loading, error, table, empty-state, mutation, and dialog behavior remains unchanged.
- [x] Type checking, linting, focused tests, and diff validation pass without automated visual verification.

## Out of Scope

- Changing Prompt persistence, routes, query keys, cache behavior, table columns, row actions, or Trash lifecycle semantics.
- Changing Prompt create, view, edit, copy, History, restore, or permanent removal workflows.
- Adding counts, badges, search, filters, sorting controls, or pagination to the tabs.
- Main-process, preload, IPC, database, build, packaging, dependency, or styling-system changes.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 003 establishes stable Prompt library navigation and header action ownership. Add the next requested optimization to Plan 023 as Task 004.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test -- src/renderer/src/routes.test.ts` passed all 20 test files and 132 tests under the repository's Vitest runner.
- `git diff --check` passed.
- Static inspection confirmed that both Prompt list pages use the shared `PromptLibraryHeader`, expose the correct selected tab, and no longer import or render `LayoutHeader hasDivider`.
- Static inspection confirmed that the active list no longer renders a Trash header button, the stable page-level action is `New Prompt`, and `Empty Trash` remains scoped to the Trash toolbar with its existing disabled and confirmation behavior.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
