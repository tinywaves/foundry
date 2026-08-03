# Task 001: Refine Sidebar Visual Density and Alignment

## Status

`completed`

## Goal

Refine the existing Foundry sidebar composition so the branding heading is more compact, its icon aligns with navigation icons, and navigation item hover surfaces have consistent separation.

## Detail

Modify the renderer-owned sidebar composition in `src/renderer/src/app.tsx` without changing the application boundary or introducing a new styling system.

- Update the StyleX brand icon dimensions from the current `--spacing-12` token to `--spacing-10`, producing a 40-by-40-pixel image while preserving the existing source asset, `objectFit`, empty `alt`, and non-draggable behavior.
- Update the `SideNavHeading` StyleX override to use `--spacing-2` for its inline start and `--spacing-1` for its inline end. The resulting 8-pixel left inset matches the existing `SideNav` scrollable padding plus medium `SideNavItem` inline padding, so the brand image's left edge aligns with top-level navigation icons.
- Keep the heading's own block padding at zero and rely on the smaller icon to reduce the heading row's occupied height without changing the `SideNav` sticky-top structure, macOS drag region, or fixed-header behavior.
- Wrap the top-level `SideNavItem` siblings in the existing Astryx `VStack` with `gap={1}` so Dashboard, Skills, and Agents Switch have 4-pixel separation.
- Wrap nested Agents Switch children in an Astryx `VStack` with `gap={1}` so Providers follows the same spacing rule when the group is expanded.
- Preserve the existing React Router links, pathname-derived selection, compact Providers size, default collapsed state, sidebar resize configuration, scrolling, and cross-platform behavior.

No main-process, preload, route, dependency, or package configuration changes are expected.

## Findings

None.

## Dependencies

None.

## Deliverables

- A 40-by-40-pixel Foundry branding icon using the existing `resources/icon.png` asset and `--spacing-10`.
- A compact `SideNavHeading` override with an 8-pixel inline start and 4-pixel inline end.
- A brand icon left edge aligned with the left edge of top-level navigation icons.
- Four-pixel separation between the top-level Dashboard, Skills, and Agents Switch items.
- Four-pixel separation between nested navigation items, including Providers.
- Unchanged route, selection, disclosure, resize, drag-region, scrolling, and cross-platform behavior.

## Acceptance Criteria

- [x] The computed Foundry brand icon size is 40 by 40 pixels and the existing source asset and accessibility behavior remain unchanged.
- [x] The brand icon's left edge aligns with the left edge of the Dashboard and Skills navigation icons at the default sidebar width.
- [x] The branding heading uses an 8-pixel inline start and 4-pixel inline end, with no added block padding.
- [x] Dashboard, Skills, and Agents Switch have 4 pixels of vertical space between sibling item surfaces.
- [x] Providers and any future nested sibling rendered through the same nested stack have 4 pixels of vertical space between item surfaces.
- [x] Hover and selected surfaces are visually separated while the existing selected states and hover behavior remain intact.
- [x] Clicking Foundry, Dashboard, Skills, and Providers retains the existing client-side navigation behavior.
- [x] Agents Switch remains collapsed by default, expands and collapses normally, and retains its existing nested Providers selection behavior.
- [x] Sidebar resizing, the macOS window drag region, the fixed branding header, navigation scrolling, and Windows/Linux behavior remain unchanged.
- [x] No dependency, IPC API, route definition, main-process code, preload code, or alternate styling system is introduced.

## Out of Scope

- Changing navigation labels, routes, page content, or selected-state colors.
- Changing the macOS window drag-region dimensions or Electron window configuration.
- Changing sidebar resize bounds or adding persistence for sidebar layout.
- Changing mobile navigation behavior.
- Adding automated test infrastructure or a new dependency.

## Handoff

The renderer will expose a denser, aligned sidebar composition that future navigation additions can extend through the same top-level and nested `VStack` spacing pattern without changing the existing navigation contracts.

## Verification

- `pnpm exec tsc --noEmit -p tsconfig.node.json --composite false`: Passed with the repository's existing pnpm configuration warnings.
- `pnpm exec tsc --noEmit -p tsconfig.web.json --composite false`: Passed with the repository's existing pnpm configuration warnings.
- `pnpm exec eslint src/renderer/src/app.tsx`: Passed with existing ESLint configuration deprecation warnings.
- `pnpm exec electron-vite build`: Passed; main, preload, and renderer production bundles were generated successfully.
- Code inspection: Passed; the brand icon uses `--spacing-10`, the heading uses `--spacing-2` inline start and `--spacing-1` inline end, and top-level and nested item groups use `VStack gap={1}`.
- Alignment inspection: Passed; the SideNav header's 8-pixel container inset plus the heading's 8-pixel inline start matches the scrollable region's 8-pixel inset plus the medium navigation item's 8-pixel inline padding.
- `pnpm typecheck`: Blocked by the existing package script delegating to `npm`, which rejects the project's pnpm-only `devEngines.packageManager` requirement. The equivalent direct node and renderer TypeScript checks passed.
- `pnpm lint`: Blocked by the existing repository-wide script scanning generated `out/` JavaScript without typed parser configuration. The targeted renderer ESLint check passed.
- `git diff --check`: Passed.
- Final visual inspection remains user-owned under the repository's UI verification rule; no Electron launch, screenshot, accessibility-tree, or desktop automation was performed.
