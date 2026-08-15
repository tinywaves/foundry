# Task 001: Establish Sibling Route Layouts

## Status

`completed`

## Goal

Move the existing standard shell and page routes into a router-level layout branch, establish a sibling full-window layout branch, and preserve current production routing behavior until Task 002 moves the Prompt editor routes.

## Detail

Create a renderer router module that owns the route-object configuration used by `createHashRouter`. Register two top-level, pathless sibling route layouts with stable route IDs: `AppShellLayout` for ordinary application pages and `FullWindowLayout` for routes that require the complete application window. Keep the route collections internal to the router module and verify their ownership through static inspection and production compilation rather than renderer UI tests. Keep `main.tsx` focused on application providers and `RouterProvider`; remove the obsolete `App` root once its shell and route responsibilities have moved to their explicit owners.

Move the current `AppShell`, SideNav composition, navigation selection logic, macOS SideNav drag region, skip link, and main-content boundary into `src/renderer/src/layouts/app-shell-layout.tsx`. Replace the nested `<Routes>` tree with `<Outlet />`. Register every current production route as a child of this layout during Task 001, including New Prompt and Edit Prompt, so all current pages, redirects, deep links, scrolling, and fallback behavior remain in the standard shell until Task 002. Keep the wildcard redirect inside the standard-shell branch so an unknown URL continues to render through the standard shell and redirect to Dashboard.

Add `src/renderer/src/layouts/full-window-layout.tsx` as a domain-agnostic full-window boundary. It will fill the renderer root, render the existing full-width `WindowDragRegion` as the first row only when `globalThis.api.platform` is `darwin`, and provide a focusable main-content region that fills the remaining space and renders `<Outlet />`. Windows and Linux will omit the custom drag row. The layout will not import Prompt pages, Prompt route constants, or Prompt state, and it will not own domain headers, navigation controls, or page-specific scrolling. Its main region will preserve the minimum-size constraints required by nested fill layouts without forcing an outer scroll container, allowing future full-window pages to own their content scrolling and avoiding double scrolling for the Prompt editor.

Register the full-window sibling branch with no production business children in Task 001. This keeps the architecture present without moving Prompt New/Edit prematurely. Static route inspection confirms that current explicit routes and the standard-shell wildcard remain under `AppShellLayout`; Task 002 can later relocate the exact Prompt editor route registrations into the sibling full-window branch.

Extract the current Skip to Main Content trigger into the smallest shared renderer component used by both layouts. Both layouts may target the same `main-content` identifier because sibling route matching ensures they are mutually exclusive and never mount duplicate landmarks. Preserve the standard shell's existing keyboard skip behavior.

Extend the existing SideNav resize configuration with a stable Foundry-owned `autoSaveId`. Keep the current default width of `200`, minimum width of `200`, and maximum width of `400`. Rely on Astryx's existing localStorage persistence and fallback behavior rather than adding application-owned resize state: a saved width is restored after layout remounts and application restarts, while missing, unavailable, malformed, or out-of-range storage falls back to or is constrained by the existing resize configuration.

Verify through static inspection that the router has exactly the two intended top-level layout branches, every current canonical and parameterized route remains registered under the standard-shell branch, New/Edit Prompt remain standard-shell routes in Task 001, unknown paths retain the standard-shell fallback, and the full-window branch has no production child routes yet. Keep existing pure route-path and destination-selection tests unchanged except where imports need to follow the new router ownership.

Preserve the existing Vitest Node environment and test include configuration without adding test-only renderer aliases or StyleX runtime infrastructure. Renderer automated tests remain limited to functional behavior, models, and pure functions; route-layout UI composition is verified through type checking, linting, production builds, and static inspection.

## Findings

None.

## Dependencies

None.

## Deliverables

- A renderer-owned route-object configuration with sibling standard-shell and full-window layout branches.
- An `AppShellLayout` containing the existing application shell, SideNav, navigation state, and an `<Outlet />` for standard pages.
- A domain-agnostic `FullWindowLayout` with platform-aware window dragging, a full-window main-content boundary, and an `<Outlet />`.
- A shared Skip to Main Content component used by both mutually exclusive layouts.
- SideNav width persistence through a stable Astryx `autoSaveId` while preserving the existing width bounds.
- The complete current page, redirect, deep-link, and fallback route set under `AppShellLayout`.
- An empty production full-window child-route collection ready for Task 002.
- Static verification of the top-level layout registrations and the Task 001 route boundary.
- The existing Vitest environment and include boundary, without renderer UI aliases or StyleX runtime test support.

