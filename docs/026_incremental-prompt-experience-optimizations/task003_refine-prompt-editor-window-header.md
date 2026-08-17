# Task 003: Refine the Prompt Editor Window Header

## Status

`completed`

## Goal

Refine the Prompt editor window chrome so the compact drag row presents only the current Prompt name while navigation and History remain in a separate action row.

## Detail

The Prompt editor header now uses two vertically stacked regions inside its existing `LayoutHeader`. The first region is a 28px `WindowDragRegion` that contains only a compact heading. On macOS, the header variant reserves 80px at the start edge for the native traffic-light controls and uses a fill-sized `StackItem` so the title content occupies the entire remaining row. Windows and Linux render the same title row without enabling Electron window dragging or applying the macOS inset.

The visible Prompt name is derived directly from `values.title.trim()`, so it updates as the Title field changes and displays `Untitled` for an empty or whitespace-only value. The Edit Prompt loading state continues to use the same Prompt-owned header composition and displays its loading title until Prompt data is available.

Back to Prompts and the edit-only History toggle render in a separate action row below the drag surface. Both controls use their small size, the Header no longer renders a bottom divider, and the normal editor footer now contains only Save. Back to Prompts retains the existing list navigation target and continues to pass through the editor's unsaved-change blocker, so removing Cancel does not remove protected return navigation. Historical-version mode retains its existing Copy and Restore footer actions.

Because interactive controls no longer render inside `WindowDragRegion`, the unused `WindowNoDragRegion` component, props, and Electron `no-drag` style were removed. The standard SideNav continues to use the compact default drag-region variant, and `FullWindowLayout` remains free of a second empty drag row.

## Findings

None.

## Dependencies

None.

## Deliverables

- A 28px title-only Prompt window drag row.
- An 80px macOS start inset with title content filling the remaining row.
- A Prompt name synchronized with the trimmed Title field and an `Untitled` fallback.
- A separate small-control row for Back to Prompts and edit-only History.
- Removal of the Header divider and redundant footer Cancel action.
- Removal of the unused `WindowNoDragRegion` implementation.

## Acceptance Criteria

- [x] The Prompt editor drag row renders only the Prompt name and contains no interactive controls.
- [x] The drag row remains 28px high and reserves 80px only at the macOS start edge.
- [x] The drag-row child fills the full width remaining after the macOS inset.
- [x] Editing Title updates the displayed Prompt name, and an empty or whitespace-only Title displays `Untitled`.
- [x] Back to Prompts and edit-only History render in the separate row below the drag surface using small controls.
- [x] The Header renders without a bottom divider.
- [x] The normal editor footer contains Save without a duplicate Cancel action.
- [x] Back to Prompts preserves the existing return target and unsaved-change confirmation behavior.
- [x] Historical-version Copy and Restore actions remain unchanged.
- [x] `WindowNoDragRegion` and its `no-drag` style have no remaining implementation or references.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing Prompt form fields, validation, persistence, save semantics, History data, version selection, restore behavior, or confirmation copy.
- Redesigning the Prompt editor body, content textarea, footer surface, History panel, Prompt list, detail, or Trash pages.
- Changing Electron's native traffic-light position, main-process window options, preload APIs, IPC, routing, or platform title-bar behavior.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 003 establishes the title-only drag row and separate Prompt action row as the cumulative Prompt editor header baseline. A later Prompt-focused optimization may be implemented and synchronized as Task 004 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that `WindowDragRegion` renders only the Prompt title row, while Back to Prompts and History render in the following non-drag row.
- Static inspection confirmed that the header variant uses the 28px spacing token, applies an 80px start inset only when the Prompt header is draggable on macOS, and fills the remaining row through `StackItem`.
- Static inspection confirmed that the displayed name is derived from `values.title.trim()` with an `Untitled` fallback.
- Static inspection confirmed that the Header divider and normal-editor Cancel action are absent while Back to Prompts still uses the existing navigation path and blocker flow.
- Repository search confirmed that `WindowNoDragRegion` and `noDragRegionStyle` have no remaining implementation or references.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
