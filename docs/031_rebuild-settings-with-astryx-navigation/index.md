# Rebuild Settings with Astryx Navigation

## Status

`completed`

## Goal

Rebuild the full-window Settings page with Astryx-native navigation and settings components so it has a clear, compact, and maintainable information hierarchy while preserving the existing theme-selection, persistence, and Back behavior.

## Detail

Keep the existing canonical `/settings` route and full-window route ownership. Preserve the source-aware Back behavior, immediate application color-mode updates, System mode behavior, SQLite-backed persistence, startup restoration, and existing process boundaries.

Use the same Astryx `AppShell` and `SideNav` frame as the standard application layout instead of maintaining a separate Settings `LayoutPanel`. Both sidebars consume one shared resizable configuration with a `200`-pixel default and minimum width, a `400`-pixel maximum width, and the same persisted-width key, so Settings reflects the exact current sidebar width selected on the main application pages. Both also reuse the horizontal-overflow clipping safeguard. Replace the current `List` composition with Astryx `SideNavItem` components so Astryx owns typography, icon color, hover treatment, selection emphasis, and interaction states. Replace the standard sidebar's Foundry brand content with a small Astryx ghost `Button` labeled `Back to app`, using normal font weight, content-sized width, and a Lucide `ArrowLeft` icon, followed by two peer destinations: Appearance and Data. Appearance will use a Lucide appearance icon, and Data will use a Lucide database icon through the Astryx navigation-item API.

Switch between Appearance and Data through page-local renderer state while remaining on `/settings`. Do not add nested Settings routes or deep links. A direct entry, remount, or return to Settings will default to Appearance rather than persisting the last selected Settings section.

Align the active content near the top of the right pane within a constrained readable width instead of vertically centering a sparse row in the full canvas. Use six spacing steps of block padding so the heading sits slightly closer to the window-drag region while retaining eight spacing steps of inline padding. Show the active section name, Appearance or Data, as the visible main heading in the content pane.

Compose Appearance with an unframed Astryx `Section` and `Divider`. Replace the compact Theme `SegmentedControl` with three Astryx `SelectableCard` options for Light, Dark, and System. Pair the options with Lucide `Sun`, `Moon`, and `Monitor` icons and concise explanatory text. The cards remain controlled by the existing Application Settings context, apply a valid color mode immediately, and require no Save action. Refine the selected treatment through the root Foundry theme: remove Astryx's additional two-pixel inset selection ring from every `SelectableCard` while preserving its variant-aware one-pixel selected border and keyboard focus ring. Keep this as a global component override rather than a Settings-only wrapper or local StyleX rule.

Compose Data as a second selectable Settings section whose current content is only a visible Data heading and the exact placeholder text `Hello world`. The placeholder establishes and verifies the section-switching structure but introduces no data-management behavior.

Preserve the inline, non-collapsible sidebar at all supported window widths, including the standard sidebar's shared resize range and persisted width, and retain the current platform-aware window-drag behavior. The previously completed `FullWindowLayout` maintenance that applies the Astryx surface background is an existing baseline for this plan and will not be reimplemented here.

## Scope

- The same Astryx `AppShell`, `SideNav`, shared `200`-to-`400`-pixel resizable configuration, persisted width, horizontal-overflow clipping, and one-step destination spacing as the standard application sidebar.
- A small, normal-weight, content-sized Astryx ghost `Button` labeled `Back to app` replacing only the standard sidebar's Foundry brand content.
- Appearance and Data as peer page-local Settings destinations.
- Appearance as the default section whenever `/settings` mounts.
- A visible content heading that reflects the selected section.
- Top-aligned, width-constrained Settings content with reduced six-step block padding instead of vertically centered sparse content.
- An unframed Astryx `Section` and `Divider` composition for Appearance.
- Light, Dark, and System Theme options rendered as Astryx `SelectableCard` components with Lucide icons and concise descriptions.
- A root Foundry theme override that keeps every selected `SelectableCard` to its existing variant-aware one-pixel border without the additional inset ring.
- A Data section containing the exact placeholder text `Hello world`.
- Preserved source-aware Back navigation, immediate color-mode updates, System mode behavior, and persistence.
- Preserved inline, non-collapsible sidebar behavior with the standard shared resize range, persisted width, and platform-aware window-drag behavior.
- Type checking, linting, the automated test suite, production build, static integration inspection, and user-performed visual acceptance.

## Out of Scope

- `/settings/appearance`, `/settings/data`, or other nested Settings routes and deep links.
- Persisting or restoring the last selected Settings section.
- Data import, export, cleanup, backup, database administration, or other functional Data settings.
- Settings search, additional Settings destinations, responsive drawers, sidebar hiding, collapsing, or an independent Settings resize configuration.
- Changes to application-settings storage, IPC, preload, main-process code, database schemas, startup restoration, or error handling.
- Custom Theme preview illustrations, screenshots, or hand-authored SVG artwork.
- New dependencies or another styling system.
- A Settings-only `SelectableCard` wrapper, a swizzled Astryx component, or direct changes to the installed Astryx package.
- Application launch, browser automation, screenshots, accessibility-tree inspection, desktop automation, or renderer component tests.

## Decisions

- Use the same Astryx `AppShell` and `SideNav` structure as the standard application layout so Settings does not maintain a parallel sidebar frame.
- Share the standard application's `200`-pixel default and minimum width, `400`-pixel maximum width, persisted-width key, horizontal-overflow clipping rule, and one-step destination gap with Settings.
- Replace the Foundry brand content with a small, normal-weight Astryx ghost `Button` labeled `Back to app` whose width fits its content rather than filling the sidebar header.
- Treat Appearance and Data as peer navigation destinations.
- Display the active destination name as the right-pane main heading.
- Keep section selection local to the mounted Settings page and default to Appearance.
- Keep the canonical route at `/settings` without nested section URLs.
- Replace the Theme `SegmentedControl` with three Astryx `SelectableCard` options.
- Apply the thinner selected treatment through `foundryTheme` so all `SelectableCard` instances retain only their variant-aware one-pixel border while Astryx continues to own focus indication.
- Use Lucide `Sun`, `Moon`, and `Monitor` icons for Light, Dark, and System.
- Use an unframed Astryx `Section` and `Divider` rather than an outer Card.
- Keep Data intentionally limited to the exact `Hello world` placeholder.
- Preserve the inline, non-collapsible Settings sidebar, shared resize behavior, existing Back behavior, persistence boundary, and platform-specific window behavior.
- Keep eight-step inline content padding while reducing block padding from eight to six spacing steps.
- Consume the existing Astryx surface background supplied by `FullWindowLayout` without adding page-specific background styling.

## Tasks

- [x] [Task 001: Rebuild the Settings Experience with Astryx Navigation](./task001_rebuild-the-settings-experience-with-astryx-navigation.md)
