# Task 003: Clarify Skill Import Warnings

## Status

`completed`

## Goal

Treat absent optional Discovery Roots as empty scan locations and provide inspectable details for warnings that require attention.

## Detail

Foundry synchronizes built-in Distribution Targets for supported local agent environments even when those environments are not installed. Their conventional Skill directories are optional Discovery Roots. The previous discovery coordinator added every missing root to `rootFailures`, so importing existing Skills could finish with warnings solely because unused runtimes had never created their directories.

The scanner continues to record a missing root internally. This distinction remains necessary because an unavailable whole root is not a complete observation and must not cause every previously recorded Skill Installation below that root to be marked missing. The coordinator no longer promotes the `missing` status into `rootFailures`; a scan of an absent location therefore contributes no imported package, adoption, or warning. A root that exists but cannot be inspected remains `unreadable` and continues to produce a root failure.

The Skill Store import Banner now derives its status and description from a pure import-result model. When actionable issues exist, a `View Details` action opens an Astryx information Dialog. Warning items follow the Dialog title directly without a redundant intermediate list heading. The result model retains the Distribution Target, resolved scan root, optional relative path, and readable explanation for every issue; Task 004 compresses that context into one exact filesystem location with a Target fallback. The Dialog covers unreadable roots, unreadable directory entries, blocked symbolic-link escapes, traversal limits, unreadable Skill candidates, reconciliation failures, and content changes during adoption.

Import details remain scoped to the current page result. They are not persisted as history, and this task adds no IPC channel, preload capability, database table, or migration.

## Findings

- Built-in Target synchronization intentionally includes supported runtimes whose default Skill directories may not exist.
- The previous Banner count combined candidate warnings and all root failures, but exposed neither collection to the user.
- Retaining `missing` in individual root results preserves safe observation behavior without presenting optional absence as a failure.
- The import result already contains enough Target IDs, root paths, relative paths, and warning codes to build details without widening the discovery contract.

## Dependencies

- Astryx `Banner` for the import summary and `endContent` action.
- Astryx `Dialog`, `Layout`, and `Button` for bounded warning details and their entry action.
- Existing Distribution Target metadata query for user-facing Target names.

## Deliverables

- Missing Discovery Roots excluded from actionable root failures.
- Unreadable roots and package-level scan failures preserved as warnings.
- A pure renderer model for warning counts, import summaries, and issue presentation.
- A `View Details` action and warning-details Dialog in the Skill Store.
- Focused coordinator and renderer-model behavior tests.

## Acceptance Criteria

- [x] An enabled Discovery Root that does not exist produces no scan warning.
- [x] A missing root remains distinguishable in internal root results and does not mark recorded installations missing.
- [x] A root that exists but cannot be inspected remains an actionable warning.
- [x] Existing package-level discovery warning codes remain actionable.
- [x] Import summaries use the number of attempted Targets when no warnings occur.
- [x] The warning Banner exposes a `View Details` action only when actionable issues exist.
- [x] Warning items appear without a redundant intermediate `Scan warnings` heading.
- [x] Warning details retain a readable reason and exact filesystem location, with the Distribution Target available as a fallback.
- [x] The implementation adds no persistence, IPC, preload, or dependency changes.
- [x] Renderer tests cover only the pure import-result model and do not render React UI.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Persisting import or warning history.
- Automatically creating optional runtime directories.
- Disabling built-in Distribution Targets based on runtime installation detection.
- Changing scan depth, symbolic-link policy, directory limits, or package recognition.
- Treating an unavailable whole root as a complete observation of previously recorded installations.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 003 establishes that optional path absence is an empty discovery outcome, while actionable scan failures remain inspectable from the current import result. Add later Skills refinements as subsequent tasks without broadening missing-root handling into installation observation semantics.

## Verification

- `pnpm exec vitest run src/main/skills/skill-discovery-coordinator.test.ts src/renderer/src/pages/skills/skill-import-result-model.test.ts` passed 6 focused tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that `missing` roots do not enter `rootFailures`, while `unreadable` roots do.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
