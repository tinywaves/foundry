# Task 008: Load Historical Versions into Prompt Inputs

## Status

`completed`

## Goal

Present a selected historical Prompt through the existing editor inputs and consolidate its remaining Restore action into the fixed Header.

## Detail

The Prompt editor now renders one shared vertical `FormLayout` for both the current version and a selected historical version. After `loadPromptVersion` fetches a snapshot, `createPromptFormValues` maps its exact Title, Description, and Content into the existing controlled inputs. The mapper accepts either `PromptDetail` or `PromptVersionDetail`, and its pure model coverage verifies both current and historical inputs. The dedicated `PromptVersionContent` component and its separate metadata-and-content presentation were removed.

Historical inputs remain disabled because the existing Restore operation restores the selected immutable snapshot rather than arbitrary edits made before confirmation. A selected historical version is therefore not classified as an unsaved form change. Its values still drive the compact drag-row title, so the window title reflects the selected snapshot. Selecting Current or closing History clears the historical selection, resets values to the current-version baseline, clears field errors, and closes any pending Restore confirmation.

The fixed Header now replaces Save with a small primary Restore button whenever a historical version is selected. Restore retains the existing Lucide `RotateCcw` icon, confirmation dialog, exact-version target, mutation, cache updates, success and error feedback, and behavior of creating a new current version while preserving earlier versions. The selected-history Copy button, copy mutation binding, and dedicated divided footer were removed from the editor. Existing Prompt copy APIs and copy behavior outside this selected-history state remain unchanged.

The unsaved-draft confirmation shown before loading a historical snapshot now uses `Load Version`, `Discard and Load`, and matching descriptive copy rather than referring to a separate View presentation. The history panel's current, pending, disabled, timestamp-label, and selection behavior remains unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- Shared Prompt editor inputs for current and selected historical content.
- Exact historical snapshot mapping through `createPromptFormValues`.
- A fixed-Header Restore action for selected historical versions.
- Removal of the selected-history Copy action, dedicated footer, and `PromptVersionContent` component.
- Current-version form reset when Current is selected or History closes.

## Acceptance Criteria

- [x] Selecting a historical version places its exact Title, Description, and Content into the existing Prompt inputs.
- [x] Historical inputs are disabled and an unchanged historical selection is not treated as an unsaved form edit.
- [x] The drag-row Prompt title reflects the selected historical Title and retains the existing `Untitled` fallback.
- [x] Selecting Current or closing History restores the current-version form baseline and clears the historical selection.
- [x] A selected historical version replaces Save with a small primary Restore action in the fixed Header.
- [x] Restore retains its confirmation and exact-snapshot restoration semantics.
- [x] The selected-history editor state no longer renders Copy or a dedicated footer.
- [x] `PromptVersionContent` has no remaining implementation or references.
- [x] Current and historical Prompt data mapping has pure model coverage.
- [x] Type checking, linting, automated logic tests, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Making historical inputs editable or changing Restore to persist modified historical content.
- Changing current-version Save, validation, navigation, cache, toast, or unsaved-change behavior.
- Removing `copyPromptVersion` from main, preload, shared contracts, or copy workflows outside the selected-history editor state.
- Changing version persistence, restore mutation semantics, confirmation requirements, or immutable history guarantees.
- Changing the history panel's width, layout, timestamp labels, data states, or selection identifiers.
- Adding dependencies, component-rendering tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 008 establishes the shared disabled-input presentation and fixed-Header Restore action as the cumulative historical-version baseline. A later Prompt-focused optimization may be implemented and synchronized as Task 009 after separate approval.

## Verification

- `pnpm test -- src/renderer/src/pages/prompts/prompt-form-model.test.ts src/renderer/src/pages/prompts/prompt-history-model.test.ts` passed all 21 test files and 135 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection confirmed that one `FormLayout` renders current and historical values, and that selected historical inputs are disabled.
- Static inspection confirmed that the Header renders Restore instead of Save for a selected historical version and that no historical footer remains.
- Repository search confirmed that `PromptVersionContent` has no remaining implementation or references and that the editor no longer invokes `copyPromptVersion`.
- Static inspection confirmed that selecting Current or closing History restores the current-version values and clears historical selection state.
- The user accepted the completed optimization by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
