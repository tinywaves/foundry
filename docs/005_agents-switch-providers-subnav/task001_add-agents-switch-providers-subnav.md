# Task 001: Add Providers Sub-navigation to Agents Switch

## Status

`completed`

## Goal

Implement the Agents Switch Providers sub-navigation and placeholder route so users can open Providers from the sidebar.

## Detail

- Keep `Agents Switch` in the existing `SideNav`, but remove its `href` and React Router link behavior.
- Use nested `SideNavItem` children to render `Providers`.
- Configure the parent item with `collapsible={{defaultIsCollapsed: true}}`.
- The parent item will render as a button and clicking it will only expand or collapse the child item.
- `Providers` will use React Router's `Link` and navigate to `/agents-switch/providers`.
- Add `agentsSwitchProviders` to the shared `routePaths` object.
- Replace the `/agents-switch` page route with a `Navigate` redirect to `/agents-switch/providers`.
- Add a Providers placeholder page that renders a `Providers` heading using the existing `VStack` and `Heading` pattern.
- Keep Agents Switch visually neutral because it is a disclosure control rather than a page.
- Mark Providers selected only for `/agents-switch/providers` and use the small `SideNavItem` size for a compact nested hierarchy.
- Keep the current `SideNav` resizing configuration, `AppShell`, macOS drag region, scrolling behavior, and platform behavior unchanged.
- Do not add a Providers-specific icon because the current Astryx semantic icon registry does not provide an appropriate provider/server icon. Do not introduce a custom icon.
- Expected implementation files:
  - `src/renderer/src/app.tsx`
  - `src/renderer/src/routes.ts`
  - `src/renderer/src/pages/providers-page.tsx`
  - Remove the obsolete Agents Switch placeholder page module after its route is replaced.

## Findings

None.

## Dependencies

None.

## Deliverables

- A non-navigable, collapsible Agents Switch parent item.
- A nested Providers navigation item.
- The `/agents-switch/providers` route.
- The `/agents-switch` redirect.
- A Providers title-only placeholder page.
- A route-derived selected state on the Providers child without a competing parent selection background.

## Acceptance Criteria

- [x] Agents Switch is collapsed by default and is not rendered as a navigation link.
- [x] Clicking Agents Switch expands and collapses the Providers child item.
- [x] Clicking Providers navigates to `/agents-switch/providers` without reloading the renderer.
- [x] The Providers page displays a `Providers` heading.
- [x] Direct navigation to `/agents-switch` redirects to `/agents-switch/providers`.
- [x] The Agents Switch expanded state remains unchanged when switching to Dashboard or Skills and back within the same application session.
- [x] Agents Switch remains visually neutral because it is an expandable group rather than a page.
- [x] Providers is selected only on `/agents-switch/providers`.
- [x] Providers uses a compact nested-item size that preserves a clear visual hierarchy.
- [x] Dashboard, Skills, unknown-route redirect behavior, sidebar resizing, drag regions, and scrolling continue to work.
- [x] No new dependency, IPC API, custom icon, or styling system is introduced.

## Out of Scope

- Providers functionality or provider data.
- Additional Agents Switch sub-navigation items.
- Persisting expansion across application restarts.
- Mobile navigation changes.
- Automated test infrastructure.

## Handoff

After completion, the renderer will have a stable nested Agents Switch navigation and Providers route placeholder for a future Providers functionality plan.

## Verification

- `pnpm exec tsc --noEmit -p tsconfig.node.json --composite false` passed.
- `pnpm exec tsc --noEmit -p tsconfig.web.json --composite false` passed.
- `pnpm exec eslint src/renderer/src src/main src/preload` passed with existing configuration deprecation warnings.
- `pnpm exec electron-vite build` passed.
- `git diff --check` passed.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` could not complete through their package scripts because the existing `package.json` declares conflicting `packageManager` and `devEngines.packageManager` settings; npm 11 rejects the package-manager mismatch, and the lint script also scans generated `out/` files.
- Manual source/API verification confirmed the nested `SideNavItem` is an uncontrolled collapsed-by-default button, Providers uses the React Router link, route selection is pathname-derived, and the parent component preserves expansion state across in-app route changes.

## Maintenance Adjustments

### 2026-08-03: Refine Nested Navigation Emphasis

- Change: Removed the selected state from the Agents Switch disclosure and changed Providers to the small `SideNavItem` size while keeping Providers as the only selected route item.
- Previous state: Agents Switch and Providers both rendered full selected backgrounds on `/agents-switch/providers`, and Providers used the default medium size.
- Reason: The competing selected surfaces made the parent-child hierarchy visually heavy and unclear.
- Documentation impact: Updated the Plan 005 Scope and Decisions, plus this task's Detail, Deliverables, and Acceptance Criteria.
- Verification: `./node_modules/.bin/tsc --noEmit -p tsconfig.web.json --composite false`, `./node_modules/.bin/eslint src/renderer/src/app.tsx`, `./node_modules/.bin/electron-vite build`, and `git diff --check` passed. Runtime screenshot verification was unavailable because the sandbox denied binding the Electron development server to `::1:5173`.
