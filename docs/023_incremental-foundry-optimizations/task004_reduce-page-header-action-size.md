# Task 004: Reduce Page Header Action Size

## Status

`completed`

## Goal

Reduce the visual weight of the Prompts and Providers page-level primary actions by using the Astryx small Button size.

## Detail

The `New Prompt` and `Add Provider` actions currently use the default Astryx Button size while sitting inside compact desktop page headers. Set both buttons to `size="sm"` so their height and padding align more closely with the existing compact header treatment without changing their labels, icons, variants, placement, or behavior.

Keep the change local to these two explicitly requested actions. Do not alter shared `PageHeader` sizing or cascade a smaller Button size to unrelated pages and commands.

## Deliverables

- A small `New Prompt` primary action in the shared Prompt library header.
- A small `Add Provider` primary action in the Providers page header.
- No shared header API or unrelated Button changes.

## Acceptance Criteria

- [x] `New Prompt` uses the Astryx small Button size.
- [x] `Add Provider` uses the Astryx small Button size.
- [x] Labels, icons, primary variants, click behavior, and header placement remain unchanged.
- [x] No other page-level or contextual Button size changes.
- [x] Type checking, linting, and diff validation pass without automated visual verification.

## Out of Scope

- Changing Button labels, icons, colors, variants, or interaction behavior.
- Changing `Empty Trash`, dialog, table-row, toolbar, form, or other page actions.
- Changing shared `PageHeader` height, spacing, typography, or layout.
- Main-process, preload, IPC, persistence, routing, dependency, build, or packaging changes.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 004 establishes the smaller Prompts and Providers page-header actions. Add the next requested optimization to Plan 023 as Task 005.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection confirmed that only `New Prompt` and `Add Provider` received an explicit `size="sm"` prop and that their existing labels, icons, variants, placement, and handlers remain unchanged.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
