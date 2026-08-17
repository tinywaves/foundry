# Task 001: Rebuild the Settings Experience with Astryx Navigation

## Status

`completed`

## Goal

Rebuild the current Settings page with Astryx-native sidebar navigation and grouped content, provide page-local Appearance and Data sections, and replace the Theme segmented control with three selectable cards while preserving the existing navigation and color-mode persistence behavior.

## Detail

Keep the implementation focused on `src/renderer/src/pages/settings-page.tsx`. Preserve the canonical `/settings` route, `getSettingsBackNavigation`, the source-aware history return, the direct-entry Dashboard fallback, the Application Settings context, immediate color-mode updates, System mode behavior, and asynchronous persistence.

Represent the active Settings section with a narrow local union containing `appearance` and `data`. Initialize the mounted page to `appearance`. Switching sections will update only page-local renderer state; it will not modify the URL, React Router navigation state, an application context, local storage, or the database. Leaving and remounting Settings will therefore return to Appearance.

Use the same Astryx `AppShell` and `SideNav` composition as the standard application layout instead of retaining a separate Settings `LayoutPanel`. Extract and share the standard sidebar's resizable configuration so both layouts use the same `200`-pixel default and minimum width, `400`-pixel maximum width, and `foundry-app-side-nav` persisted-width key. Reuse the shared application-sidebar StyleX rule that clips horizontal overflow. Replace the current `List` and `ListItem` composition with a non-collapsible Astryx `SideNav`. Render a small Astryx ghost `Button` in the same header slot used by the Foundry brand, label it `Back to app`, apply the Astryx normal-font-weight token, constrain its width to `fit-content`, and pair it with the existing source-aware Back action and Lucide `ArrowLeft` icon. Render Appearance and Data as peer `SideNavItem` components using Lucide `SunMoon` and `Database` icons, wrapped in the same one-step `VStack` gap used by standard-sidebar item groups. Bind each item's `isSelected` state to the local section value and switch the active content through `onClick`. Let Astryx own button and destination interaction states while the explicit normal-weight token keeps the Back label unbolded.

Retain the right pane's independent platform-aware `WindowDragRegion`. Replace the vertically centered sparse composition with a scrollable, top-aligned content region constrained to a readable width through Astryx layout props and spacing tokens. Keep eight spacing steps of inline padding and use six spacing steps of block padding so the heading sits slightly closer to the drag region. Render the active section name, Appearance or Data, as a visible accessibility-level-one heading.

Compose Appearance with an unframed Astryx `Section` and `Divider`. Render the Theme choices in an Astryx responsive `Grid` that displays at most three columns when space permits and automatically wraps when the available width becomes narrower. Do not add custom media queries or standalone CSS.

Replace `SegmentedControl` and `SegmentedControlItem` with three controlled Astryx `SelectableCard` options. Light uses Lucide `Sun` with concise light-appearance copy, Dark uses Lucide `Moon` with concise dark-appearance copy, and System uses Lucide `Monitor` with copy explaining that it follows the operating-system appearance. Each card receives an accessible label and derives `isSelected` directly from the existing `colorMode`. Handle `onChange` only when the card requests selection so clicking the already selected card cannot leave the application without a selected color mode. Reuse `applicationColorModes`, `ApplicationColorMode`, and the existing `updateColorMode` boundary rather than duplicating theme values or persistence logic. Do not add Save, loading, retry, rollback, or storage-error UI.

Compose Data with the same top-level content width and spacing conventions. Render Data as the visible accessibility-level-one heading and display only the exact placeholder text `Hello world`. Do not add fictitious controls, disabled actions, explanatory banners, or future-feature promises.

Remove imports and composition that become obsolete, including the current Settings `List`, `ListItem`, `SegmentedControl`, `SegmentedControlItem`, and visually hidden page heading. Continue using Astryx components, StyleX only where component props cannot express an existing layout constraint, design tokens for custom styling, and Lucide icons for application-authored iconography. Introduce no raw layout `div` or `span`, standalone CSS, hardcoded color, hand-authored SVG, new dependency, route change, IPC change, preload change, main-process change, or database change.

