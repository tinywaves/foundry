# Build Application Settings and Appearance

## Status

`completed`

## Goal

Establish a global Foundry Settings entry and full-window Settings page whose first functional group lets users select and persist the application color mode as Light, Dark, or System.

## Detail

Add Settings as a global application destination anchored at the bottom of the existing application sidebar. Selecting it opens the canonical `/settings` route under the existing full-window layout, removing the application sidebar while Settings is active. The full-window header provides Back navigation: an in-application entry returns to its originating page and preserves that page's history state, while a direct Settings entry falls back to Dashboard. Preserve the established macOS titlebar and window-drag behavior.

Present Settings as one vertically organized page rather than adding a second navigation rail or tab layer. Use the existing page and design-system conventions to render a Settings heading followed by independent settings groups that can accept future additions. The initial page contains only an Appearance group and does not advertise or reserve visible space for Data, Export, Import, or other unfinished settings.

Within Appearance, provide one Theme setting with Light, Dark, and System visible together as a segmented mode control. A selection applies immediately across the entire application without a Save action. System follows operating-system color-mode changes at runtime, while explicit Light or Dark selections remain fixed until changed again. Continue using the existing Astryx root Theme integration so all routes, portals, native color-scheme behavior, and the existing CodeMirror `useTheme` integration resolve from the same application mode.

Persist the selected color mode in Foundry's existing local SQLite database through a Settings-owned main-process boundary, constrained IPC handlers, renderer-safe shared contracts, and a narrow preload API. The renderer reads the preference during startup before presenting the primary themed application UI. If no stored value exists, resolve the preference to System; otherwise use the stored Light, Dark, or System value. Keep database access and authoritative validation outside the renderer.

Do not introduce dedicated user-facing handling for database read or write failures in this plan. Preserve the existing Electron security boundary, use Astryx components, StyleX, design tokens, and Lucide icons, and add no new dependency or visual automation.

## Scope

- A global Settings destination anchored at the bottom of the application sidebar.
- A canonical `/settings` sibling route under the existing full-window layout.
- Source-aware Back navigation with a Dashboard fallback for direct Settings entries.
- Preserved macOS full-window titlebar and window-drag behavior.
- A single vertically organized Settings page that can accept future groups.
- An Appearance group with one Theme setting and Light, Dark, and System modes.
- Immediate application-wide color-mode updates without an explicit Save action.
- SQLite persistence and startup restoration of the selected application color mode.
- A Settings-owned main-process, shared-contract, IPC, preload, and renderer boundary.
- Continued Astryx and CodeMirror synchronization with the resolved application mode.
- Focused database, contract, state, and navigation behavior verification.
- Type checking, linting, the full automated test suite, production build, and static integration inspection.

## Out of Scope

- Data settings, Export, Import, or placeholders for unfinished settings groups.
- Project-specific, workspace-specific, account-specific, or per-window settings.
- A Settings search experience, category sidebar, tab navigation, or settings deep links.
- Additional Appearance settings such as custom themes, palettes, fonts, density, or operating-system accent colors.
- Dedicated database-error banners, retry actions, rollback interaction, or other storage-failure UX.
- Changes to Prompt Markdown editing or CodeMirror beyond consuming the existing resolved theme mode.
- Native application menus, keyboard shortcuts, packaging changes, or external integrations.
- New dependencies, another styling system, or renderer access to SQLite, Electron, arbitrary IPC, or the filesystem.
- Application launch, browser automation, screenshots, accessibility-tree inspection, desktop automation, or renderer component tests.

## Decisions

- Treat Settings as global Foundry application settings because the product has no Project or Workspace settings boundary.
- Anchor the Settings entry in the application sidebar footer and use a Lucide settings icon.
- Use `/settings` as a full-window sibling route so the application sidebar is absent while Settings is active.
- Return an in-application Settings entry to its originating page and preserve history state; use Dashboard when no valid source exists.
- Use one vertically organized Settings page with independent groups instead of a nested category sidebar or tab layer.
- Show only implemented settings; do not add a visible Data placeholder in this plan.
- Present Light, Dark, and System through an Astryx segmented control because they are three mutually exclusive modes that should remain visible together.
- Apply a Theme selection immediately and persist it without a Save button.
- Store the selected mode in Foundry's SQLite database behind an authoritative main-process Settings boundary.
- Resolve a missing stored preference to System and use a valid stored preference when present.
- Restore the persisted mode before presenting the primary themed application UI.
- Let System track operating-system color-mode changes live and let explicit Light or Dark selections ignore those changes.
- Continue using the existing Astryx root Theme and CodeMirror `useTheme` integration rather than introducing another theme mechanism.
- Do not design dedicated storage-error interaction in this plan.
- Use existing dependencies and the repository's Astryx, StyleX, design-token, Lucide, security, and non-visual verification conventions.

## Tasks

- [x] [Task 001: Establish Database-Backed Application Settings](./task001_establish-database-backed-application-settings.md)
- [x] [Task 002: Bootstrap the Persisted Application Color Mode](./task002_bootstrap-the-persisted-application-color-mode.md)
- [x] [Task 003: Build the Full-Window Appearance Settings Experience](./task003_build-the-full-window-appearance-settings-experience.md)
