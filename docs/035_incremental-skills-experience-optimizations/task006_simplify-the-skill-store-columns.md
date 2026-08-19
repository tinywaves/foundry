# Task 006: Simplify the Skill Store Columns

## Status

`completed`

## Goal

Keep the Skill Store table focused on Skill identity, current local content status, and available row actions.

## Detail

The Store inventory previously used `Store` as the heading for each package's local content observation. Because the page and table already establish the Store context, that heading repeated the surface name instead of describing the value. The heading is now `Status`, which directly labels the `Available`, `Missing`, and `Unreadable` states rendered in the cells.

The table also exposed an `Observed` column, but its value came from the package record's `updatedAt` timestamp rather than `storeObservation.observedAt`. More importantly, neither package update time nor filesystem observation time supports the primary list workflow: identify a Skill, assess whether its local content is usable, and choose an action. The time column and its renderer-side formatting are therefore removed instead of relabeled or rebound.

The remaining columns use proportional widths of `3:1:1` for `Skill`, `Status`, and `Actions`. This gives the text-heavy identity column the majority of available space while retaining explicit minimum widths for status and actions through the Astryx Table contract.

## Findings

- The Store page already supplies the context that the previous `Store` column heading repeated.
- The three displayed states describe current local package content availability, so `Status` is the direct heading.
- The `Observed` heading did not match its `updatedAt` source value.
- Both possible time meanings are secondary to the table's repeated identify, assess, and act workflow.
- Astryx Table proportional widths preserve minimum column dimensions while distributing the removed column's space.

## Dependencies

- Existing Skill Store Table and `SkillStoreRow` presentation model.
- Existing local Store observation presentations for `Available`, `Missing`, and `Unreadable`.
- Astryx `Table` proportional column widths.

## Deliverables

- `Status` replaces the `Store` column heading.
- The time column and its row value are removed.
- Renderer-only date formatting is removed from the Store page.
- Skill identity receives the majority of the remaining table width.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] The Store table headers are `Skill`, `Status`, and `Actions`.
- [x] The Status cells retain their existing observation labels and status dots.
- [x] No update or observation timestamp appears in the Store table.
- [x] `SkillStoreRow` no longer contains a time presentation field.
- [x] The Store page no longer formats package timestamps for table display.
- [x] The Skill column receives more proportional width than Status or Actions.
- [x] Package detail timestamps and underlying contract fields remain unchanged.
- [x] The implementation adds no persistence, IPC, preload, dependency, or Astryx changes.
- [x] Renderer verification does not render React UI or assert table structure or styling.

## Out of Scope

- Removing or renaming timestamps on the Skill detail page.
- Changing Store observation states or their presentation labels.
- Changing sorting, filtering, row actions, package identity, or table density.
- Modifying package metadata or observation persistence.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 006 establishes a three-column Store inventory centered on identity, status, and actions. Future columns should be added only when they support a repeated list-level decision rather than duplicating detail-page metadata.

## Verification

- `pnpm exec vitest run` passed all 60 test files and 304 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that only the Store table presentation removes time data; package detail timestamps and shared contracts remain unchanged.
- The application will not be launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation will be performed, as required by repository policy.