Renderer component tests remain prohibited by repository policy. The section switch is intentionally local UI behavior without a new persistence or routing contract, so do not introduce a speculative pure model solely to test a two-value component state. Preserve the existing Settings navigation and Application Settings pure tests and verify the revised component through TypeScript, ESLint, the complete automated suite, production compilation, static integration inspection, and user-performed visual acceptance.

## Findings

None.

## Dependencies

- The existing Application Settings context provides the controlled `colorMode` value and immediate `updateColorMode` operation.
- The existing Settings navigation model provides source-aware history return and the Dashboard fallback.
- The completed `FullWindowLayout` maintenance provides the shared Astryx surface background.
- Existing `@astryxdesign/core`, `lucide-react`, React, React Router, and StyleX dependencies provide all required implementation capabilities. No new dependency is required.

## Deliverables

- A Settings frame using the same Astryx `AppShell` and `SideNav` composition as the standard application layout.
- A shared application-sidebar resizable configuration consumed by both sidebars, including the `200`-pixel default and minimum width, `400`-pixel maximum width, and persisted-width key.
- A small, normal-weight Astryx ghost `Button` labeled `Back to app` with `fit-content` width in the standard brand-header position.
- One-step spacing between the Appearance and Data navigation items.
- Page-local Appearance/Data selection that defaults to Appearance on every Settings mount.
- A visible content heading that reflects the active Settings section.
- A top-aligned, width-constrained Settings content composition with reduced six-step block padding.
- An unframed Appearance `Section` and `Divider` composition.
- Three responsive Theme `SelectableCard` options with Lucide icons and concise descriptions.
- A Data section containing the exact placeholder text `Hello world`.
- Removal of the current Settings `List`, segmented Theme control, vertically centered sparse layout, and visually hidden page heading.
- Preserved Back navigation, immediate theme switching, System mode, persistence, route ownership, and platform-aware window behavior.

## Acceptance Criteria

- [x] `/settings` remains the only Settings route and retains its current full-window ownership.
- [x] Settings defaults to Appearance whenever the page mounts.
- [x] Selecting Appearance or Data updates the active content without changing the URL or navigation state.
- [x] Leaving and reopening Settings resets the active section to Appearance rather than restoring Data.
- [x] The sidebar does not display a Settings heading.
- [x] Settings uses the same Astryx `AppShell`, `SideNav`, shared resize range, and persisted width as the standard application sidebar.
- [x] A small Astryx ghost `Button` labeled `Back to app` occupies the standard sidebar's brand-header position, uses the Astryx normal-font-weight token, and sizes to its content rather than filling the header width.
- [x] Appearance and Data render as Astryx `SideNavItem` destinations whose typography, icon treatment, interaction states, and selected state are owned by Astryx.
- [x] The right pane displays Appearance or Data as the visible accessibility-level-one heading for the active section.
- [x] Settings content is aligned near the top of the right pane and no longer vertically centered in the full canvas.
- [x] Appearance uses an unframed Astryx `Section` and `Divider` rather than an outer Card.
- [x] Light, Dark, and System are simultaneously discoverable as Astryx `SelectableCard` options and wrap responsively when space becomes constrained.
- [x] Light uses `Sun`, Dark uses `Moon`, and System uses `Monitor`, with concise explanatory copy for each option.
- [x] Exactly one Theme card is selected for every valid application color mode.
- [x] Clicking the already selected Theme card does not clear the selected color mode.
- [x] Selecting a different Theme card continues to update the full application immediately and persist through the existing Application Settings boundary without a Save action.
- [x] Data displays only its visible heading and the exact placeholder text `Hello world`.
- [x] Existing source-aware Back navigation, direct-entry Dashboard fallback, and platform-aware drag-region behavior remain unchanged.
- [x] No nested Settings route, persisted section state, dependency, IPC, preload, main-process, or database change is introduced.
- [x] The implementation introduces no raw layout `div` or `span`, standalone CSS, hardcoded color, or hand-authored SVG.
- [x] Type checking, linting, the complete automated test suite, production build, and static diff inspection pass.

