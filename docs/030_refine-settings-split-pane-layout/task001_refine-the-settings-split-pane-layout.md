# Task 001: Refine the Settings Split-Pane Layout

## Status

`completed`

## Goal

Replace the single-column Settings body with an untitled, fixed split-pane experience while preserving all navigation, theme-selection, and persistence behavior delivered by Plan 029.

## Detail

Keep the shared `FullWindowHeader` title required for its existing Prompt consumers. Settings does not render that shared header. Instead, both sides of its full-window split-pane frame begin with an independent `WindowDragRegion`, preserving draggable behavior while leaving enough untitled space for the macOS traffic lights. Render the source-aware Back action below the drag region inside the left sidebar. Existing Prompt callers continue to provide titles through `PromptWindowHeader`, so their visible titles, accessible headings, actions, and default `Back to Prompts` behavior remain unchanged.

Keep Settings free of visible page titles. Retain `Appearance` as a `VisuallyHidden` accessibility-level-one heading so assistive technology receives the page context without adding visual chrome.

Use the Settings page's existing full-height Astryx `Layout` to create the split-pane frame. Add a `LayoutPanel` in the start slot with an explicit width of 260 pixels, a vertical divider, Settings-navigation landmark semantics, and zero outer padding. Keep this panel present at every window width. Do not add `useMediaQuery`, TabList, drawer, hiding, collapsing, or resizable behavior.

Below the sidebar drag region, render a ghost Back button and one Astryx `List`. Give the navigation and list an accessible Settings-sections name without introducing visible Settings text. The list contains only a non-navigating `Appearance` item in the selected state. Do not add placeholder groups or state that implies an unavailable destination.

Keep the active Appearance content in a scrollable right pane below its drag region. Center one width-constrained responsive `Grid` directly on the pane background, without a Card or another visible container. The Grid contains only the `Theme` label and controlled Light, Dark, and System `SegmentedControl`, using a wider column gap while preserving narrow-width row reflow. Retain the validated update path through `useApplicationSettings()` so only supported modes reach the immediate update and persistence boundary.

Do not add a top header divider, visible Settings heading, search field, explanatory text, TabList, sample form, Save action, Data content, or any other element from the supplied reference. No route, navigation-state, main-process, preload, database, or persistence contract changes are needed.

Because this task changes renderer composition only, do not add component-rendering or visual automation tests. Run the existing pure test suite and use type checking, linting, production build output, static integration inspection, and user-performed visual acceptance for verification.

## Findings

None.

## Dependencies

- Plan 029 provides the completed `/settings` full-window route, source-aware Back behavior, Application Settings context, immediate theme application, and SQLite persistence.
- Existing `@astryxdesign/core`, `@stylexjs/stylex`, `lucide-react`, and `react-router` dependencies provide all required layout and interaction capabilities. No new dependency is required.

## Deliverables

- A Settings-specific split-pane frame with independent drag regions and a sidebar-contained Back action, without changing titled Prompt consumers.
- A fixed 260-pixel Settings navigation panel with a vertical divider and only the selected Appearance destination.
- A centered, unframed right content row containing only the Theme label and control, with Appearance retained as a visually hidden page heading.
- Non-visual regression evidence for the unchanged Back navigation, Prompt header, color-mode update, and persistence integrations.

## Acceptance Criteria

- [x] Settings contains no visible `Settings` title, both panes retain an empty drag region, and the Back action is present inside the sidebar.
- [x] macOS traffic-light clearance and draggable title-region behavior are preserved without a shared Settings header.
- [x] Prompt and other titled full-window consumers retain their existing visible titles, accessible headings, actions, and Back behavior.
- [x] The Settings body uses a persistent 260-pixel left navigation panel and the remaining width as the Appearance content pane.
- [x] The Settings navigation panel has a vertical divider, remains visible at every window width, and does not switch to tabs, a drawer, or a collapsed state.
- [x] The navigation panel contains only a selected, non-navigating Appearance item and has an accessible Settings-sections name without visible Settings text.
- [x] The right pane centers one constrained responsive Grid containing only the visible Theme label and Light, Dark, and System segmented control, without a Card or outer border.
- [x] Appearance remains the Settings page's accessible level-one heading without being visually rendered.
- [x] The Theme row continues to reflow within the remaining right-pane width and forwards only valid modes through the existing immediate update and persistence boundary.
- [x] No top header divider, search field, visible Settings heading, explanatory text, TabList, sample form, Save action, Data content, or placeholder is introduced.
- [x] Type checking, linting, the full automated test suite, the production build, and static diff inspection pass.

