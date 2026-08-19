# Task 009: Show Target Installation Status

## Status

`completed`

## Goal

Use each selectable Distribution Target card's status area to report the current Skill Installation rather than repeat the card's selection state.

## Detail

Task 007 introduced whole-card selection but also displayed `Selected` or `Not selected` beside every Target. The selected border already communicates that transient choice, so the status label duplicated interaction state without helping the user decide where the Skill still needs to be distributed.

Foundry already exposes active `SkillInstallationView` records through a query filtered by Skill ID. The Distribution Dialog now joins those records to Target cards by Target ID. A Target with available installation content displays `Installed`; a Target without a record displays `Not installed`. Recorded installations whose target content is missing or unreadable display `Missing` or `Unreadable` instead of making a false installed claim.

While installation data is loading, cards display `Checking`. If the query cannot provide installation data, they display `Unknown` and the existing error Banner provides the cause. Once a selected Target enters preflight or distribution, operational feedback such as `Ready to install`, `Will replace`, `Blocked`, `Distributing`, `Succeeded`, or `Failed` temporarily takes precedence. Selection itself remains visible through the Astryx `SelectableCard` state.

The domain term is Skill Installation rather than download. No new domain term or glossary change is required because `CONTEXT.md` already distinguishes Skill Installation, Missing Installation, and Distribution Target.

This task changes renderer query composition and pure presentation logic only. It reuses existing contracts and constrained APIs without changing persistence, IPC, preload, main-process, filesystem, or distribution behavior.

## Findings

- Selection is transient input for the next distribution command; it is not persisted installation state.
- The selected card border already communicates selection without a duplicate status label.
- `listInstallations({ skillId })` provides the authoritative active installation records needed by the Dialog.
- Installation-record presence alone is insufficient because target content can be missing or unreadable.
- Preflight and execution feedback remains more actionable than installation presence while an operation is active.

## Dependencies

- Existing Skill Installation query and `SkillInstallationView` contract.
- Existing Target content observations.
- Existing Astryx `SelectableCard` and `StatusDot` presentation.
- Existing distribution preflight and result state.

## Deliverables

- Skill-filtered installation data in the Distribution Dialog.
- Target-card status derived from the matching Skill Installation and its target observation.
- Explicit loading and unavailable states for installation observations.
- Preserved selection, select-all, preflight, execution, and result behavior.
- Pure presentation tests for installed, not installed, missing, and unreadable states.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] Unselected and selected cards do not display `Not selected` or `Selected` status labels.
- [x] A Target with available installation content displays `Installed`.
- [x] A Target without an active installation record for the current Skill displays `Not installed`.
- [x] Missing and unreadable Target content remain distinct from installed and not installed states.
- [x] Loading does not temporarily appear as `Not installed`.
- [x] Installation query failure does not make a false installation claim.
- [x] Preflight and distribution feedback still overrides the baseline status for selected Targets.
- [x] Whole-card multi-selection and select-all behavior remain unchanged.
- [x] The implementation adds no persistence, IPC, preload, main-process, dependency, or Astryx changes.
- [x] Renderer tests cover only pure presentation logic and do not render UI or StyleX modules.

## Out of Scope

- Replacing selectable cards or removing multi-selection.
- Changing installation derivation, discovery, preflight, or distribution semantics.
- Showing detailed synchronization status in this selection surface.
- Renaming existing domain terms to download terminology.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 009 establishes a strict separation between transient selection and observed installation presence. Future Target-card refinements should preserve installation status as the baseline and let only active operational feedback override it.

## Verification

- `pnpm exec vitest run` passed all renderer-independent automated tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that selection no longer supplies baseline status, installation data is filtered by Skill ID, and operational feedback remains scoped to selected Targets.
- The application will not be launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation will be performed, as required by repository policy.
