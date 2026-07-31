# Task 002: Add Bounded Sidebar Resizing

## Status

`completed`

## Goal

Add bounded, non-collapsible resizing to the existing sidebar while preserving the completed split shell and platform-specific window drag behavior.

## Detail

Update only `src/renderer/src/app.tsx` to enable Astryx's built-in resizing on the existing `SideNav`.

Define a named sidebar resize configuration outside the `App` component with:

- `defaultWidth: 260`
- `minWidth: 200`
- `maxWidth: 400`

Pass this configuration to the existing `SideNav` through its `resizable` prop and explicitly keep `collapsible={false}`. Do not provide `autoSaveId`, so the adjusted width remains local to the current renderer lifetime and resets to 260px after a reload. Do not provide `onWidthChange`, because no application-owned resize state or side effect is required.

Use the resize handle rendered internally by `SideNav`. The handle will remain an overlay at the inline-end edge of the sidebar content below the 48-logical-pixel `WindowDragRegion`. The top region will remain dedicated to Electron window dragging and will not become part of the resize handle. As the `SideNav` width changes, the enclosing sidebar column and its top drag region will follow the new width, while the main content area will consume the remaining horizontal space.

Rely on Astryx's existing pointer and keyboard behavior:

- Pointer dragging adjusts the sidebar continuously and clamps it to the configured bounds.
- `ArrowLeft` and `ArrowRight` adjust the width by 10px.
- Holding `Shift` with an arrow key adjusts the width by 50px.
- `Home` moves the sidebar to the 200px minimum.
- `End` moves the sidebar to the 400px maximum.
- The resize handle remains a focusable ARIA separator exposing its current value, minimum, and maximum.

Because `collapsible` remains disabled, pointer and keyboard input cannot reduce the sidebar below 200px or transition it into a collapsed state.

Preserve the existing `AppShell`, stacks, `WindowDragRegion` instances, sidebar placeholder, Markdown example, scrolling behavior, and platform condition. Do not add custom resize state, pointer handlers, StyleX styles, IPC channels, preload APIs, dependencies, or test infrastructure.

## Findings

None.

## Dependencies

None.

## Deliverables

- A `SideNav` configured with a 260px default width, 200px minimum, and 400px maximum.
- Pointer-accessible bounded sidebar resizing through Astryx's built-in resize handle.
- Keyboard-accessible bounded resizing through the focusable separator.
- Preserved non-collapsible and non-persistent sidebar behavior.
- Preserved split-shell, window-drag, Markdown, and platform behavior from Task 001.

## Acceptance Criteria

- [x] The sidebar starts at 260px when the renderer is loaded.
- [x] Pointer dragging resizes the sidebar continuously and stops at 200px and 400px.
- [x] Dragging toward a width below 200px does not collapse or hide the sidebar.
- [x] The resize handle is keyboard-focusable and exposes separator semantics with current, minimum, and maximum width values.
- [x] `ArrowLeft` and `ArrowRight` resize the sidebar in 10px steps without crossing its bounds.
- [x] `Shift` plus an arrow key resizes the sidebar in 50px steps without crossing its bounds.
- [x] `Home` resizes the sidebar to 200px and `End` resizes it to 400px.
- [x] Reloading the renderer restores the sidebar to 260px instead of persisting the previous width.
- [x] The sidebar's top drag region follows the resized column width, while the main content area uses the remaining width.
- [x] The resize handle remains below the macOS window drag region, and the top region continues to drag the Electron window.
- [x] The existing Markdown content, scrolling behavior, macOS traffic lights, and Windows/Linux native title bar behavior remain unchanged.
- [x] Type checking, renderer-source linting, the production build, and manual resize interaction checks pass.

## Out of Scope

- Collapsing, hiding, or automatically minimizing the sidebar.
- Persisting or restoring a user-selected sidebar width.
- Application-owned resize state, callbacks, analytics, or side effects.
- Extending the resize handle through the 48-logical-pixel window drag region.
- Changing the `WindowDragRegion` component or title bar behavior.
- Changing the sidebar placeholder or Markdown example.
- Adding navigation, routing, production sidebar content, or responsive drawer behavior.
- Main-process, preload, IPC, security, packaging, dependency, or styling changes.
- Adding a new automated test framework.

## Handoff

Completing this task will finish Plan 002 and leave a stable resizable split shell for future plans that add production sidebar content or navigation.

## Verification

- Passed: `pnpm exec tsc --noEmit -p tsconfig.node.json --composite false`
- Passed: `pnpm exec tsc --noEmit -p tsconfig.web.json --composite false`
- Passed: `pnpm exec eslint src/renderer/src`
- Passed: `pnpm exec electron-vite build`
- Passed: `git diff --check`
- Passed: `git diff --cached --check`
- Passed in a built Electron window through the Chrome DevTools Protocol:
  - Confirmed the initial sidebar width is 260px.
  - Confirmed the separator is focusable and exposes `role="separator"`, vertical orientation, and `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` values of 260, 200, and 400.
  - Confirmed `ArrowRight` changes the width by 10px and Shift-plus-ArrowRight changes it by 50px.
  - Confirmed `Home` reaches 200px, `End` reaches 400px, and further arrow input remains clamped at both bounds.
  - Confirmed pointer dragging reaches both bounds without collapsing the sidebar.
  - Confirmed both top drag regions keep a 48px height, with widths of 260px/640px at the default, 200px/700px at the minimum, and 400px/500px at the maximum.
  - Confirmed the Markdown example remains rendered and reload resets the width to 260px.
- Passed by inspection: the macOS-only condition and the unchanged `WindowDragRegion` preserve the Task 001 title-bar behavior; Windows and Linux continue to omit the custom drag regions.
- Expected repository-level blockers remain:
  - `pnpm typecheck` and `pnpm build` invoke npm scripts, which fail because npm rejects the repository's pnpm `devEngines.packageManager` requirement.
  - `pnpm lint` scans generated `out/` files and fails on the existing typed-lint configuration; renderer-source lint passes.