## Out of Scope

- Data settings, Export, Import, or placeholders for future settings groups.
- Settings search, visible Settings page headings, explanatory content, or sample reference-template settings.
- Responsive tabs, sidebar hiding, sidebar collapsing, drawers, resizing, or another narrow-window navigation mode.
- Settings group deep links, new routes, or additional navigation state.
- Window minimum-width changes or guarantees for widths that cannot accommodate the fixed panel and the Theme control.
- Main-process, preload, database, IPC, startup-bootstrap, color-mode behavior, or persistence changes.
- New dependencies, application launch, browser automation, agent-captured screenshots, accessibility-tree inspection, desktop automation, or renderer component tests.

## Handoff

The completed task supersedes only Plan 029's single-column Settings presentation. It leaves the Settings route, Back behavior, Appearance preference semantics, and persistence boundary intact while establishing the fixed split-pane frame for future Settings groups. The current frame uses a divided sidebar with its own Back action and a centered, unframed Theme row in the right pane.

## Verification

- `pnpm typecheck` — Passed.
- `pnpm lint` — Passed with only existing upstream configuration deprecation notices.
- `pnpm test` — Passed 26 test files and 158 tests.
- `pnpm build` — Passed the Node and renderer type checks and the Electron Vite production build.
- `git diff --check` — Passed.
- Static header inspection — Passed: Settings does not render the shared full-window header, both panes retain a platform-aware drag region, and Back is inside the sidebar.
- Static Settings-frame inspection — Passed: the 260-pixel `LayoutPanel` has a vertical divider, no responsive alternative, and contains only Back plus the selected Appearance item with an accessible non-visible list name.
- Static content inspection — Passed: the centered right pane contains no visible Appearance heading, Card, or outer border; it retains the visually hidden level-one heading, responsive Theme Grid, valid color-mode updates, and introduces no raw layout `div` or `span`, standalone CSS, or hardcoded color.
- Static Prompt inspection — Passed: every existing Prompt consumer still provides a required title through the Prompt-specific full-window-header wrapper.
- User-performed visual acceptance — Pending for the current unframed layout. No agent-run visual automation was performed.

## Maintenance Adjustments

### 2026-08-17 21:11:32: Align Settings With the Full-Height Sidebar Reference

- Change: Replaced the shared full-width Settings header composition with independent drag regions in both panes, moved Back into the fixed sidebar, enabled the sidebar divider, and centered the Appearance content in a settings Card.
- Previous state: Settings used a shared full-width Back header with an omitted title, the 260-pixel sidebar had no divider, and the right pane used a leading-aligned transparent Section without a Card.
- Reason: The revised reference and user feedback required the sidebar to own the full window height and navigation controls while the content pane used a clearly bounded settings surface.
- Documentation impact: Updated the current-state Detail, Scope, Decisions, Deliverables, Acceptance Criteria, Out of Scope, Handoff, and Verification statements in Plan 030 and Task 001 while preserving their completed status and task order.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `git diff --check`, static integration inspection, and the user-provided post-implementation screenshot all support the adjusted layout.

### 2026-08-17 21:18:08: Flatten the Appearance Content Pane

- Change: Removed the visible Appearance heading and Theme Card, retained Appearance as a visually hidden level-one heading, and placed the Theme label and segmented control directly in a centered responsive Grid with wider column spacing.
- Previous state: The right pane displayed a visible Appearance heading above a bordered settings Card containing the Theme row.
- Reason: User feedback requested a quieter, flatter settings surface without the section title or outer border.
- Documentation impact: Updated the current-state Detail, Scope, Decisions, Deliverables, Acceptance Criteria, Handoff, and Verification statements in Plan 030 and Task 001 while preserving the earlier maintenance record, completed status, and task order.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `git diff --check`, and static integration inspection passed; user-performed visual acceptance remains pending for the unframed layout.
