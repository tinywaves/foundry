# Task 006: Reduce Prompt Card Density

## Status

`completed`

## Goal

Make the active Prompt gallery cards shorter and easier to scan by removing low-value decoration and constraining content previews.

## Detail

The initial Prompt Card gallery includes a decorative Prompt icon tile, a title of up to two lines, a description of up to three lines, and a version token in every card footer. Together these elements make each card taller and visually busier than needed for a compact desktop library.

Remove the Prompt icon tile from normal Prompt cards, constrain each title to one truncated line, constrain each description to two truncated lines, and remove the version token. Retain the relative update timestamp and the existing Copy, Edit, and Move to Trash actions so the remaining metadata and operations stay available.

Tighten the vertical stack spacing and update the loading skeleton to match the new title, description, and footer structure. Slightly reduce the dashed creation card padding so it does not force the first grid row to remain taller than the compact Prompt cards.

## Findings

- The shared Prompt icon does not distinguish one Prompt from another and adds height without improving identification.
- The current version is secondary metadata for this browsing surface and remains available in Prompt detail and History workflows.
- One title line and two description lines provide sufficient recognition while keeping gallery rows compact.
- The loading skeleton should mirror the final content geometry to avoid a visible height shift after data loads.

## Deliverables

- Prompt cards without the decorative top-left Prompt icon.
- Single-line truncated Prompt titles.
- Two-line truncated Prompt descriptions.
- Prompt footers without version tokens.
- Tighter card spacing and a matching compact loading skeleton.
- Reduced creation-card padding to preserve the shorter grid-row height.

## Acceptance Criteria

- [x] Normal Prompt cards do not render a Prompt icon tile.
- [x] Prompt titles use one-line truncation and descriptions use two-line truncation.
- [x] Prompt cards no longer display the current version token.
- [x] Update timestamps and Copy, Edit, and Move to Trash actions remain available.
- [x] Loading cards match the compact content structure without icon or version placeholders.
- [x] Type checking, linting, automated tests, and diff validation pass without automated visual verification.

## Out of Scope

- Changing the dashed creation card's icon, label, description, route, or interaction behavior.
- Changing the responsive grid column count, card navigation, or Prompt lifecycle actions.
- Redesigning the Prompt Trash table or other application cards.
- Changing Prompt data contracts, persistence, routes, queries, cache behavior, detail pages, or History.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 006 establishes the compact Prompt Card presentation. Add the next requested optimization to Plan 023 as Task 007.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 20 test files and 132 tests.
- `git diff --check` passed.
- Static inspection confirmed that normal Prompt cards no longer import or render the shared Prompt icon or Astryx `Token`.
- Static inspection confirmed that titles use `maxLines={1}` and descriptions use `maxLines={2}`.
- Static inspection confirmed that update timestamps and all three existing card actions remain present.
- Static inspection confirmed that the loading skeleton mirrors the icon-free, version-free compact structure.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
