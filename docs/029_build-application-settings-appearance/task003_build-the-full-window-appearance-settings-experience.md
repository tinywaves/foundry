# Task 003: Build the Full-Window Appearance Settings Experience

## Status

`completed`

## Goal

Expose global Settings from the application sidebar and deliver the full-window Appearance experience that lets users immediately select the persisted Light, Dark, or System application color mode.

## Detail

Add `routePaths.settings` as the canonical `/settings` path and register the Settings page in the existing `FullWindowLayout` route branch. Add a Settings destination to the existing `SideNav.footer` so it remains anchored below the scrollable application destinations. Use the Lucide Settings icon and preserve the existing sidebar sizing, scrolling, and resizable behavior.

The sidebar entry must navigate with a small Settings-owned history-state marker. Keep the marker definition, its runtime validation, the Dashboard fallback path, and the resulting back-navigation decision in a pure renderer module. A Settings page reached with the valid in-application marker returns through history with `navigate(-1)`, preserving the source route and its history state. Missing, null, primitive, or malformed state represents a direct or unrecognized entry and returns to Dashboard with replacement navigation. Because Astryx `SideNavItem` does not expose React Router's `state` prop, preserve link semantics with the existing React Router link integration while intercepting the normal Settings activation to perform the state-bearing navigation.

Extract the platform-aware structure currently owned by `PromptWindowHeader` into a shared renderer `FullWindowHeader`. The shared component retains the existing centered title, macOS traffic-light clearance and draggable title region, Back button, optional actions, and action spacing. Keep `PromptWindowHeader` as a thin Prompt-owned wrapper whose default `Back to Prompts` label and public behavior remain unchanged. The Settings page uses the shared header with the title `Settings`, the Back label `Back`, and no additional actions.

Build the Settings page as one Astryx `Layout` that fills the full-window route. Keep the shared header fixed and place the page body in the layout's independently scrollable `LayoutContent`. Center a single vertical content column with a maximum width of 640 pixels through Astryx sizing props. The header remains full-window width so the established titlebar behavior is not constrained by the content width.

Render only one `Appearance` group. Follow the Astryx settings guidance by using `Section`, rather than a Card, for this page-level group. Do not add introductory or instructional copy. The group contains one `Theme` row and an accessible Astryx `SegmentedControl` with visible `Light`, `Dark`, and `System` options. Read the controlled value from `useApplicationSettings()` and pass validated values to `updateColorMode`; Task 002 remains responsible for applying the mode immediately and persisting it asynchronously. Do not add a Save action, loading state, persistence status, failure notification, or rollback behavior.

Use an Astryx responsive `Grid` for the Theme row. It presents the Theme label and filled segmented control side by side when the constrained content width permits, then reflows them into one column at narrow widths. Use Astryx component props first and StyleX with design tokens only where component props cannot express the required alignment. Keep React component definitions at module scope so route or settings state changes do not remount them.

Add pure renderer tests for the Settings entry state and back-navigation decision, including valid, absent, and malformed state. Extend the pure route assertions for `/settings`. Do not import the rendered router, page, layout, shared header, or StyleX modules into renderer tests, and do not add DOM, component-rendering, screenshot, browser, accessibility-tree, or desktop-automation coverage.

## Findings

None.

## Dependencies

- Task 001 provides the SQLite-backed Settings contract, IPC boundary, and preload API.
- Task 002 provides startup restoration, the renderer Application Settings context, immediate local mode updates, and asynchronous persistence.
- Existing `@astryxdesign/core`, `@stylexjs/stylex`, `lucide-react`, and `react-router` dependencies provide the required UI, styling, icon, and navigation capabilities. No new dependency is required.

## Deliverables

- A canonical `/settings` route under the existing full-window layout and a bottom-anchored Settings sidebar entry.
- A pure Settings navigation-state model with source-aware history return and a Dashboard replacement fallback.
- A shared full-window header with an unchanged Prompt-specific compatibility wrapper.
- A responsive, single-column Settings page containing the Appearance group and controlled Light, Dark, and System Theme selector.
- Focused pure tests for the Settings route constant, entry state, state validation, and back-navigation decision.

## Acceptance Criteria

- [x] Settings is anchored at the bottom of the application sidebar and uses a Lucide Settings icon.
- [x] Activating Settings opens the canonical `/settings` route under `FullWindowLayout`, with the application sidebar absent.
- [x] A Settings entry carrying the valid in-application marker returns through history and preserves the source route state.
- [x] A direct Settings entry or malformed navigation state returns to Dashboard with replacement navigation.
- [x] Settings retains the established full-window title, macOS traffic-light clearance, and draggable title-region behavior without changing Prompt full-window behavior.
- [x] The scrollable Settings body contains only an Appearance group with one Theme setting and no Data, Export, Import, or unfinished placeholder content.
- [x] The Theme control displays Light, Dark, and System together, reflects the current Application Settings value, and forwards only a valid application color mode.
- [x] Selecting a Theme mode applies through the Task 002 Application Settings boundary immediately and does not require a Save action.
- [x] The Theme row presents label and control side by side when space permits and reflows into a non-overlapping single-column layout at narrow widths.
- [x] Renderer behavior tests remain pure and do not import or render React components, route trees, pages, layouts, or StyleX styling.
- [x] Type checking, linting, the full automated test suite, the production build, and static diff inspection pass.

## Out of Scope

- Data settings, Export, Import, or placeholders for future settings groups.
- Settings search, a category sidebar, tab navigation, nested Settings routes, or deep links to individual groups.
- Additional Appearance controls, theme customization, or changes to Astryx and CodeMirror theme resolution.
- Loading UI, persistence progress, database-error messages, retry actions, rollback behavior, or other storage-failure interaction.
- Main-process, database, IPC, preload, or startup-bootstrap changes beyond consuming the completed Task 001 and Task 002 boundaries.
- New dependencies, another styling system, application launch, browser automation, screenshots, accessibility-tree inspection, desktop automation, or renderer component tests.

## Handoff

This is the final task in Plan 029. Its completed output joins the Task 001 persistence boundary and Task 002 theme bootstrap into the user-facing Settings entry and Appearance workflow. After non-visual verification succeeds, the implementation is ready for user-performed visual inspection and final plan completion.

## Verification

- `pnpm typecheck` — Passed.
- `pnpm lint` — Passed with only existing upstream configuration deprecation notices.
- `pnpm test` — Passed 26 test files and 158 tests.
- `pnpm build` — Passed the Node and renderer type checks and the Electron Vite production build.
- `git diff --check` — Passed.
- Static route and navigation inspection — Passed: `/settings` is registered only under the full-window route branch, the SideNav footer supplies the validated entry marker, and Settings Back consumes the pure navigation decision.
- Static renderer inspection — Passed: the Settings UI uses Astryx components and Lucide icons, introduces no raw layout `div` or `span`, standalone CSS, hardcoded color, pixel style, or visible unfinished Data content.
- User-performed visual acceptance was not run by the agent, as required by the repository instructions. The full-window layout, sidebar footer placement, platform titlebar behavior, responsive Theme row, and immediate Light, Dark, and System switching remain ready for user inspection.
