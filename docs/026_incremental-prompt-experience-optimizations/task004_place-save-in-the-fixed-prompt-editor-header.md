# Task 004: Place Save in the Fixed Prompt Editor Header

## Status

`completed`

## Goal

Keep the complete Prompt editor header fixed while moving the normal Save action into a balanced header toolbar.

## Detail

The Prompt editor retains its compact two-row `LayoutHeader`: the title-only `WindowDragRegion` remains above a non-drag action row. Back to Prompts stays at the start of the action row. A fill-sized `StackItem` separates it from the end-aligned actions, where edit-only History precedes a small primary Save button. New Prompt therefore shows Back to Prompts and Save, while the current Edit Prompt shows Back to Prompts, History, and Save.

Save remains a form submit action and preserves the existing pending, disabled, validation, persistence, toast, cache, and post-save navigation behavior. The normal editor footer is no longer rendered. When a historical version is selected, Save remains unavailable and the existing Copy and Restore actions continue to render in their dedicated divided footer; History remains available in the header for closing the panel or returning to the current version.

The fixed-header behavior is established structurally rather than with an additional sticky or fixed-position style. `FullWindowLayout` now uses an explicit `100dvh` height instead of an unresolved percentage height. Its fill-sized, overflow-constrained main region bounds the Prompt form and nested `Layout`, allowing `LayoutContent` to own scrolling while the title and action rows remain in the non-scrolling `LayoutHeader`. The Edit Prompt loading state continues to use the same header and full-window height chain.

## Findings

None.

## Dependencies

None.

## Deliverables

- A balanced fixed Prompt action row with Back to Prompts at the start and page actions at the end.
- A small primary Save action in the fixed header for normal create and edit states.
- Removal of the normal editor footer without changing historical-version actions.
- Explicit full-window viewport containment that keeps scrolling inside `LayoutContent`.

## Acceptance Criteria

- [x] Back to Prompts remains at the start of the Prompt header action row.
- [x] The current Edit Prompt aligns History and Save at the end of the action row, with Save as the trailing action.
- [x] New Prompt aligns Save at the end of the action row without rendering History.
- [x] Save uses the small primary treatment and retains its form submission, loading, disabled, validation, persistence, and navigation behavior.
- [x] The normal editor state does not render a footer after Save moves into the header.
- [x] A selected historical version omits Save and preserves the existing Copy and Restore footer actions.
- [x] The complete Prompt header remains fixed while the editor body scrolls inside `LayoutContent`.
- [x] `FullWindowLayout` remains domain-agnostic and fills the renderer viewport explicitly.
- [x] The Edit Prompt loading state remains compatible with the fixed full-window header structure.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing Prompt fields, validation rules, persistence, cache behavior, save navigation, History data, version loading, copying, restoration, or confirmation dialogs.
- Changing the title-only drag row, macOS traffic-light inset, header divider decision, Back navigation target, or unsaved-change blocker.
- Moving Prompt list, detail, Trash, or trashed Prompt detail routes into the full-window layout.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 004 establishes the fixed full-window Prompt header with balanced navigation and save actions as the cumulative Prompt editor baseline. A later Prompt-focused optimization may be implemented and synchronized as Task 005 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that Back to Prompts renders before a fill-sized spacer, followed by edit-only History and the small primary Save action.
- Static inspection confirmed that New Prompt omits History, a selected historical version omits Save, and Copy and Restore remain in the historical-version footer.
- Static inspection confirmed that Save remains a submit button wired to the existing mutation and form handler while the normal editor footer is absent.
- Static inspection confirmed that `FullWindowLayout` uses `100dvh`, retains its fill-sized overflow-constrained main region, and leaves scrolling to the nested `LayoutContent` beneath `LayoutHeader`.
- The user accepted the final fixed-header revision by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
