# Task 002: Add Bounded Sidebar Resizing

## Status

`completed`

## Goal

Add bounded, non-collapsible resizing to the existing sidebar while preserving the completed split shell and platform-specific window drag behavior.

## Detail

Update only `src/renderer/src/app.tsx` to enable Astryx's built-in resizing on the existing `SideNav`.

Define a named sidebar resize configuration outside the `App` component with:

- `defaultWidth: 200`
- `minWidth: 200`
- `maxWidth: 400`

Pass this configuration to the existing `SideNav` through its `resizable` prop and explicitly keep `collapsible={false}`. Keep `defaultWidth` and `minWidth` as independent configuration fields, each explicitly set to `200`. Do not provide `autoSaveId`, so the adjusted width remains local to the current renderer lifetime and resets to 200px after a reload. Do not provide `onWidthChange`, because no application-owned resize state or side effect is required.

Use the resize handle rendered internally by `SideNav`. The handle will remain an overlay at the inline-end edge of the sidebar content below the 28-logical-pixel `WindowDragRegion`. The top region will remain dedicated to Electron window dragging and will not become part of the resize handle. As the `SideNav` width changes, the enclosing sidebar column and its top drag region will follow the new width, while the main content area will consume the remaining horizontal space.

Rely on Astryx's existing pointer and keyboard behavior:

- Pointer dragging adjusts the sidebar continuously and clamps it to the configured bounds.
- `ArrowLeft` and `ArrowRight` adjust the width by 10px.
- Holding `Shift` with an arrow key adjusts the width by 50px.
- `Home` moves the sidebar to the 200px minimum.
- `End` moves the sidebar to the 400px maximum.
- The resize handle remains a focusable ARIA separator exposing its current value, minimum, and maximum.

Because `collapsible` remains disabled, pointer and keyboard input cannot reduce the sidebar below 200px or transition it into a collapsed state.

Preserve the existing `AppShell`, stacks, `WindowDragRegion` instances, sidebar placeholder, Markdown example, scrolling behavior, and platform condition. Add one local StyleX style to the sidebar root with `overflowX: 'clip'` so the resize handle's fractional overflow does not propagate to the scrollable `LayoutPanel`. Do not add custom resize state, pointer handlers, IPC channels, preload APIs, dependencies, test infrastructure, or unrelated styling.

## Findings

None.

## Maintenance Adjustments

### 2026-08-03: Contain Resize Handle Overflow

- Change: The sidebar root now uses `overflowX: 'clip'` so fractional resize-handle overflow does not propagate to the scrollable `LayoutPanel`.
- Previous state: The sidebar root allowed visible horizontal overflow, causing the 260px panel to report a 261px scroll width.
- Reason: Astryx's overlay resize handle extends its hit area by half a logical pixel, which the browser rounds into one additional scroll pixel.
- Documentation impact: Updated Plan 002 and Task 002 to include the clipping behavior, deliverable, acceptance statement, and verification.
- Verification: Electron DOM inspection confirmed the panel changed from `clientWidth: 260` and `scrollWidth: 261` to matching 260px values while resizing remained available.

### 2026-08-11 14:08:37: Start Sidebar at Minimum Width

- Change: The sidebar now uses one shared 200px value for both `defaultWidth` and `minWidth`, so every non-persisted renderer load starts at the minimum supported width. The 400px maximum and all resize interactions remain unchanged.
- Previous state: The sidebar started and reset at 260px while allowing users to resize it down to a separate 200px minimum.
- Reason: The user requested that the default sidebar width equal its minimum so the application opens with a more compact navigation region.
- Documentation impact: Updated the Plan 002 Detail, Scope, and Decisions plus the Task 002 Detail, Deliverables, and Acceptance Criteria. Historical implementation verification remains unchanged, while this record identifies the superseding current value. Task status, checklist completion, and order remain unchanged.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Static inspection confirmed that `defaultWidth` and `minWidth` reference the same local 200px constant and `maxWidth` remains 400px. The application was not launched and no automated visual verification was performed under repository policy.

