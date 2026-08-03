# Add Foundry Sidebar Branding

## Status

`completed`

## Goal

Display the Foundry brand above the sidebar navigation items so the application's identity remains visible within the primary navigation.

## Detail

Add a fixed branding header to the existing Astryx `SideNav`. The header displays the image from `resources/icon.png` on the left and the `Foundry` name on the right. The complete branding area links to the Dashboard route.

On macOS, the sidebar order remains the window drag region, the branding header, and then the navigation items. The branding header stays outside the scrollable navigation-item region. Windows and Linux display the same branding header while retaining their existing native title-bar behavior.

The implementation preserves the current `AppShell`, sidebar resizing, route-derived selection, nested Agents Switch navigation, and renderer boundary. It uses Astryx components, StyleX, and design tokens without adding dependencies.

## Scope

- Add a fixed Foundry branding header above the sidebar navigation items.
- Display `resources/icon.png` to the left of the `Foundry` name.
- Link the branding header to the Dashboard route.
- Show the branding header on macOS, Windows, and Linux.
- Preserve the existing sidebar layout, resizing, navigation, and platform behavior.

## Out of Scope

- Replacing or editing the source icon.
- Adding a brand menu, account switcher, or sidebar collapse behavior.
- Changing the macOS window drag region or Electron window configuration.
- Changing navigation items, page content, or route structure.
- Adding dependencies or another styling system.

## Decisions

- Use the Astryx `SideNav` header area and `SideNavHeading` for the branding structure.
- Use `resources/icon.png` as the brand image, preserve its aspect ratio at 48 by 48 pixels, and keep the heading horizontally compact with reduced internal padding.
- Display the product name exactly as `Foundry`.
- Make the branding area navigable to the existing Dashboard route.
- Render the branding header on every supported desktop platform.
- Keep the macOS branding header below the existing window drag region.
- Keep the branding header fixed above the scrollable navigation items.
- Use one implementation task because the change has a single independently reviewable outcome.

## Tasks

- [x] [Task 001: Add Foundry Sidebar Branding](./task001_add-foundry-sidebar-branding.md)
