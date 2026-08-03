# Task 001: Establish Renderer Routing Foundation

## Status

`completed`

## Goal

Establish the renderer-owned routing foundation and route-level page structure that the sidebar navigation can consume in Task 002.

## Detail

Add `react-router` as a runtime dependency and use its declarative routing APIs directly. The renderer entry point in `src/renderer/src/main.tsx` will wrap `App` with `HashRouter` inside the existing Astryx `Theme` provider so route state works with Electron's packaged `file://` loading while preserving the current theme and strict-mode boundaries. `react-router-dom` will not be added because React Router v8 exposes the required web declarative APIs from `react-router`.

Define shared renderer route paths for Dashboard (`/`), Skills (`/skills`), and Agents Switch (`/agents-switch`) so the route table created in this task and the sidebar links added in Task 002 use the same path contract.

Keep `AppShell`, the resizable `SideNav`, both platform-dependent `WindowDragRegion` placements, and the existing shell sizing and scrolling behavior outside the route switch. The `AppShell` content region will render a `Routes` table:

- Dashboard at `/`, containing the existing Tokyo Markdown example and its current sources.
- Skills at `/skills`, containing title-only placeholder page content built from existing Astryx components.
- Agents Switch at `/agents-switch`, containing title-only placeholder page content built from existing Astryx components.
- A catch-all route that redirects unknown locations to Dashboard with `<Navigate replace>`.

The route pages remain renderer-only and do not import Electron main-process or Node.js modules. This task does not add route data APIs, loading states, route error boundaries, scroll restoration, persistence, or navigation controls. The sidebar remains a non-navigating placeholder until Task 002 connects it to the shared route paths.

## Findings

None.

## Dependencies

### `react-router`

- Purpose: Provide hash-based declarative routing, route matching, and replacement redirects for the Electron renderer.
- Selected version: `^8.3.0`
- Module format: ESM.
- TypeScript: Bundled type declarations.
- Compatibility: Requires Node.js `>=22.22.0` and React and React DOM `>=19.2.7`; the project uses Node.js `24.18.0`, and the current lockfile resolves React and React DOM `19.2.8`.
- Maintenance: `8.3.0` was the current release when checked on August 3, 2026, with active releases in the official package history.
- Adoption: npm reported approximately 194 million downloads in the preceding 30 days when checked on August 3, 2026.
- Security and license: MIT licensed. The OSV package query for `react-router@8.3.0` returned no known advisories when checked on August 3, 2026.
- Alternatives: `react-router-dom` was rejected because its latest release remained on the v7 line and React Router v8 documents declarative web installation from `react-router`. `wouter` was rejected because the requested and approved routing library is React Router.
- Sources checked: Official React Router v8 documentation, npm package metadata, and OSV package query on August 3, 2026.

## Deliverables

- Updated runtime dependency manifest and lockfile containing `react-router@^8.3.0`.
- A `HashRouter` boundary in the renderer entry point.
- Shared renderer route-path definitions for Dashboard, Skills, and Agents Switch.
- Route-level Dashboard, Skills, and Agents Switch pages.
- A renderer route table with replacement fallback navigation to Dashboard.
- The existing Tokyo Markdown example relocated intact into the Dashboard page.

## Acceptance Criteria

- [x] Starting the renderer at its default hash location displays Dashboard at `/`.
- [x] Dashboard displays the existing Tokyo Markdown example and source metadata.
- [x] `/skills` displays a title-only Skills placeholder page.
- [x] `/agents-switch` displays a title-only Agents Switch placeholder page.
- [x] An unknown route redirects to `/` using replacement navigation and displays Dashboard.
- [x] The existing `AppShell`, `WindowDragRegion`, sidebar resizing configuration, and platform-specific drag-region behavior remain intact.
- [x] Routing remains entirely within the renderer without main-process, preload, IPC, or Electron window configuration changes.
- [x] The shared route paths are available for Task 002 to connect sidebar links and selected states without redefining route strings.

## Out of Scope

- Sidebar links, icons, click behavior, or route-derived selected states.
- Production Skills or Agents Switch functionality.
- Route data loading, pending UI, error boundaries, scroll restoration, or persisted route state.
- Main-process, preload, IPC, Electron window, or packaging changes.
- New automated test infrastructure.

## Handoff

Task 002 will consume the shared route paths and established `HashRouter` context to replace the sidebar placeholder with Dashboard, Skills, and Agents Switch `SideNavItem` links using existing Astryx-compatible icons and route-derived selected states.

## Verification

- `pnpm typecheck`: Did not reach TypeScript because the existing script invokes `npm`, which rejects the repository's pnpm-only `devEngines.packageManager` declaration.
- `pnpm typecheck:node`: Passed.
- `pnpm typecheck:web`: Passed.
- `pnpm lint`: Did not complete because the existing unscoped command linted generated `out/main/index.js` without typed parser configuration.
- `pnpm exec eslint src/renderer/src`: Passed with existing ESLint configuration deprecation warnings.
- `pnpm exec electron-vite build`: Passed for main, preload, and renderer.
- `git diff --check`: Passed.
- Manual route interaction verification was left to the user as agreed.
