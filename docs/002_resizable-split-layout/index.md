# Build a Resizable Split Layout

## Status

`completed`

## Goal

Build a basic two-column Foundry interface with a resizable, non-collapsible sidebar on the left, a main content area on the right, and appropriate window drag regions for both columns when the macOS title bar is hidden.

## Detail

The application interface will use two columns. The left sidebar will place a window drag region above temporary placeholder content. The right content area will use a drag region of the same height above the existing Markdown example.

The sidebar will have a default width of 260px and can be resized through a separator handle. Its minimum width will be 200px and its maximum width will be 400px. Resizing will stop at either boundary. The sidebar will not be collapsible, and its adjusted width will not be persisted.

The window drag region will be encapsulated in a reusable `WindowDragRegion` component. The component will have a fixed height of 28 logical pixels and fill the width of its owning column. Its outer region will provide Electron window dragging. Optional interactive children will be wrapped in a `fit-content` container that is explicitly marked as a non-drag region so it continues to receive pointer input. Both columns will use drag regions of equal height so the native macOS traffic lights align naturally within the top area.

The sidebar column will clip horizontal overflow at its root so the Astryx resize handle's fractional hit-area geometry cannot produce a horizontal scrollbar in the scrollable `AppShell` side panel. The implementation will otherwise use only the existing Astryx components and StyleX styling system. It will preserve the native macOS traffic lights without reading or synchronizing `trafficLightPosition`, and it will not add IPC or preload APIs. Windows and Linux will retain their current native title bar behavior.

## Scope

- Establish a basic split shell with a left sidebar and a right content area.
- Move the existing Markdown example into the right content area.
- Add temporary placeholder content below the sidebar drag region.
- Create a reusable `WindowDragRegion` component that supports interactive children.
- Add equal-height Electron window drag regions at the top of both columns.
- Support sidebar resizing through pointer and keyboard input.
- Constrain the sidebar to a 200px minimum, a 400px maximum, and a 260px default width.
- Prevent resize-handle overflow from producing a horizontal sidebar scrollbar.
- Use Astryx, StyleX, and the project's existing design tokens for layout and styling.
- Verify type checking, linting, builds, and the primary macOS interactions.

## Out of Scope

- Collapsing or automatically hiding the sidebar.
- Persisting the sidebar width.
- Reading, exposing, or responding to Electron's `trafficLightPosition`.
- Drawing custom window controls or replacing the native macOS traffic lights.
- Changing native title bar behavior on Windows or Linux.
- Adding navigation, routing, or production sidebar content.
- Changing the existing Markdown example content.
- Adding third-party dependencies, IPC channels, or preload APIs.

## Decisions

- The sidebar will be resizable but not collapsible, keeping its behavior simple and predictable.
- The default sidebar width will be 260px, balancing sidebar content space with the main content area's available width.
- The minimum sidebar width will be 200px, leaving enough room for placeholder content and future navigation.
- The maximum sidebar width will be 400px, preventing the sidebar from excessively constraining the main content area.
- Resizing will stop at the minimum and maximum boundaries without triggering another layout state.
- `WindowDragRegion` will use a fixed height of 28 logical pixels so the native macOS traffic lights sit naturally within the region without reading their runtime position.
- The outer `WindowDragRegion` will be draggable. Its optional child wrapper will use `fit-content` sizing and be marked as non-draggable so buttons, links, and other controls receive input.
- The two columns will have separate drag regions of equal height so their content starts at the same vertical position.
- The sidebar root will use `overflowX: 'clip'` to contain the resize handle's fractional overflow without changing its pointer or keyboard behavior.
- The native macOS traffic lights and current hidden-title-bar configuration will remain in place without expanding the main, preload, or IPC boundaries.
- Astryx will provide the page and layout structure. StyleX and design tokens will provide any necessary supplementary styling without introducing another styling system.
- Width adjustment will support both pointer and keyboard input for basic accessibility.

## Tasks

- [x] [Task 001: Build the Titlebar-Aware Split Shell](./task001_build-titlebar-aware-split-shell.md)
- [x] [Task 002: Add Bounded Sidebar Resizing](./task002_add-bounded-sidebar-resizing.md)
