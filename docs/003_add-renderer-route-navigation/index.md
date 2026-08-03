# Add Renderer Route Navigation

## Status

`completed`

## Goal

Establish minimal renderer routing for Foundry so Dashboard, Skills, and Agents Switch become navigable application pages.

## Detail

The application will open on Dashboard at `/`. The resizable left `SideNav` will display Dashboard, Skills, and Agents Switch navigation items for `/`, `/skills`, and `/agents-switch`, respectively.

Dashboard will continue to display the existing Tokyo Markdown example. Skills and Agents Switch will temporarily display placeholder content matching their page names. Navigation will use React Router with hash-based routing to support Electron's packaged local-page loading.

The selected sidebar item will follow the current route. The existing `AppShell`, `WindowDragRegion`, sidebar resizing configuration, and macOS, Windows, and Linux platform behavior will remain unchanged. Routing will stay within the renderer and will not expand the main, preload, or IPC boundaries.

## Scope

- Add the React Router dependency.
- Establish hash-based routing in the renderer.
- Add Dashboard, Skills, and Agents Switch route pages.
- Keep the existing Tokyo Markdown example on Dashboard.
- Connect the three routes to `SideNav` navigation items.
- Use existing Astryx icons and the `SideNavItem` selected state.
- Preserve the existing `AppShell`, `WindowDragRegion`, and `SideNav` resizing configuration.
- Keep the main, preload, IPC, and Electron window configuration unchanged.

## Out of Scope

- Production Skills or Agents Switch functionality.
- Data loading, state management, persistence, or permissions.
- Custom icons, design-system theme changes, or another styling system.
- Authentication, deep-link protocols, or cross-window route synchronization.
- Mobile drawer navigation changes.
- New automated test infrastructure.

## Decisions

- The default route is `/`, which renders Dashboard.
- Routing uses `HashRouter` with `/`, `/skills`, and `/agents-switch` path semantics.
- The sidebar contains Dashboard, Skills, and Agents Switch items.
- Dashboard retains the existing Tokyo Markdown content.
- Skills and Agents Switch provide page-level placeholder content only.
- Existing Astryx icons are reused without adding an icon dependency.
- Routing and page logic remain renderer-owned without new preload or IPC APIs.
- This plan delivers navigation foundations only; production Skills and Agents functionality will be planned separately.

## Tasks

- [x] [Task 001: Establish Renderer Routing Foundation](./task001_establish-renderer-routing-foundation.md)
- [x] [Task 002: Connect Sidebar Navigation](./task002_connect-sidebar-navigation.md)
