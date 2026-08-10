# Task 001: Refine Application Shell and Sidebar

## Status

`completed`

## Goal

Simplify the sidebar hierarchy and improve the renderer shell's navigation semantics and keyboard accessibility without changing routes, resize behavior, or Electron boundaries.

## Detail

Replace the collapsible Agents Switch `SideNavItem` with a static `SideNavSection`. Providers remains at `/agents-switch/providers`, gains a `ServerCog` Lucide icon, and is always visible at the normal navigation-item size. Dashboard and Skills remain grouped above it, with additional vertical separation between the primary destinations and the Agents Switch section.

Keep the entire `SideNav` explicitly non-collapsible and retain the existing 260-pixel default, 200-pixel minimum, and 400-pixel maximum resize configuration. Preserve the Foundry heading link, macOS drag region, route-derived selected state, redirects, and fallback route.

Configure Astryx links through a React Router `LinkProvider` so links inside page components participate in hash routing. Add a keyboard-visible skip link targeting a focusable `main` landmark, declare the document language and viewport, and give the Foundry image explicit intrinsic dimensions and high fetch priority.

## Findings

None.

## Dependencies

- Existing React Router `HashRouter` and shared renderer route paths.
- Existing Astryx `AppShell`, `SideNav`, link, and stack components.
- Existing StyleX design tokens and Lucide dependency.

## Deliverables

- Static Agents Switch sidebar section with an always-visible Providers route.
- Preserved non-collapsible, bounded sidebar resizing.
- Shared router-aware Astryx link configuration.
- Keyboard skip navigation and a focusable main-content landmark.
- Document language, viewport metadata, and explicit Foundry image dimensions.

## Acceptance Criteria

- [x] Agents Switch is rendered as a section label without a disclosure control.
- [x] Providers is always visible and retains `/agents-switch/providers` navigation and selected-state behavior.
- [x] Dashboard, Skills, and Providers use suitable Lucide icons.
- [x] Sidebar resize bounds, macOS drag behavior, redirects, and fallback routing remain unchanged.
- [x] Astryx links navigate through React Router inside the `HashRouter`.
- [x] Keyboard users can reveal the skip link and move focus to the main content landmark.
- [x] The document declares English content and a device-width viewport.
- [x] The Foundry image has explicit dimensions and remains decorative to assistive technology.

## Out of Scope

- New routes or Agents Switch destinations.
- Sidebar width persistence, automatic hiding, or mobile navigation.
- Main-process, preload, IPC, or window-creation changes.
- Redesigning the Foundry application icon.

## Handoff

The simplified shell provides stable navigation and link behavior for the operational Dashboard, Skills state, and Provider management refinements in the remaining tasks.

## Verification

- Type checking, linting, and the Electron Vite production build passed for the completed renderer implementation.
- Static inspection confirmed the main landmark, skip-link target, route-aware links, non-collapsible sidebar, and unchanged resize bounds.
- The application was not launched and no automated visual inspection was performed, as required by repository policy.
