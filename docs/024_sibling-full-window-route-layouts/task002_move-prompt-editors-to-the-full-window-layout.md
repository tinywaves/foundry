# Task 002: Move Prompt Editors to the Full-Window Layout

## Status

`completed`

## Goal

Move New Prompt and Edit Prompt into the full-window route branch, then provide a consistent Prompt-owned Back and Cancel flow that returns to the canonical Prompts list without changing Prompt save, validation, History, version, restore, or error behavior.

## Detail

Move `/agent-extensions/prompts/new` and `/agent-extensions/prompts/:promptId/edit` from `appShellRoutes` into `fullWindowRoutes` in the renderer route configuration. Prompt list, detail, Trash, trashed Prompt detail, and every non-editor page will remain under `AppShellLayout`. The existing standard-shell wildcard fallback will remain unchanged. React Router's exact New/Edit matches will select only `FullWindowLayout`, outranking both the standard-shell wildcard and the dynamic Prompt detail route, so each editor URL renders one layout branch and one Prompt editor instance without a hidden or duplicated shell route tree.

Add a narrow Prompt-owned navigation model under the existing Prompt domain. It will define the canonical editor exit path as `/agent-extensions/prompts`, preserve `replace: true` as part of the shared exit contract, and expose the common exit-disabled rule covering save mutation, historical-version loading, and restore mutation states. Back to Prompts and Create/Edit Cancel will consume this same contract so their targets and replacement behavior cannot drift. Keep this definition out of the application root, router layout components, and generic shared modules.

Extend the renderer-owned `PageHeader` with an optional `start` slot placed before the fill title region while retaining the existing right-side `action` slot. Existing consumers that omit `start` will preserve their current structure and behavior. The Prompt editor will provide a ghost Astryx `Button` in this slot with `type="button"`, a Lucide `ArrowLeft` icon, and the visible and accessible label Back to Prompts. History will remain in the existing right-side action slot for Edit Prompt.

Extend `PromptPageLoading` with optional header-start content and pass the Back to Prompts trigger only from the Edit Prompt loading state. The loading trigger will remain enabled so a user can leave while the initial Prompt detail request is unresolved. Prompt detail and trashed Prompt loading states will omit the new slot and remain unchanged.

New Prompt will show Back to Prompts to the left of its title and retain Cancel and Save in the footer. Edit Prompt will show Back to Prompts on the left, its title in the fill region, and History on the right; its ordinary footer will retain Cancel and Save. Both Back and Cancel will call the same replacement navigation to the Prompts list. Edit Cancel will no longer return to the current Prompt detail. Save will continue to set `allowNavigationRef`, update the relevant caches, and replacement navigate to the saved Prompt detail route.

Continue using the existing `useBlocker` flow without introducing a second discard-confirmation state. When form values are dirty, Back or Cancel will create the intended replacement transition and open the existing Discard Unsaved Changes dialog. Keep Editing will reset the blocker while preserving the current form, History, selected-version, and dialog state. Discard Changes will proceed with the original Prompts-list transition. Non-dirty editors and historical-version views without draft changes will return directly to the list.

Define one `isExitDisabled` condition for save pending, version loading, or restore pending. Apply it to Back and to Cancel whenever Cancel is present. The historical-version footer will continue to show Copy and Restore rather than adding Cancel, while the header Back trigger remains available except during the approved unsafe states. Copy activity will not disable navigation because it does not mutate Prompt state or persisted content. Keep the existing History, version selection, version-discard confirmation, restore confirmation, Copy, Save, field validation, API error mapping, toast, and form-focus behavior unchanged.

Use static inspection to confirm that New/Edit are registered only under `FullWindowLayout`, while Prompt list, detail, Trash, trashed Prompt detail, redirects, other application routes, and unknown-path fallback remain under `AppShellLayout`. Keep focused pure-function tests for the Prompt editor navigation model covering the canonical list path, replacement option, and every exit-disabled state combination. Use static inspection and the production build for route ownership, the PageHeader slot, Back trigger composition, loading-state wiring, and unchanged domain behavior because repository rules prohibit renderer UI tests and visual automation.

## Findings

None.

## Dependencies

None.

## Deliverables

- New Prompt and Edit Prompt route definitions under `FullWindowLayout`.
- Prompt list, detail, Trash, and all non-editor routes retained under `AppShellLayout`.
- A Prompt-owned canonical list exit target, replacement option, and shared unsafe-state rule.
- An optional left-side `PageHeader` start slot with unchanged default consumers.
- Back to Prompts in New Prompt, Edit Prompt, and the Edit Prompt loading state.
- Consistent Prompts-list replacement navigation for Back and Create/Edit Cancel.
- Existing dirty-navigation confirmation reused by both Prompt editor exit controls.
- Back and Cancel disabling during save, historical-version loading, and restore operations.
- Existing save, validation, History, version, restore, Copy, loading, and error behavior preserved.
- Static sibling-layout route ownership verification and focused Prompt editor navigation-model tests.

