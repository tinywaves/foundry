# 001 Web Admin Shell Prototype

## Summary

Build the Foundry administration shell with three placeholder routes:
`Dashboard`, `Skills`, and `Settings`.

Use React Router as the routing boundary for the Web application. The shell
will provide responsive Astryx navigation, route-aware selected states, and a
fixed viewport without implementing any section-specific features.

## Routing Architecture

- Add `react-router` to the `packages/web/` workspace.
- Mount the application inside React Router's `HashRouter`.
- Use `Routes`, `Route`, and `Navigate` to declare the application routes.
- Use these route paths:
  - `/dashboard`
  - `/skills`
  - `/settings`
- The resulting browser URLs will use the hash-router form:
  - `#/dashboard`
  - `#/skills`
  - `#/settings`
- Redirect the index route and every unknown route to `/dashboard` with
  `Navigate` and `replace`.
- Rely on React Router for refresh, browser back, browser forward, route
  matching, and navigation.
- Do not add custom listeners for `hashchange`, `popstate`, or browser history.
- Do not use `useSyncExternalStore` or maintain a second routing state outside
  React Router.

## Application Structure

- Keep the React root mount in `packages/web/src/index.tsx`.
- Place `HashRouter` at the Web application boundary so all shell and route
  components can use React Router APIs.
- Keep the administration shell composition in
  `packages/web/src/app.tsx` or focused local modules imported by it.
- Build the fixed-viewport frame with Astryx `AppShell`.
- Use Astryx `SideNav` for the desktop navigation.
- Use the mobile navigation behavior provided by Astryx `AppShell` at narrow
  viewports.
- Display Foundry branding and the three route destinations in both navigation
  modes.
- Keep the sidebar visible on desktop and expose the Astryx navigation drawer
  on mobile.
- Close the mobile drawer after a route is selected.
- Do not change the CLI, server, build configuration, or published package
  interfaces.
- Do not manually edit generated files under `dist/`.

## Navigation Model

- Add an internal `SectionId` union containing `dashboard`, `skills`, and
  `settings`.
- Define one shared navigation constant containing each section's:
  - Identifier.
  - English label.
  - React Router path.
- Render both desktop and mobile navigation from that shared constant.
- Use React Router navigation APIs for link behavior.
- Derive selected navigation state from the current React Router location.
- Preserve native link semantics, keyboard navigation, visible focus, and
  `aria-current` behavior.
- Do not duplicate route selection in component state.

## Placeholder Routes

Each declared route will render only:

- One semantic section heading.
- One short supporting message stating that the section is not implemented
  yet.
- One centered Astryx `EmptyState` or equivalent neutral placeholder.

Share a small placeholder component between the three routes when doing so
keeps the implementation direct and readable.

Do not implement metrics, tables, forms, filters, settings controls, mock data,
page actions, loading states, or simulated functionality.

## Layout And Scroll Behavior

- Use `AppShell` with `height="fill"` so the application fills the viewport.
- Set `html`, `body`, and `#root` to full height with `overflow: hidden`.
- Set `overscroll-behavior: none` on `html`, `body`, and `#root`.
- Apply `overscroll-behavior: none` to the Astryx content, side navigation, and
  mobile navigation scroll containers.
- Keep scrolling inside the appropriate shell regions when content eventually
  exceeds their available height.
- Prevent document-level macOS rubber-band scrolling while preserving normal
  mouse-wheel and trackpad scrolling inside scrollable regions.
- Do not add spring, bounce, overshoot, or route-transition animations.

## Visual Direction

- Use Astryx components for layout, typography, navigation, and placeholder
  content.
- Preserve the existing Astryx reset, core, and Neutral theme imports.
- Use compact, restrained administration styling consistent with the Astryx
  component library.
- Do not add custom page decoration, marketing-style content, nested cards, or
  page-specific visual treatments.
- Ensure headings, labels, and placeholder text do not clip or overflow at
  desktop and mobile sizes.

## Verification

- Run `pnpm run lint`.
- Run `pnpm run build`.
- Verify `#/dashboard`, `#/skills`, and `#/settings` render their matching
  placeholders.
- Verify the empty hash redirects to `#/dashboard`.
- Verify unknown routes redirect to `#/dashboard` without adding an extra
  browser-history entry.
- Verify direct refresh works on all three hash routes.
- Verify browser back and forward navigation updates the route, content, and
  selected navigation item.
- Verify desktop navigation remains visible at a desktop viewport.
- Verify the Astryx navigation drawer replaces the desktop sidebar at
  approximately `390 x 844`.
- Verify selecting a mobile route closes the navigation drawer.
- Verify native link behavior, keyboard access, selected states, visible
  focus, `aria-current`, and semantic heading levels.
- Verify the document does not scroll or move at its boundaries.
- Verify internal shell scrolling remains functional.
- Check desktop and mobile layouts for clipping, overlap, horizontal overflow,
  and text overflow.

## Dependency Changes

1. Dependencies to remove: None
2. Dev dependencies to remove: None
3. Dependencies to add: `react-router` in `packages/web/package.json`
4. Dev dependencies to add: None

Required command to be run by the user from the repository root:

```bash
pnpm --filter web add react-router@^8.2.0
```

## Assumptions

- All interface copy will be written in English.
- Dashboard is the default route.
- Hash routing is retained so the existing static server does not require
  history-fallback configuration.
- The three pages are intentionally limited to neutral placeholders.
- No dependencies other than `react-router` are required.
