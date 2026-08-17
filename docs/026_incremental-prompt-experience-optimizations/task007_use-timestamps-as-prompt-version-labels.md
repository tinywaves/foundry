# Task 007: Use Timestamps as Prompt Version Labels

## Status

`completed`

## Goal

Identify each Prompt history entry directly by its creation time instead of exposing an implementation-oriented numeric version label.

## Detail

`PromptHistoryPanel` now formats every version's `createdAt` value with one module-level `Intl.DateTimeFormat`. The formatter follows the prior Astryx `Timestamp format="date_time"` presentation by including the viewer-local year, abbreviated month, day, hour, and two-digit minute. The resulting string is passed directly to `ListItem.label`.

The visible `Version N` label and the separate `Timestamp` description are removed, along with the now-unused Astryx `Timestamp` import. Each populated history row therefore renders one localized date-time label rather than two lines that describe the same snapshot. The pending spinner's accessible label uses the same timestamp instead of exposing the numeric version.

The numeric `version.version` value remains unchanged as the React key, current and pending comparison value, selected state identifier, and argument passed to `onSelectVersion`. Current status, disabled behavior, loading, empty and error states, queries, copying, restoration, and snapshot selection therefore retain their existing domain semantics.

## Findings

None.

## Dependencies

None.

## Deliverables

- Localized creation-time labels as the sole visible identity of each Prompt history entry.
- Single-line populated history rows without a duplicate timestamp description.
- Internal numeric version identifiers preserved for Prompt history behavior.

## Acceptance Criteria

- [x] Populated history rows do not display `Version N` labels.
- [x] Each populated history row displays its localized creation date and time as the primary label.
- [x] History rows no longer render a separate timestamp description line.
- [x] The pending spinner refers to the same timestamp label instead of a visible numeric version description.
- [x] Numeric versions remain the internal keys and current, pending, selected, and selection-callback identifiers.
- [x] Current status, disabled behavior, selection, queries, loading, empty, error, copying, and restoration behavior remain unchanged.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing timestamp precision, locale, time zone, ordering, relative-time behavior, or the stored version data model.
- Removing numeric versions from IPC contracts, persistence, query keys, selection state, restore targets, or repository logic.
- Changing the history panel title, fixed width, divider, header, close action, or compact list density.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 007 establishes creation timestamps as the visible Prompt history identity while keeping numeric versions internal. A later Prompt-focused optimization may be implemented and synchronized as Task 008 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that each populated `ListItem.label` comes from the shared localized date-time formatter and no description is rendered.
- Repository search confirmed that the visible `Version N`, `Loading Version N`, and Astryx `Timestamp` usage were removed from `PromptHistoryPanel`.
- Static inspection confirmed that numeric versions remain the key, comparison values, selected identifier, and `onSelectVersion` argument.
- The user accepted the completed optimization by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
