# Task 008: Replace the Prompt Trash Table with Cards

## Status

`completed`

## Goal

Replace the visually heavy Prompt Trash table with a responsive card gallery that matches the active Prompt library while preserving all Trash lifecycle operations.

## Detail

The Prompt Trash view still uses a traditional three-column table for title, moved-to-trash time, and actions. With long Prompt titles, the table becomes a dense full-width strip that feels disconnected from the compact card language established on the `All` tab.

Replace the table with a responsive Astryx `Grid` of `ClickableCard` components. Each Trash card uses a single-line truncated title, links to the existing trashed Prompt detail route, and places the moved-to-trash timestamp with the Restore and Remove from Trash actions in a compact footer. Retain the existing accessible labels, loading and disabled states, confirmation dialog, and mutations.

Extract the responsive Prompt grid columns into a narrow shared module so active, loading, and Trash galleries use the same minimum width, four-column cap, and `fill` behavior. Replace the table loading state with Card skeletons that mirror the final Trash card geometry. Keep the existing shared empty state and the Header-level `Empty Trash` action unchanged.

## Findings

- The Trash summary contract contains only the title and `trashedAt`, so table columns add visual structure without providing meaningful comparison value.
- The Trash items are document-like entries with direct detail navigation and map naturally to the established Prompt card pattern.
- Restore and permanent removal remain independent nested actions within Astryx `ClickableCard`.
- Sharing the responsive Grid configuration prevents the active and Trash galleries from drifting.

## Deliverables

- A responsive Prompt Trash card gallery with a maximum of four columns.
- Single-line Trash titles with direct navigation to trashed Prompt detail.
- A compact footer containing moved-to-trash context, timestamp, Restore, and Remove from Trash actions.
- A matching responsive Card skeleton loading state.
- A shared Prompt card-grid column configuration.
- Removal of the Prompt Trash table implementation.

## Acceptance Criteria

- [x] The Trash view renders responsive cards rather than a Table.
- [x] Each card links to the existing trashed Prompt detail route and truncates its title to one line.
- [x] Each card displays moved-to-trash context and the existing relative timestamp.
- [x] Restore and Remove from Trash retain their labels, tooltips, loading states, disabled states, handlers, and confirmation behavior.
- [x] Loaded and loading Trash grids share the responsive column contract used by the active Prompt gallery.
- [x] Empty Trash and the empty-state presentation remain unchanged.
- [x] Type checking, linting, automated tests, and diff validation pass without automated visual verification.

## Out of Scope

- Changing Trash detail, restore, permanent removal, empty-trash, query, cache, or persistence semantics.
- Adding descriptions, versions, selection, bulk restore, search, filtering, sorting, pagination, or grouping.
- Changing active Prompt card content or responsive behavior.
- Changing the shared empty-state design or Header action placement.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 008 establishes the Prompt Trash card gallery. Add the next requested optimization to Plan 023 as Task 009.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 20 test files and 132 tests.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection confirmed that `PromptTrashPage` renders `PromptTrashCardGrid` and `PromptTrashCardGridLoading` instead of table components.
- Static inspection confirmed that Trash cards use Astryx `Grid`, `ClickableCard`, compact nested IconButtons, `Timestamp`, StyleX, and design tokens.
- Static inspection confirmed that active and Trash galleries import the same `promptCardGridColumns` definition.
- Static inspection confirmed that the existing empty state, Header-level `Empty Trash` action, mutation handlers, and confirmation dialogs remain in `PromptTrashPage`.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