### 2026-08-11 14:13:58: Keep Sidebar Width Fields Independent

- Change: `defaultWidth` and `minWidth` are now independent configuration fields, each explicitly set to `200`; `maxWidth` remains `400`.
- Previous state: Both fields referenced one shared local `200` constant.
- Reason: The user requested separate configuration values even though their current numeric values are equal.
- Documentation impact: Updated Task 002 Detail and Deliverables. Plan 002 remains accurate and unchanged; task status, checklist completion, and order remain unchanged.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Static inspection confirmed separate numeric `defaultWidth: 200` and `minWidth: 200` entries. The application was not launched and no automated visual verification was performed.

## Dependencies

None.

## Deliverables

- A `SideNav` configured with independent default and minimum fields both set to 200px, plus a 400px maximum.
- Pointer-accessible bounded sidebar resizing through Astryx's built-in resize handle.
- Keyboard-accessible bounded resizing through the focusable separator.
- Preserved non-collapsible and non-persistent sidebar behavior.
- No horizontal sidebar scrollbar caused by the resize handle's fractional overflow.
- Preserved split-shell, window-drag, Markdown, and platform behavior from Task 001.

## Acceptance Criteria

- [x] The sidebar starts at the 200px minimum when the renderer is loaded.
- [x] Pointer dragging resizes the sidebar continuously and stops at 200px and 400px.
- [x] Dragging toward a width below 200px does not collapse or hide the sidebar.
- [x] The resize handle is keyboard-focusable and exposes separator semantics with current, minimum, and maximum width values.
- [x] `ArrowLeft` and `ArrowRight` resize the sidebar in 10px steps without crossing its bounds.
- [x] `Shift` plus an arrow key resizes the sidebar in 50px steps without crossing its bounds.
- [x] `Home` resizes the sidebar to 200px and `End` resizes it to 400px.
- [x] Reloading the renderer restores the sidebar to the 200px minimum instead of persisting the previous width.
- [x] The sidebar's top drag region follows the resized column width, while the main content area uses the remaining width.
- [x] The resize handle remains below the macOS window drag region, and the top region continues to drag the Electron window.
- [x] The sidebar does not display a horizontal scrollbar at the default, minimum, or maximum width.
- [x] The existing Markdown content, scrolling behavior, macOS traffic lights, and Windows/Linux native title bar behavior remain unchanged.
- [x] Type checking, renderer-source linting, the production build, and manual resize interaction checks pass.

## Out of Scope

- Collapsing, hiding, or automatically minimizing the sidebar.
- Persisting or restoring a user-selected sidebar width.
- Application-owned resize state, callbacks, analytics, or side effects.
- Extending the resize handle through the 28-logical-pixel window drag region.
- Changing the `WindowDragRegion` component or title bar behavior.
- Changing the sidebar placeholder or Markdown example.
- Adding navigation, routing, production sidebar content, or responsive drawer behavior.
- Main-process, preload, IPC, security, packaging, dependency, or unrelated styling changes.
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
  - Confirmed both top drag regions keep equal heights and follow their column widths at the default, minimum, and maximum sidebar sizes.
  - Confirmed the Markdown example remains rendered and reload resets the width to 260px.
- Passed in an Electron renderer through the Chrome DevTools Protocol:
  - Confirmed the drag regions use a 28px height.
  - Confirmed the sidebar `LayoutPanel` reports equal `clientWidth` and `scrollWidth` values of 260px after applying horizontal clipping.
- Passed by inspection: the macOS-only condition and the unchanged `WindowDragRegion` preserve the Task 001 title-bar behavior; Windows and Linux continue to omit the custom drag regions.
- Expected repository-level blockers remain:
  - `pnpm typecheck` and `pnpm build` invoke npm scripts, which fail because npm rejects the repository's pnpm `devEngines.packageManager` requirement.
  - `pnpm lint` scans generated `out/` files and fails on the existing typed-lint configuration; renderer-source lint passes.
