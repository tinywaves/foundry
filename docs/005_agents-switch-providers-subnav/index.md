# Add Providers Sub-navigation to Agents Switch

## Status

`completed`

## Goal

Add a collapsible `Providers` sub-navigation item under Agents Switch so users can open a dedicated Providers page.

## Detail

Keep `Agents Switch` as a top-level item in the left navigation, but change it from a navigable link into an expandable group. The group is collapsed by default, reveals the `Providers` child when expanded, and retains its expanded state when the user switches to another top-level page within the application.

`Providers` uses the dedicated `/agents-switch/providers` route and initially displays title-only placeholder content. The existing `/agents-switch` path redirects to `/agents-switch/providers` so users do not land on a page without a direct navigation entry.

The implementation continues to use React Router, Astryx `SideNavItem` nesting, and the existing renderer boundary. It adds no dependency, IPC, or persistence capability. The existing `AppShell`, window drag region, sidebar resizing, and cross-platform behavior remain unchanged.

## Scope

- Add a nested `Providers` sub-navigation item under Agents Switch.
- Add the `/agents-switch/providers` route and a title-only Providers placeholder page.
- Redirect `/agents-switch` to `/agents-switch/providers`.
- Keep the Agents Switch disclosure visually neutral and select the Providers child based on the current route.
- Preserve the existing sidebar layout, drag region, resizing, and platform behavior.

## Out of Scope

- Providers data loading, creation, editing, deletion, or connection logic.
- Agent, Profile, or other Agents Switch sub-pages.
- Provider persistence, permissions, authentication, or IPC APIs.
- Persisting the expanded state across application restarts.
- Mobile navigation changes.
- New automated test infrastructure.

## Decisions

- The only new sub-navigation item in this plan is `Providers`.
- The `Agents Switch` parent is not navigable; it only expands and collapses.
- The Agents Switch group is collapsed by default and expanded by the user.
- The expanded state is retained when switching top-level pages within the application; persistence across application restarts is out of scope.
- Providers uses the `/agents-switch/providers` route.
- `/agents-switch` redirects to `/agents-switch/providers`.
- The Providers page initially displays title-only placeholder content.
- The Agents Switch disclosure is not rendered as a selected page; Providers is the only selected item on `/agents-switch/providers`.
- Providers uses the small `SideNavItem` size to keep the nested hierarchy compact.
- Existing Astryx components and semantic icons are reused without adding an icon dependency or another styling system.

## Tasks

- [x] [Task 001: Add Providers Sub-navigation to Agents Switch](./task001_add-agents-switch-providers-subnav.md)
