# Task 002: Connect Sidebar Navigation

## Status

`completed`

## Goal

Connect the existing sidebar to the renderer routes so users can navigate between Dashboard, Skills, and Agents Switch with a route-derived selected state.

## Detail

Replace the current `Sidebar` text placeholder with three `SideNavItem` components in this order:

- Dashboard: `/`, icon `viewColumns`
- Skills: `/skills`, icon `wrench`
- Agents Switch: `/agents-switch`, icon `arrowsUpDown`

Use the existing Astryx semantic icon registry without adding an icon dependency.

Each item will use React Router's `Link` through the per-item `as` prop and its shared `routePaths` value through `href`. Astryx automatically forwards `href` as React Router's `to` prop, so no custom link adapter is required.

Use `useLocation` to derive `isSelected` through exact pathname matching. Unknown routes will have no selected item until the existing replacement redirect resolves to Dashboard.

A global Astryx `LinkProvider` will not be introduced because it could also route unrelated Astryx links, including external Markdown source links, through React Router.

Preserve the existing `SideNav` resizing configuration, non-collapsible behavior, shell layout, drag regions, scrolling, and platform behavior.

## Findings

None.

## Dependencies

None.

## Deliverables

- Three routed `SideNavItem` entries.
- Existing Astryx semantic icons for each destination.
- React Router navigation without renderer reloads.
- Route-derived selected sidebar state.

## Acceptance Criteria

- [x] Dashboard, Skills, and Agents Switch appear in the sidebar in the approved order.
- [x] Clicking each item navigates to its shared route path without reloading the renderer.
- [x] Exactly one item is selected for each known route.
- [x] Dashboard becomes selected after an unknown route redirects to `/`.
- [x] Existing Markdown source links remain unaffected.
- [x] Sidebar resizing, shell layout, drag regions, and platform behavior remain unchanged.
- [x] No new dependency or custom icon implementation is introduced.

## Out of Scope

- Additional destinations, nested navigation, sections, badges, or sidebar branding.
- Production Skills or Agents Switch functionality.
- Collapsed sidebar behavior or mobile navigation changes.
- Route persistence, data loading, or automated test infrastructure.

## Handoff

Completing this task completes Plan 003 and leaves a stable routed sidebar foundation for future page-specific plans.

## Verification

- `pnpm typecheck:node`: Passed.
- `pnpm typecheck:web`: Passed.
- `pnpm exec eslint src/renderer/src`: Passed with existing ESLint configuration deprecation warnings.
- `pnpm exec electron-vite build`: Passed for main, preload, and renderer.
- `git diff --check`: Passed.
- Manual route interaction verification was left to the user as agreed.
