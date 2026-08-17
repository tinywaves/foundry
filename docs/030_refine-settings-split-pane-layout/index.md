# Refine Settings Split-Pane Layout

## Status

`completed`

## Goal

Refine the full-window Settings experience into a fixed navigation sidebar and content pane without a visible Settings title.

## Detail

Preserve the existing global Settings route, source-aware Back behavior, application color-mode selection, immediate theme updates, and database persistence established by Plan 029. Settings owns an untitled two-pane full-window composition: both panes begin with a platform-aware drag region, and the Back action sits below that region in the left sidebar. Prompt and other titled full-window experiences remain unchanged.

Change the Settings body from a single centered column into a persistent split-pane layout based only on the structural parts of the supplied Astryx reference. Use a fixed 260-pixel left panel with a vertical divider for Settings group navigation and the remaining area for the active group's content. The left panel currently contains only the selected Appearance destination. The right pane centers one unframed responsive row for the Light, Dark, and System Theme control; Appearance remains available only as a visually hidden page heading.

Keep the left panel visible and fixed at every window width. Do not replace it with tabs, hide it, or collapse it at narrow widths. The right pane may continue using its existing internal responsive reflow within the remaining space.

Do not copy the reference template's top header divider, visible top-left Settings heading, search field, responsive TabList, sample account form, save actions, or any unrelated settings. Add no new dependencies or agent-run visual automation.

## Scope

- An untitled Settings full-window frame with independent platform-aware drag regions in both panes.
- A Back action inside the left sidebar.
- A fixed 260-pixel Settings navigation panel with a vertical divider that remains visible at all widths.
- One selected Appearance navigation destination.
- A centered, unframed Appearance content row containing the existing Theme setting without a visible page heading.
- Preserved source-aware Back behavior, immediate theme switching, and persistence.
- Type checking, linting, the full automated test suite, production build, static integration inspection, and user-performed visual acceptance.

## Out of Scope

- Data settings, Export, Import, or placeholders for future settings groups.
- Settings search, a visible Settings page heading, a top header divider, or explanatory content.
- Responsive tabs, sidebar hiding, sidebar collapsing, or another narrow-window navigation mode.
- Settings group deep links or additional routes.
- Changes to Prompt or other full-window page titles.
- New dependencies, window minimum-width changes, application launch, browser automation, agent-captured screenshots, accessibility-tree inspection, desktop automation, or renderer component tests.

## Decisions

- Do not render a shared Settings header; give each pane its own drag region and place Back in the sidebar.
- Keep Prompt and all other consumers of the shared full-window header unchanged.
- Use an Astryx left panel and right content region as the only structure adopted from the supplied reference.
- Fix the Settings navigation panel at 260 pixels for every window width.
- Separate the sidebar from the content pane with the `LayoutPanel` divider.
- Show only Appearance as the selected Settings navigation destination.
- Center a constrained responsive Theme row directly on the right-pane background, with Appearance retained only as a visually hidden level-one heading.
- Do not add a top header divider, search, visible Settings heading, tabs, forms, or sample content.
- Preserve all Settings behavior delivered by Plan 029 and add no dependency.

## Tasks

- [x] [Task 001: Refine the Settings Split-Pane Layout](./task001_refine-the-settings-split-pane-layout.md)
