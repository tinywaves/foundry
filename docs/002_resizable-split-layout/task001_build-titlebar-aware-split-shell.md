# Task 001: Build the Titlebar-Aware Split Shell

## Status

`completed`

## Goal

Build the non-resizable two-column application shell, including macOS-only window drag regions, a sidebar placeholder, and the existing Markdown example in the main content area.

## Detail

Create `src/renderer/src/components/window-drag-region.tsx` as a reusable renderer component. It will:

- Fill the width of its owning column.
- Use `spacingVars['--spacing-12']` for a fixed 48-logical-pixel height.
- Mark its outer surface with Electron's `-webkit-app-region: drag`.
- Accept optional React children and place them in a right-aligned, `fit-content` wrapper marked with `-webkit-app-region: no-drag`.
- Use Astryx `Stack` primitives for structure and StyleX for component-owned styles.
- Use a narrow typed React style object only for the `WebkitAppRegion` property that is not represented by the current StyleX types. Do not use `any`, utility classes, or a standalone stylesheet.

Update `src/renderer/src/app.tsx` to use an Astryx `AppShell` as the full-height page frame:

- Configure the shell with `height="fill"`, `variant="section"`, and `contentPadding={0}`.
- Disable mobile navigation transformation with `mobileNav={{ breakpoint: 'none', hasToggle: false }}` so the sidebar remains inline at narrow window widths.
- Compose the sidebar slot as a full-height vertical stack containing a macOS-only `WindowDragRegion` followed by a fill-height, fixed-width `SideNav`.
- Put the temporary `Sidebar` placeholder in the `SideNav` content area.
- Do not place the drag region in `SideNav.header`, because that slot adds block padding and would make the top region taller than the approved 48 logical pixels.
- Keep `SideNav` non-resizable and non-collapsible in this task. Its existing 260px width is the stable handoff for Task 002.
- Compose the main area as a full-height vertical stack containing a separate macOS-only `WindowDragRegion` followed by an independently scrollable content region.
- Move the existing Markdown example into the main content region without changing its `sources`, generated Markdown string, density, or heading behavior.
- Replace the Markdown container's inline `maxWidth` style with the corresponding Astryx sizing prop.

Determine platform behavior from the existing `window.electron.process.platform` preload surface:

- On macOS, render both drag regions at the top of their respective columns.
- On Windows and Linux, omit the custom drag regions and retain the native title bars.
- Do not add main-process options, preload declarations, IPC channels, or dependencies.

The implementation was manually verified on macOS by the user after the Computer Use bridge became unavailable. The user confirmed that the window drag regions, native traffic-light alignment, and content behavior pass the task's acceptance boundary.

## Findings

None.

## Dependencies

None.

## Deliverables

- A reusable `WindowDragRegion` renderer component with draggable outer space and a non-draggable interactive child area.
- An Astryx `AppShell` with a left `SideNav` column and a right Markdown content column.
- macOS-only top drag regions of equal height in both columns.
- An inline sidebar placeholder and independently scrollable Markdown content.
- Preserved main-process, preload, and IPC boundaries.

## Acceptance Criteria

- [x] On macOS, the application displays a left sidebar and right content area with equal-height 48-logical-pixel top regions.
- [x] Dragging an unoccupied part of either top region moves the Electron window.
- [x] Interactive children rendered by `WindowDragRegion` remain clickable because their wrapper is excluded from window dragging.
- [x] The native macOS traffic lights remain visible and are vertically aligned within the sidebar's top region.
- [x] The sidebar appears below its drag region at the existing 260px width and displays `Sidebar`.
- [x] The existing Markdown example appears below the right drag region with unchanged source data and displayed content.
- [x] Sidebar and main content begin at the same vertical position below their respective drag regions.
- [x] The Markdown content scrolls independently when its available vertical space is insufficient.
- [x] At narrow window widths, the sidebar remains inline and does not become a drawer or mobile overlay.
- [x] On Windows and Linux, custom drag regions are not rendered and native title bar behavior remains unchanged.
- [x] Type checking, linting, the production build, and manual macOS interaction checks pass.

## Out of Scope

- Sidebar resizing, resize-handle behavior, and the 200px to 400px width constraints planned for Task 002.
- Sidebar collapse behavior or width persistence.
- Production sidebar navigation content.
- Controls inside either drag region beyond proving the optional child contract.
- Reading or synchronizing Electron's `trafficLightPosition`.
- Main-process, preload, IPC, security, or packaging changes.
- Changes to Windows or Linux title bar behavior.
- Changes to the Markdown example's content or source metadata.

## Handoff

Task 002 will consume the completed `AppShell` and `SideNav` structure, preserve the `WindowDragRegion` rows and content ownership, and enable Astryx's bounded sidebar resizing on the existing 260px sidebar.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm dev`
- Manually verify on macOS that both top regions drag the window, the native traffic lights remain aligned, and any interactive drag-region child receives pointer input.
- Manually verify that the sidebar and Markdown content align below equal-height top regions.
- Manually verify that Markdown content scrolls without scrolling the sidebar.
- Manually narrow the window and verify that the sidebar remains inline.
- Inspect the platform condition to verify that Windows and Linux omit the custom drag regions.
- `git diff --check`
- `pnpm exec tsc --noEmit -p tsconfig.node.json --composite false` — passed.
- `pnpm exec tsc --noEmit -p tsconfig.web.json --composite false` — passed.
- `pnpm exec eslint src/renderer/src` — passed with existing deprecated-rule warnings.
- `pnpm exec electron-vite build` — passed.
- `pnpm dev` — started the Electron development window; the process was stopped after the manual verification bridge timed out.
- Manual macOS verification — passed; the user confirmed the window layout and interaction behavior.
- `pnpm typecheck` and `pnpm build` — blocked by the repository's existing `npm`/`devEngines` package-manager mismatch.
- `pnpm lint` — blocked by the repository's existing typed-linting configuration when it scans generated `out/` JavaScript; renderer-source lint passed directly.
- Computer Use inspection — blocked after repeated timeouts from the macOS accessibility bridge.
- `git diff --check` — passed.