## Out of Scope

- Functional Data settings, including import, export, cleanup, backup, or database administration.
- `/settings/appearance`, `/settings/data`, other Settings deep links, or persisted section selection.
- Settings search, additional destinations, responsive drawers, sidebar hiding, collapsing, or an independent Settings resize configuration.
- Custom Theme preview artwork, screenshots, or illustrations.
- Color-mode persistence refactoring, storage-failure feedback, retry behavior, rollback behavior, or startup-loading changes.
- Renderer component tests, DOM assertions, visual snapshots, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Completing Task 001 completes Plan 031. The resulting Settings frame will provide an Astryx-owned sidebar navigation baseline, a functional Appearance section, and a deliberately non-functional Data placeholder that future independently reviewed work can replace without changing the current route or navigation contract.

## Verification

- `pnpm typecheck` — Passed for the node and renderer TypeScript projects.
- `pnpm lint` — Passed with only the repository configuration's existing stylistic deprecation warnings.
- `pnpm test` — Passed 26 test files and 158 tests.
- `pnpm build` — Passed the node and renderer type checks and the Electron Vite production build.
- `git diff --check` — Passed.
- Static Astryx inspection — Passed: Settings uses the same `AppShell`, `SideNav`, and shared resizable configuration as the standard application layout; the configuration shares the `200`-pixel default and minimum width, `400`-pixel maximum width, and persisted-width key; the Foundry brand region is replaced by a small ghost `Button` labeled `Back to app` with `fit-content` width, the Astryx normal-font-weight token, and Lucide `ArrowLeft` icon; Settings also uses `SideNavItem`, `Section`, `Divider`, `Grid`, and `SelectableCard`; destinations use a one-step gap; no raw layout `div` or `span`, standalone CSS, hardcoded color, hand-authored SVG, obsolete segmented control, obsolete Settings list, independent `LayoutPanel`, manual navigation-width override, or `SideNavHeading` Back treatment remains.
- Static behavior inspection — Passed: Appearance is the local default, Appearance/Data clicks do not navigate, Theme cards reuse `applicationColorModes`, selected-card deselection is ignored, Back uses the existing navigation decision, and Data displays the exact `Hello world` placeholder.
- Static boundary inspection — Passed: `/settings` route ownership, Application Settings persistence, platform drag regions, renderer/preload/main-process boundaries, and dependency declarations remain unchanged.
- User-performed visual acceptance remains pending. No application launch, browser automation, screenshot, accessibility-tree inspection, or desktop automation was performed, per repository rules.

## Maintenance Adjustments

### 2026-08-17 23:58:45: Align Settings Sidebar Density and Spacing

- Change: Extracted a shared `200`-pixel application-sidebar default width and horizontal-overflow clipping style, applied both to the standard and Settings sidebars, wrapped Appearance and Data in the standard one-step navigation-item gap, and reduced the Settings content block padding from eight to six spacing steps while retaining eight-step inline padding.
- Previous state: Settings used a fixed `260`-pixel panel, did not reuse the standard sidebar's `overflowX: clip` safeguard, rendered its two destinations without the standard item gap, and used eight spacing steps of padding on every content edge.
- Reason: User visual acceptance found a recurring horizontal scrollbar, denser navigation items than the standard sidebar, a width mismatch with the main application sidebar, and excessive space above the active content heading.
- Documentation impact: Updated the Plan 031 index and Task 001 current-state statements while preserving the completed status, checklist order, and original Settings-navigation outcome.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (26 files and 158 tests), `pnpm build`, and `git diff --check` passed; static inspection confirmed the shared width and overflow rule, one-step navigation gap, and six-step content block padding. No application launch or visual automation was performed.

### 2026-08-17 23:59:30: Make Settings SideNav Fill Its Panel