## Acceptance Criteria

- [x] The renderer router registers `AppShellLayout` and `FullWindowLayout` as two top-level sibling branches.
- [x] No application root or layout contains Prompt-specific full-window activation logic.
- [x] Each current URL matches exactly one top-level layout branch.
- [x] Every current page, including New Prompt and Edit Prompt, still renders through `AppShellLayout` after Task 001.
- [x] Existing redirects, direct deep links, and unknown-path fallback behavior remain unchanged.
- [x] `AppShellLayout` renders standard page routes through `<Outlet />`.
- [x] The standard SideNav retains its content, selection behavior, resize bounds, and macOS drag region.
- [x] A resized SideNav width is restored after layout remounts and application restarts.
- [x] Missing, unavailable, malformed, or out-of-range SideNav persistence data safely falls back to or is constrained by the existing `200` to `400` width configuration.
- [x] `FullWindowLayout` fills the application window and renders child content through `<Outlet />`.
- [x] On macOS, `FullWindowLayout` begins with the existing full-width `WindowDragRegion`.
- [x] On Windows and Linux, `FullWindowLayout` renders without an additional custom drag row.
- [x] `FullWindowLayout` has no Prompt page, Prompt route, or Prompt state dependency.
- [x] No production page uses `FullWindowLayout` at the end of Task 001.
- [x] Task 002 can move New/Edit Prompt by relocating their route definitions without changing the application root or either layout contract.
- [x] No dependency, IPC, preload, or main-process changes are introduced.

## Out of Scope

- Moving New Prompt or Edit Prompt into `FullWindowLayout`.
- Adding the Back to Prompts trigger.
- Changing Create/Edit Cancel navigation.
- Modifying the Prompt editor header, History action, form, loading state, validation, persistence, save, version, restore, or confirmation behavior.
- Adding a second full-window business consumer.
- Adding a drawer, overlay, animation, gesture, plugin system, or dynamic route registry.
- Launching the application or using screenshots, browser automation, accessibility-tree inspection, or desktop automation for visual acceptance.

## Handoff

Task 002 will consume the registered `FullWindowLayout` branch by moving the New/Edit Prompt route definitions from the standard route collection into the full-window route collection. It will then implement the Prompt-owned Back and Cancel behavior without changing `main.tsx`, the standard-shell boundary, or the full-window layout contract.

## Verification

- Initial completion evidence before the maintenance adjustment: `pnpm test` passed 21 test files and 136 tests, including four focused sibling-layout route matching tests.
- `pnpm typecheck` passed for the node and renderer TypeScript projects.
- `pnpm lint` passed; ESLint emitted only the repository configuration's existing stylistic deprecation warnings.
- `pnpm build` passed for the main, preload, and renderer production bundles.
- `git diff --check` passed.
- Initial React Router `matchRoutes` coverage confirmed the two top-level layout branches, exclusive standard-shell matching for every current route, Prompt New/Edit placement, unknown-path fallback behavior, and the empty production full-window child-route collection before the renderer UI route tests were removed.
- Static inspection confirmed `<Outlet />` ownership, the absence of Prompt-specific layout coupling and nested JSX route trees, the stable SideNav `autoSaveId`, shared skip-link targets, and platform-specific drag-region conditions.
- No application launch, screenshot, browser automation, accessibility-tree inspection, or desktop automation was performed, per repository UI verification rules.

## Maintenance Adjustments

### 2026-08-15 02:16:35: Remove Renderer UI Route Tests

- Change: Removed renderer UI route tests and test-only alias/StyleX infrastructure; added the renderer pure-function testing policy to `AGENTS.md`.
- Previous state: `router.test.ts` imported the rendered route configuration; Vitest used renderer aliases and a StyleX runtime stub; Task 001 completion verification recorded 21 test files and 136 tests.
- Reason: The user requires renderer automated tests to cover functional behavior and pure logic only, not UI components or styling.
- Documentation impact: Synchronized the Plan 024 index and Task 001 current-state and verification statements.
- Verification: `pnpm test` passed 21 test files and 135 tests; `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
