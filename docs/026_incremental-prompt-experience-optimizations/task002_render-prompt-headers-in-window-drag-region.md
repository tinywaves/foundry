# Task 002: Render Prompt Headers in the Window Drag Region

## Status

`completed`

## Goal

Use the full-window drag row as the Prompt editor header so navigation, title, and actions share one compact window-chrome surface without losing window dragging or control interaction.

## Detail

The full-window route previously rendered an empty macOS-only `WindowDragRegion` above the Prompt editor's separate `LayoutHeader`. This produced two stacked top regions even though `WindowDragRegion` already accepts children.

`FullWindowLayout` now remains a domain-agnostic full-window outlet without rendering an empty drag row. The Prompt-owned `PromptEditorHeader` renders its existing `PageHeader` directly inside `WindowDragRegion`, and that composed header remains the editor's existing `Layout.header`. The Edit Prompt loading state supplies the same composed header through the shared loading component's optional custom-header slot, while ordinary Prompt detail and Trash loading states retain their existing default headers.

`WindowDragRegion` retains its compact default for the standard SideNav and adds a header variant with token-based minimum height and macOS window-control inset. It renders header children across the available width and enables dragging only on macOS. `WindowNoDragRegion` applies Electron's `no-drag` app-region value only around Back to Prompts and History, preserving their click behavior while leaving the title and unused header surface draggable. Windows and Linux render the same Prompt header without applying a draggable app region.

## Findings

None.

## Dependencies

None.

## Deliverables

- A Prompt editor header rendered directly inside `WindowDragRegion`.
- One combined top region for New Prompt, Edit Prompt, and Edit Prompt loading.
- Explicit no-drag wrappers for interactive Back and History controls.
- A token-sized header variant with macOS window-control clearance.
- Removal of the empty drag row from `FullWindowLayout`.
- A custom-header option for the shared Prompt loading layout.

## Acceptance Criteria

- [x] New Prompt renders Back to Prompts and its title inside the window drag region.
- [x] Edit Prompt renders Back to Prompts, its title, and History inside the window drag region.
- [x] The Edit Prompt loading state uses the same combined header without duplicating it.
- [x] Back to Prompts and History remain interactive within the macOS drag surface.
- [x] The remaining macOS header surface can drag the application window and leaves token-based clearance for window controls.
- [x] Windows and Linux render the same Prompt header without applying a draggable app region.
- [x] The standard SideNav retains the compact default drag-region height.
- [x] Prompt navigation, unsaved-change protection, History, form, footer, save, validation, and loading behavior remain unchanged.
- [x] Type checking, linting, automated behavior tests, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Moving Prompt list, detail, Trash, or trashed Prompt detail into the full-window route branch.
- Changing Prompt navigation targets, form fields, validation, persistence, save, History, version, restore, or confirmation behavior.
- Introducing a global full-window header registry, Context, Provider, portal, or route metadata system.
- Changing the standard SideNav drag-region presentation.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 002 establishes direct Prompt-owned composition of `WindowDragRegion` and `PageHeader` as the full-window editor title bar. A later Prompt-focused optimization may be implemented and synchronized as Task 003 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 21 test files and 135 tests.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection confirmed that `PromptEditorHeader` renders `PageHeader` directly inside `WindowDragRegion` within the existing `Layout.header` slot.
- Static inspection confirmed that Back to Prompts and History are wrapped with `WindowNoDragRegion`, while `WindowDragRegion` applies dragging only on macOS.
- Static inspection confirmed that `FullWindowLayout` no longer renders an empty drag row and that the Edit Prompt loading state uses the same custom header.
- Static inspection confirmed that no Context, Provider, portal, new dependency, IPC, preload, main-process, or routing change was introduced.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