- Change: Added a shared `width: 100%` navigation style and applied it to the Settings `SideNav`, making the navigation itself fill the `200`-pixel `LayoutPanel` rather than retaining Astryx's intrinsic `260`-pixel width.
- Previous state: The outer Settings panel used the shared `200`-pixel width and clipped horizontal overflow, but the nested `SideNav` still laid itself out at `260` pixels; the extra width was hidden and the selected item's trailing rounded edge appeared cut off.
- Reason: User visual acceptance showed that the apparent width mismatch and clipped navigation item remained after the earlier outer-panel adjustment.
- Documentation impact: Corrected the Plan 031 index and Task 001 current-state explanation while preserving the completed status, checklist order, and earlier maintenance history.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (26 files and 158 tests), `pnpm build`, and `git diff --check` passed; source inspection confirmed the Settings navigation receives the shared fill style while the standard sidebar remains controlled by its existing resizable width configuration. No application launch or visual automation was performed.

### 2026-08-17 23:59:59: Mirror the Standard Application Sidebar Frame

- Change: Replaced the Settings-specific `LayoutPanel`, fixed-width `SideNav`, top-content Back button, and manual navigation-width styles with the same Astryx `AppShell`, resizable `SideNav`, and header structure used by the standard application layout. Extracted the standard sidebar's resize configuration so both pages share its `200`-pixel default and minimum width, `400`-pixel maximum width, and `foundry-app-side-nav` persisted-width key. Replaced only the standard Foundry brand content with a `SideNavHeading` Back action.
- Previous state: Settings used a separate fixed `200`-pixel panel while the standard sidebar could restore a persisted width up to `400` pixels. Manual fill and trailing-gutter overrides attempted to compensate for the structural mismatch, but Settings still did not match the visible standard-sidebar width and selected items could appear clipped.
- Reason: User visual acceptance confirmed that matching isolated dimensions was insufficient and requested the Settings sidebar to use the standard application's implementation exactly, with only the Foundry brand region replaced by Back.
- Documentation impact: Updated Plan 031 and Task 001 current-state detail, scope, decisions, deliverables, acceptance criteria, out-of-scope boundaries, and verification statements. The earlier maintenance entries remain as historical records but are superseded by the shared-frame implementation.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (26 files and 158 tests), `pnpm build`, and `git diff --check` passed; static inspection confirmed that both layouts consume the same `applicationSidebarResizeConfig` and that Settings now uses `AppShell`, `SideNav`, and `SideNavHeading`. No application launch or visual automation was performed.

### 2026-08-17: Replace the Back Heading with a Small Button

- Change: Replaced the Settings `SideNavHeading` Back treatment with an Astryx ghost `Button`, changed its label to `Back to app`, set `size="sm"`, retained the Lucide `ArrowLeft` icon, and applied the Astryx normal-font-weight token so the label is not bold.
- Previous state: The Back action occupied the correct shared sidebar header slot but used `SideNavHeading`, whose large semibold heading typography made the action visually heavier than requested.
- Reason: User requested a component-library button, specifically the small size, normal font weight, and the exact `Back to app` label.
- Documentation impact: Updated Plan 031 and Task 001 current-state detail, scope, decisions, deliverables, acceptance criteria, and verification statements while preserving the shared `AppShell`, `SideNav`, resize configuration, Back behavior, and earlier maintenance history.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. No application launch or visual automation was performed.

### 2026-08-17: Size the Back Button to Its Content

- Change: Added the Astryx `Button` width prop `width="fit-content"` to the `Back to app` action so the button occupies only the space required by its icon and label.
- Previous state: The small ghost button was rendered directly in the `SideNav` header slot without an explicit width and could stretch across the available header width.
- Reason: User requested that the Back button remain content-sized rather than filling the sidebar header.
- Documentation impact: Updated Plan 031 and Task 001 current-state detail, scope, decisions, deliverables, acceptance criteria, and verification statements while preserving all existing sidebar structure and navigation behavior.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. No application launch or visual automation was performed.