## Acceptance Criteria

- [x] New Prompt and Edit Prompt match only `FullWindowLayout`.
- [x] New/Edit no longer match or render `AppShellLayout`.
- [x] New/Edit fill the Foundry application window with the SideNav absent.
- [x] Each New/Edit URL renders exactly one Prompt editor route branch.
- [x] Prompt list, detail, Trash, trashed Prompt detail, and all non-editor pages continue to use the standard shell.
- [x] New Prompt shows a left-aligned Back to Prompts trigger with a Lucide `ArrowLeft` icon.
- [x] Edit Prompt shows Back to Prompts on the left and retains History on the right.
- [x] The Edit Prompt loading header also shows Back to Prompts.
- [x] Prompt detail and trashed Prompt loading headers remain unchanged.
- [x] Back, Create Cancel, and Edit Cancel all navigate with `replace: true` to `/agent-extensions/prompts`.
- [x] Edit Cancel no longer returns to the current Prompt detail route.
- [x] Dirty Back and Cancel navigation both open the existing discard confirmation.
- [x] Keep Editing preserves the current form, History, version, and dialog state.
- [x] Discard Changes completes the originally requested Prompts-list navigation.
- [x] Back and Cancel cannot leave during save, historical-version loading, or restore operations.
- [x] Save still replacement navigates to the saved Prompt detail route.
- [x] History, version selection, Copy, Restore, and their confirmation dialogs retain their current behavior.
- [x] Prompt fields, validation, API input, API error mapping, and focus behavior remain unchanged.
- [x] On macOS, New/Edit use the full-width drag row supplied by `FullWindowLayout`.
- [x] On Windows and Linux, New/Edit render without an additional custom drag row.
- [x] No layout or application root contains Prompt-specific route activation logic.
- [x] No dependency, IPC, preload, or main-process changes are introduced.

## Out of Scope

- Moving Prompt list, detail, Trash, or trashed Prompt detail into the full-window layout.
- Changing Prompt data contracts, IPC, persistence, or validation rules.
- Changing History panel, version-query, Copy, or restore semantics.
- Adding Cancel to the historical-version footer.
- Adding a drawer, overlay, animation, gesture, plugin system, or dynamic route registry.
- Generalizing Back to Prompts into global full-window navigation.
- Adding a second full-window route consumer.
- Launching the application or using screenshots, browser automation, accessibility-tree inspection, or desktop automation for visual acceptance.

## Handoff

Completing Task 002 completes Plan 024. Future full-window experiences can register additional children under `FullWindowLayout` and own their domain-specific headers and exit behavior without modifying the application root or standard shell.

## Verification

- Initial completion evidence before the maintenance adjustment: `pnpm test` passed 22 test files and 139 tests, including exclusive full-window route matching and Prompt editor exit-contract coverage.
- `pnpm typecheck` passed for the node and renderer TypeScript projects.
- `pnpm lint` passed; ESLint emitted only the repository configuration's existing stylistic deprecation warnings.
- `pnpm build` passed for the main, preload, and renderer production bundles.
- `git diff --check` passed.
- Initial React Router `matchRoutes` coverage confirmed exclusive full-window matching for New/Edit and continued standard-shell matching for Prompt list/detail/Trash, other routes, redirects, and fallback behavior before the renderer UI route tests were removed.
- Prompt editor navigation-model tests confirmed the canonical list path, `replace: true`, the safe idle state, and save/version-load/restore disabled states.
- Static inspection confirmed Back, Cancel, Save, Edit loading, History, dirty-blocker, route ownership, and the absence of Prompt-specific application-root or layout activation logic.
- No application launch, screenshot, browser automation, accessibility-tree inspection, or desktop automation was performed, per repository UI verification rules.

## Maintenance Adjustments

### 2026-08-15 02:16:35: Remove Renderer UI Route Tests

- Change: Removed renderer UI route tests and test-only alias/StyleX infrastructure; added the renderer pure-function testing policy to `AGENTS.md`.
- Previous state: `router.test.ts` imported the rendered route configuration; Vitest used renderer aliases and a StyleX runtime stub; Task 002 completion verification recorded 22 test files and 139 tests.
- Reason: The user requires renderer automated tests to cover functional behavior and pure logic only, not UI components or styling.
- Documentation impact: Synchronized the Plan 024 index and Task 002 current-state and verification statements.
- Verification: `pnpm test` passed 21 test files and 135 tests; `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
