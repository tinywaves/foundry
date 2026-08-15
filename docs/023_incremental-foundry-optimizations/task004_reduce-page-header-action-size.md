# Task 004: Reduce Page Header Action Size

## Status

`completed`

## Goal

Reduce the visual weight of the Prompts and Providers page-level primary actions by using the Astryx small Button size.

## Detail

The `New Prompt` and `Add Provider` actions used the default Astryx Button size while sitting inside compact desktop page headers. Set both buttons to `size="sm"` so their height and padding align more closely with the existing compact header treatment without changing their labels, icons, variants, placement, or behavior.

Keep the change local to these two explicitly requested actions. Do not alter shared `PageHeader` sizing or cascade a smaller Button size to unrelated pages and commands.

Task 005 later removed the `New Prompt` Header button in favor of a dashed first gallery card. `Add Provider` remains a small Header action, and the newly relocated `Empty Trash` Header action also uses `size="sm"` to preserve the compact treatment.

## Deliverables

- A small `New Prompt` primary action in the shared Prompt library header.
- A small `Add Provider` primary action in the Providers page header.
- No shared header API or unrelated Button changes.
- A documented follow-up noting that Task 005 replaces the small `New Prompt` Header button and adds a small `Empty Trash` Header action.

## Acceptance Criteria

- [x] `New Prompt` uses the Astryx small Button size.
- [x] `Add Provider` uses the Astryx small Button size.
- [x] Labels, icons, primary variants, click behavior, and header placement remain unchanged.
- [x] No other page-level or contextual Button size changes.
- [x] Task 005 preserves the small Header-action treatment after changing Prompt action placement.
- [x] Type checking, linting, and diff validation pass without automated visual verification.

## Out of Scope

- Changing Button labels, icons, colors, variants, or interaction behavior.
- Changing `Empty Trash`, dialog, table-row, toolbar, form, or other page actions.
- Changing shared `PageHeader` height, spacing, typography, or layout.
- Main-process, preload, IPC, persistence, routing, dependency, build, or packaging changes.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 004 establishes the smaller requested page-header action treatment. Task 005 subsequently changes which Prompt action occupies that Header position.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection at completion confirmed that `New Prompt` and `Add Provider` received an explicit `size="sm"` prop. Task 005 later removed the former Header button and applied the same small size to the Trash-only `Empty Trash` Header action.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
