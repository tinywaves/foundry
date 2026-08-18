# Task 005: Build the Store and Targets Inventory Experience

## Status

`completed`

## Goal

Replace the Skills unavailable state with searchable Store inventory and physical Target inventory that activate observation only while the Skills area is open.

## Findings

- The Astryx inventory workflow selected `TabList` for Store and Targets navigation, `Toolbar` plus `TextInput` for contextual controls, an edge-to-edge compact `Table` for Store packages, and an edge-to-edge divided `List` for physical Targets. Inventory rows are not wrapped in Cards.
- `StatusDot` presents Store observation facts, while `Token` presents enumerated Target policy, availability, counts, Legacy metadata, and derived installation-state counts. Application-authored actions use Lucide icons and every `IconButton` includes a tooltip.
- The Skills route layout exclusively owns Watch Session startup, exact-token cleanup, and `skills:changed` subscription. Its pure lifecycle helper ends late begin results after unmount, including React development remount races.
- TanStack Query uses one `skills` key namespace. Notifications and completed mutations invalidate only that namespace, active reads preserve cached inventory during refetch, transient reads retry once, and mutations never opt into retry.
- The Store view filters locally by the stable Distribution Name, exposes one-shot automatic import, reports imported and adopted counts plus partial warnings, and distinguishes initial, empty, refreshing, partial, and terminal states without a dedicated Retry control.
- The Targets view aggregates unique physical Target rows with neutral Generic branding, available runtime brand assets, a generic fallback for Hermes, and Codex Legacy ordered last. Its official documentation action remains ID-only and is resolved and opened by the main process.
- Built-in policy reset re-resolves adapter definitions in the main process. Custom directory selection remains opaque, window-owned, and single-use; removing custom configuration remains blocked by active installations and never removes Target content.

## Dependencies

Task 004.

## Work

Before writing renderer UI, run the Astryx workflow required by `AGENTS.md`: start with `pnpm exec astryx build "local skill store and distribution target management"`, inspect named page and block templates, inspect every selected component, and consult layout and token documentation. Record the chosen components in the task Findings before implementation.

Add pure route constants for the Skills root and future package/target detail routes, then keep all Skills routes under one session-owning layout. The layout begins a Watch Session on mount, ends its exact token on unmount, subscribes to `skills:changed`, and invalidates only Skills query keys. Handle React development remounts and late promises without leaking sessions. Do not start observation from `foundry-application.tsx`, the sidebar, or application startup.

Add Skill-specific TanStack Query keys, result adapters, bounded retry rules, cache invalidation helpers, and pure search/state presentation models. Reads may retry once only for transient storage, filesystem, or internal failures. Mutations do not retry automatically. Change notifications invalidate observations rather than trying to reproduce filesystem state in renderer caches.

Build a quiet, dense Skills workspace with Store and Targets views. Store is the default and package-centric. Its header contains Search, `Import Existing`, and navigation reserved only for implemented destinations. Search filters by displayed package name and Distribution Name locally without changing identity. Render package data as edge-to-edge rows or a table, not nested cards. Show Store missing/unreadable observations directly and avoid Valid, Compatible, Trusted, Safe, or audit labels.

Targets lists de-duplicated physical destinations with generic or runtime branding, readable display paths, configured availability, package count, and observed installation-state counts. Use neutral branding for `.agents`, runtime brand icons for native targets, and place Codex Legacy last with a Legacy hint and official documentation action. Do not show which runtimes consume the Generic Target.

Expose scan depth and access-boundary controls for built-in and Custom Targets, including reset-to-adapter-default for built-ins. Custom Targets additionally support add and remove through the controlled main-process directory picker. Removing custom configuration must be blocked while it owns active installations; it must not delete target content.

`Import Existing` runs the one-shot scan, preserves existing inventory during refresh, disables duplicate submission, and reports imported/adopted counts plus partial warnings. Initial, empty, refreshing, partial-failure, and terminal-failure states need direct feedback without a dedicated Retry control.

Add only pure renderer tests: query keys and retry classification, search filtering, state-to-presentation mapping, target ordering, Legacy metadata, session lifecycle helper behavior, and cache invalidation decisions. Do not import React components, StyleX, or the route tree in tests.

## Deliverables

- Session-owning Skills route boundary.
- Store and Targets navigation and inventory.
- Store search and manual `Import Existing`.
- Custom Target management.
- Pure renderer query, search, ordering, and lifecycle tests.

## Acceptance Criteria

- [x] Store opens first, is searchable, and presents packages independently of runtime installation.
- [x] Targets represent unique physical roots and use the approved neutral, native, and Legacy presentation.
- [x] Entering and leaving all Skills routes starts and ends the correct Watch Session without changing app-wide lifecycle.
- [x] `Import Existing` auto-imports without confirmation and preserves current inventory while refreshing or partially failing.
- [x] Built-in and Custom Target controls expose only supported depth and access settings through constrained APIs, and built-in overrides can return to adapter defaults.
- [x] No unfinished Discover Skills entry appears before the remote plan implements its destination.
- [x] Renderer tests remain pure and non-visual; no component, DOM, screenshot, browser, or desktop automation is added.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out of Scope

- Distribution commands, drift actions, package detail tabs, and Store Trash.
- Remote Discover Skills.

## Handoff

Task 006 adds controlled target mutations and installation actions to this inventory.

## Verification

- `pnpm test` passed 47 test files and 239 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and all main, preload, and renderer production builds.
- Pure renderer coverage includes Skills query isolation and retry classification, Store search, Store and installation presentation, physical Target ordering and aggregation, Codex Legacy metadata, Watch Session late-result cleanup, and Skills-only invalidation.
- `git diff --check` passed, and static inspection found no raw layout `div` or `span`, standalone CSS import, raw color, or pixel style in the new Skills renderer modules.
- The application was not launched and no visual automation was performed, per repository policy.
