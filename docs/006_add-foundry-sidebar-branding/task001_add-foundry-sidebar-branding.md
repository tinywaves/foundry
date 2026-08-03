# Task 001: Add Foundry Sidebar Branding

## Status

`completed`

## Goal

Add a clickable Foundry brand identity above the sidebar navigation items.

## Detail

- Modify the renderer-owned sidebar composition in `src/renderer/src/app.tsx`.
- Import the image URL from `resources/icon.png` through the renderer build pipeline.
- Set the existing Astryx `SideNav` header to a `SideNavHeading`.
- Configure the heading with `heading="Foundry"`, `headingHref={routePaths.dashboard}`, and `as={Link}`.
- Render the imported brand image in the `SideNavHeading` icon slot.
- Use StyleX and the Astryx spacing token that resolves to 48 pixels for both image dimensions.
- Override the `SideNavHeading` horizontal padding with the Astryx spacing token that resolves to 4 pixels.
- Preserve the image's aspect ratio and add no background, border, or subtitle.
- Give the image an empty `alt` value because the adjacent `Foundry` text supplies the link's accessible name.
- Make the complete heading row navigate to Dashboard through React Router without reloading the renderer.
- Keep the existing macOS `WindowDragRegion` above the `SideNav`, which places the branding header below the drag region and above the scrollable navigation items.
- Preserve the current sidebar resizing configuration, route-derived selection, nested Agents Switch navigation, scrolling, and cross-platform behavior.
- Do not modify main, preload, IPC, Electron window configuration, or route definitions.

## Findings

None.

## Dependencies

None.

## Deliverables

- A fixed Foundry branding header above the sidebar navigation items.
- The existing brand image displayed to the left of the `Foundry` name at 48 by 48 pixels.
- A compact branding row with 4 pixels of horizontal `SideNavHeading` padding.
- A complete branding-row link to the existing Dashboard route.
- Consistent branding-header behavior across macOS, Windows, and Linux.

## Acceptance Criteria

- [x] The branding header appears above every sidebar navigation item.
- [x] On macOS, the branding header appears below the existing window drag region.
- [x] The displayed image comes from `resources/icon.png`, measures 48 by 48 pixels, and preserves its aspect ratio.
- [x] The `SideNavHeading` uses 4 pixels of horizontal padding while retaining its existing vertical-padding behavior.
- [x] The text to the right of the image is exactly `Foundry`.
- [x] Clicking either the image or the text navigates to Dashboard without reloading the renderer.
- [x] The branding header remains fixed while the navigation-item region scrolls.
- [x] Dashboard, Skills, Agents Switch, and Providers retain their existing navigation and selected-state behavior.
- [x] The sidebar remains resizable within its existing 200-to-400-pixel bounds.
- [x] No dependency is added and no main, preload, IPC, Electron window, or route-definition change is introduced.

## Out of Scope

- Replacing or editing the source icon.
- Adding a brand menu, account switcher, subtitle, or sidebar collapse behavior.
- Changing the macOS window drag region or native title-bar behavior.
- Changing navigation items, page content, or route structure.
- Adding dependencies, another styling system, or automated test infrastructure.

## Handoff

After this task, the sidebar will provide a stable product-identity entry point above the existing navigation items. Future navigation functionality can continue to extend the current scrollable items region without redefining the branding area.

## Maintenance Adjustments

### 2026-08-03 20:02:41: Increase Sidebar Brand Icon Size

- Change: Increased the displayed Foundry brand icon to 28 by 28 pixels using Astryx `--spacing-7`.
- Previous state: The displayed brand icon measured 24 by 24 pixels using Astryx `--spacing-6`.
- Reason: The original icon appeared too small in the sidebar branding header.
- Documentation impact: Synchronized the icon dimensions in Detail, Deliverables, and Acceptance Criteria.
- Verification: Targeted node and renderer type checks, renderer ESLint, and the Electron production build passed. Runtime macOS inspection confirmed a computed 28-by-28-pixel icon aligned with the `Foundry` text without crowding the 260-pixel sidebar. `git diff --check` passed.

### 2026-08-03 20:16:00: Enlarge Icon and Tighten Header Padding

- Change: Increased the displayed Foundry brand icon to 48 by 48 pixels using Astryx `--spacing-12` and reduced the `SideNavHeading` horizontal padding to 4 pixels using Astryx `--spacing-1`.
- Previous state: The displayed brand icon measured 28 by 28 pixels using Astryx `--spacing-7`, and the heading used its default 8-pixel horizontal padding from Astryx `--spacing-2`.
- Reason: The brand icon needed more visual presence while the complete header needed tighter surrounding space.
- Documentation impact: Synchronized the plan decision and the task's Detail, Deliverables, and Acceptance Criteria.
- Verification: Targeted node and renderer type checks, renderer ESLint, the Electron production build, and `git diff --check` passed. Visual inspection is intentionally reserved for user acceptance under the project verification rules.

## Verification

- `pnpm exec tsc --noEmit -p tsconfig.node.json --composite false`: Passed.
- `pnpm exec tsc --noEmit -p tsconfig.web.json --composite false`: Passed.
- `pnpm exec eslint src/renderer/src/app.tsx`: Passed with existing ESLint configuration deprecation warnings.
- `pnpm exec electron-vite build`: Passed; the renderer emitted `out/renderer/assets/icon-s2GciEXh.png`.
- `pnpm dev`: Passed; the Electron development app launched. The renderer used the existing port `5173` instance while the newly started server selected `5174` because `5173` was already occupied.
- Manual macOS verification: Passed; the Foundry icon and wordmark appeared below the drag region and above Dashboard, the accessible tree exposed a `Foundry` link, and navigating Skills → Foundry returned to Dashboard without a renderer reload.
- Sidebar resize verification: Passed by preserving the existing configuration; the running Electron accessibility tree reported the resize splitter at `260` pixels.
- `pnpm typecheck`: Blocked by the existing conflicting `packageManager` and `devEngines.packageManager` settings; the package script delegates to `npm`, which rejects the pnpm `devEngines` requirement.
- `pnpm lint`: Blocked by the existing script scanning generated `out/` JavaScript; the typed ESLint rule fails because generated files are outside the configured TypeScript parser project.
- `git diff --check`: Passed.
