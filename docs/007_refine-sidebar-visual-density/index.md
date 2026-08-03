# Refine Sidebar Visual Density

## Status

`completed`

## Goal

Make the Foundry sidebar visually tighter and more balanced by reducing the branding heading's visual footprint, adding separation between navigation items, reducing the brand icon size, and aligning the brand icon with navigation icons.

## Detail

Adjust the existing renderer-side Astryx sidebar composition using StyleX and existing spacing tokens. The branding heading will use a 40-pixel icon, tighter surrounding spacing, and a left inset matching the navigation item icons. Top-level and nested navigation items will use consistent 4-pixel gaps so hover backgrounds are visually separated.

Existing routes, selection states, nested disclosure behavior, resize bounds, macOS drag region, fixed header behavior, and cross-platform behavior remain unchanged.

## Scope

- Reduce the Foundry branding icon from 48 pixels to 40 pixels.
- Tighten the branding heading's surrounding spacing.
- Align the branding icon's left edge with the left edge of navigation item icons.
- Add 4-pixel spacing between top-level navigation items.
- Add the same spacing between nested navigation items.
- Preserve existing hover, selected, navigation, and disclosure behavior.

## Out of Scope

- Changing navigation labels, routes, or page content.
- Changing selected-state styling or disclosure behavior.
- Changing the macOS window drag region.
- Changing sidebar resize configuration.
- Adding dependencies or changing the styling system.
- Adding automated test infrastructure.
- Changing mobile navigation behavior.

## Decisions

- Use 40 pixels (`--spacing-10`) for the Foundry brand icon.
- Use 4 pixels (`--spacing-1`) between sibling navigation items.
- Apply the item spacing consistently to both top-level and nested items.
- Keep the brand icon's left edge aligned with the navigation item icon left edges.
- Use an 8-pixel left inset and 4-pixel right inset for the heading content.
- Keep the existing `SideNavHeading`, `SideNavItem`, `VStack`, StyleX, and Astryx design tokens.
- Keep the change within the renderer-owned sidebar composition.
- Use one implementation task because all four requested changes form one independently reviewable visual outcome.

## Tasks

- [x] [Task 001: Refine Sidebar Visual Density and Alignment](./task001_refine-sidebar-visual-density-and-alignment.md)
