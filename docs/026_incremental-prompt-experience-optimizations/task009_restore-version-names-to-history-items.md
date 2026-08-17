# Task 009: Restore Version Names to History Items

## Status

`completed`

## Goal

Restore a clear visible version name to every Prompt history item while retaining its creation time as supporting context.

## Detail

Each populated `PromptHistoryPanel` row now derives a `Version N` name from its existing numeric `version.version` value and passes that name to `ListItem.label`. The localized creation time remains available through the existing module-level `Intl.DateTimeFormat`, whose identifier now reflects its timestamp responsibility, and the formatted value is passed to `ListItem.description`.

This restores the two-level item hierarchy that existed before Task 007 while retaining Task 007's shared date-time formatter and localized year, abbreviated month, day, hour, and two-digit minute presentation. The version name is the primary scanning identity, and the saved time is secondary context beneath it.

The pending spinner's accessible label again refers to the corresponding `Version N` name. The numeric version remains the React key, current and pending comparison value, selected identifier, and `onSelectVersion` argument. Current status, selection, disabled behavior, ordering, queries, loading, empty and error states, and snapshot loading remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- A visible `Version N` primary label for every populated history item.
- A localized creation-time description beneath each version name.
- Version-name loading announcements without changes to existing history behavior.

## Acceptance Criteria

- [x] Every populated Prompt history row displays its `Version N` name as the primary label.
- [x] Every populated Prompt history row retains its localized creation time as secondary description text.
- [x] The pending spinner identifies the version by its restored `Version N` name.
- [x] Numeric versions remain the keys and current, pending, selected, and selection-callback identifiers.
- [x] Current status, selection, disabled behavior, ordering, queries, loading, empty, error, and click behavior remain unchanged.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing timestamp precision, locale, time zone, ordering, or relative-time behavior.
- Changing stored version data, IPC contracts, query keys, selection state, or restore targets.
- Changing the history panel title, fixed width, divider, header, close action, or compact list density.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 009 establishes `Version N` plus localized creation time as the cumulative Prompt history-item identity. A later Prompt-focused optimization may be implemented and synchronized as Task 010 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection confirmed that `ListItem.label` receives `Version N` and `ListItem.description` receives the localized timestamp.
- Static inspection confirmed that the pending spinner announces the same version name.
- Static inspection confirmed that the numeric version remains the React key, all current, pending, and selected comparison values, and the `onSelectVersion` argument.
- No renderer component test was added because repository policy excludes rendered UI and DOM assertions from renderer tests.
- The user accepted the completed optimization by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
