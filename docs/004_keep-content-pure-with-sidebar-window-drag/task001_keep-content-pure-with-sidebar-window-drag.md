# Task 001: Keep Content Pure with Sidebar Window Drag

## Status

`completed`

## Goal

Keep the content region focused on routed page rendering while retaining the macOS window-drag surface in the sidebar.

## Detail

- Keep the existing sidebar-top `WindowDragRegion` rendered only on macOS.
- Remove the content-top `WindowDragRegion` from the renderer shell.
- Remove the route-derived content title and its supporting lookup.
- Preserve the existing sidebar navigation, route selection, resizing, scrolling, and platform guards.
- Keep `WindowDragRegion`'s existing default alignment and API because no remaining caller needs custom content alignment.
- Do not modify main, preload, IPC, or Electron window configuration.

## Findings

None.

## Dependencies

None.

## Deliverables

- A macOS sidebar-top window-drag surface.
- A content region that begins directly with routed page content.
- Preserved sidebar navigation, selected-state, resizing, scrolling, and platform behavior.

## Acceptance Criteria

- [x] macOS retains a window-drag region at the top of the sidebar.
- [x] The content area no longer renders a `WindowDragRegion`.
- [x] The content area no longer renders a route-derived title.
- [x] Routed page content begins directly below the shell boundary.
- [x] Sidebar navigation, selected states, resizing, and page scrolling remain unchanged.
- [x] Windows and Linux retain their current native title-bar behavior.
- [x] No dependency is added and no main, preload, or IPC change is introduced.

## Out of Scope

- Additional navigation items or nested routes.
- Content-area window dragging or content-area title display.
- Native window title synchronization, persistence, or state management.
- New test infrastructure.

## Handoff

After this task, the renderer keeps window-level dragging in the sidebar and leaves the content surface dedicated to routed page rendering. Future page work can use the content region without accounting for a title or drag strip above it.

## Verification

- `pnpm typecheck:node`: Passed.
- `pnpm typecheck:web`: Passed.
- `pnpm exec eslint src/renderer/src`: Passed with existing ESLint configuration deprecation warnings.
- `pnpm exec electron-vite build`: Passed for main, preload, and renderer.
- `git diff --check`: Passed.
- `pnpm dev`: The refactored Electron development app launched successfully on macOS; the renderer dev server moved to port `5174` because port `5173` was already in use.
- Manual route clicking and drag interaction were not performed in this session because no desktop interaction tool was available; the shell structure and platform guard were verified through the implementation and build checks.

## Change Control

### 2026-08-03: Move Window Dragging to the Sidebar

- Original task: Display the current sidebar item in a content-top `WindowDragRegion` and preserve content-area window dragging.
- User decision: Remove the content-top drag region and title so content remains visually clean; accept dragging the macOS window only from the sidebar-top region.
- Implementation change: The content `WindowDragRegion`, route-derived title lookup, `Text` import, shared navigation metadata, and custom `hAlign` prop were removed. The sidebar navigation and its existing drag region remain.
- Documentation impact: The task goal, detail, deliverables, acceptance criteria, out-of-scope boundary, handoff, and verification statements were synchronized. The superseded behavior is preserved here as history.
- Verification: Renderer type checks, lint, build, and diff validation are rerun after the refactor.
