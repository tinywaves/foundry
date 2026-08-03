# Keep Content Pure with Sidebar Window Drag

## Status

`completed`

## Goal

Keep the content area focused on rendering page content while retaining macOS window dragging in the sidebar's top `WindowDragRegion`.

## Detail

The sidebar retains its existing macOS-only top `WindowDragRegion`. The content area no longer renders a drag region or a route-derived title, so page content starts directly below the shell boundary without window-level UI mixed into the content surface.

Windows and Linux retain their current native title-bar behavior.

## Scope

- Preserve the macOS sidebar-top `WindowDragRegion`.
- Remove the content-top `WindowDragRegion`.
- Remove the content-top route title display.
- Keep the content region focused on routed page rendering.
- Preserve the existing `AppShell`, sidebar resizing, page routing, and platform behavior.
- Use the existing Astryx components and StyleX styling system.

## Out of Scope

- Content-area window dragging.
- A content-area route title or other window-level controls.
- Additional sidebar items, nested routes, or page functionality.
- Changes to the window title bar, native traffic lights, or Electron main-process configuration.
- New dependencies, state management, persistence, or IPC.
- New automated test infrastructure.

## Decisions

- The macOS sidebar-top `WindowDragRegion` remains the only custom window-drag surface.
- The content area starts directly with the routed page content.
- No route-derived title is rendered in the content area.
- Windows and Linux retain their current native title-bar behavior.
- The plan contains one implementation task because this is a single, independently reviewable renderer layout behavior.

## Change Control

### 2026-08-03: Move Window Dragging to the Sidebar

- Original behavior: The completed plan displayed the current sidebar item and kept a second macOS `WindowDragRegion` above content.
- User decision: Keep the content area visually clean and accept dragging the macOS window only from the sidebar's top region.
- Superseded behavior: The content-top drag region and route-derived title are removed.
- Reason: The content area should remain focused on rendering page content without mixed window-level UI.
- Preservation: The original decision and implementation history remain recorded in the completed task's change-control section.
- Verification: Renderer type checks, lint, build, and diff validation are rerun after the refactor.

## Tasks

- [x] [Task 001: Keep Content Pure with Sidebar Window Drag](./task001_keep-content-pure-with-sidebar-window-drag.md)
