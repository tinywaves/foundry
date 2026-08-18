# Task 001: Replace Data with the About Settings Experience

## Status

`completed`

## Goal

Replace the unfinished Data destination in Settings with a complete About experience that presents Foundry's product identity, installed version, license, author, contact email, and fixed project links while preserving all established Settings and Appearance behavior.

## Detail

Keep the implementation focused on the existing shared Foundry API contract, preload bridge, and Settings page. Preserve the canonical `/settings` route, full-window ownership, source-aware Back behavior, shared sidebar resize configuration and persisted width, platform-aware window-drag regions, Appearance color-mode controls, immediate theme updates, and asynchronous theme persistence.

Extend the shared `FoundryApi` contract with a required read-only `applicationVersion: string` value. Import the root `package.json` metadata in preload, whose TypeScript configuration already enables JSON-module resolution, and expose its `version` value while constructing the existing context-bridged API. This keeps `package.json` as the single version source used by packaging and the renderer-visible About content, prevents a handwritten renderer version from becoming stale, and avoids a new IPC channel, asynchronous request, loading state, or failure state. Do not expose the full package metadata object or any mutable native capability.

In Settings, replace the page-local `appearance | data` section union with `appearance | about`. Keep `appearance` as the initial value on every mount. Replace the Data `SideNavItem` and Lucide `Database` icon with an About `SideNavItem` and Lucide `Info` icon, using the same Astryx-owned interaction and selected-state behavior. Remove `DataSettings` and the exact `Hello world` placeholder completely. Selecting About must continue to update only local renderer state without changing the URL, React Router state, application context, local storage, or database.

Compose About inside the same top-aligned, scrollable, width-constrained content frame used by Appearance. Keep `About` as the visible accessibility-level-one heading followed by the established Divider. Build an unframed Astryx composition rather than a Card. Reuse `resources/icon.png` through the renderer asset import mechanism already used by the application sidebar. Present the icon with stable token-based dimensions beside or above the `Foundry` product name and the exact description `An AI-native local developer runtime for tools, skills, agents, and workflows.`. Treat the icon as decorative because the adjacent product name supplies its accessible identity, and retain explicit intrinsic image dimensions to prevent layout shift.

Use an Astryx `MetadataList` with labels positioned above values so the content remains readable when the inline Settings sidebar leaves a narrow content pane. Render the following exact metadata entries: `Version` with `globalThis.api.applicationVersion`, `Author` with `tinywaves`, `Email` with a link labeled `dhzhme@gmail.com`, and `License` with the plain text `Apache-2.0`. Do not add copyright text, copy actions, a license destination, or other contact methods.

Add a compact, unframed Project Links section containing standalone Astryx links labeled `GitHub Repository` and `Releases`. Use the fixed destinations `https://github.com/tinywaves/foundry` and `https://github.com/tinywaves/foundry/releases`. Render these external links, and the `mailto:dhzhme@gmail.com` email destination, through native anchor semantics rather than the root React Router `LinkProvider`; mark them as external destinations so Astryx supplies safe new-window semantics and the existing main-process `setWindowOpenHandler` denies in-window navigation and delegates them to `shell.openExternal`. Keep all destinations as module-owned constants and accept no renderer or user input. If the operating system cannot handle a destination, preserve the current behavior: the Foundry page remains open and no About-specific notification or retry is added.

Use existing Astryx components and props for layout and content. Apply StyleX only for the product image constraints that component props cannot express, using existing design tokens without raw color or pixel styling. Use no raw layout `div` or `span`, standalone CSS, hand-authored SVG, new dependency, route change, database change, or main-process API expansion.

Repository policy prohibits renderer component, DOM, screenshot, browser, accessibility-tree, and desktop-automation tests. The section switch remains component-local UI behavior and the version addition is a required typed preload value with no branching pure logic, so do not create a speculative model solely for testability. Verify the task through the existing automated behavior suite, TypeScript, ESLint, production build compilation, static integration inspection, and user-performed visual acceptance.

## Findings

None.

## Dependencies

- The root `package.json` remains the authoritative version source shared by packaging and the preload bundle.
- The existing shared `FoundryApi` contract and context-isolated preload bridge provide the constrained renderer boundary.
- The existing Settings page provides local section selection, the Astryx frame, and preserved Appearance behavior.
- The existing main-process window-open handler and Electron `shell.openExternal` integration provide controlled native handling for fixed external links.
- Existing `@astryxdesign/core`, `lucide-react`, StyleX, React, React Router, and packaged application assets provide all required implementation capabilities. No new dependency is required.

## Deliverables

- A required renderer-visible `applicationVersion` value sourced from the root package metadata through the existing typed preload bridge.
- An About `SideNavItem` replacing Data while retaining Appearance as the mount-time default.
- Complete removal of the Data section and `Hello world` placeholder.
- An unframed About content composition with the Foundry icon, product name, and approved description.
- A narrow-window-safe metadata list for Version, Author, Email, and License.
- Fixed GitHub Repository, Releases, and email destinations delegated to the appropriate system application.
- Preserved Settings routing, Back navigation, sidebar behavior, Appearance behavior, theme persistence, and platform-aware drag regions.

## Acceptance Criteria

- [x] Settings no longer displays a Data destination, Data heading, Lucide Database navigation icon, or `Hello world` placeholder.
- [x] Appearance remains the selected section whenever Settings mounts.
- [x] Selecting About updates the active Settings content without changing `/settings`, React Router navigation state, persisted application state, or database state.
- [x] Leaving and reopening Settings resets the active section to Appearance rather than restoring About.
- [x] About displays its visible accessibility-level-one heading in the existing top-aligned, scrollable, width-constrained content frame.
- [x] About displays the packaged Foundry icon, the product name `Foundry`, and the exact approved English description without creating a marketing-style hero or outer Card.
- [x] About displays the installed application version from the root package metadata through a required typed preload value rather than a renderer hardcoded version.
- [x] About displays Author as `tinywaves`, Email as `dhzhme@gmail.com`, and License as plain text `Apache-2.0`.
- [x] The email address opens `mailto:dhzhme@gmail.com` through the system default mail application without replacing the Foundry page.
- [x] GitHub Repository opens `https://github.com/tinywaves/foundry` and Releases opens `https://github.com/tinywaves/foundry/releases` through the system default browser without replacing the Foundry page.
- [x] Every external destination is fixed by the application, uses native anchor semantics rather than React Router navigation, and continues through the existing main-process window-open control.
- [x] If the operating system cannot handle an external destination, the About page remains open and no About-specific error, retry, or update behavior is introduced.
- [x] The metadata and links remain readable and can wrap or scroll without overlap when the inline Settings sidebar leaves a narrow content pane.
- [x] Existing source-aware Back navigation, direct-entry Dashboard fallback, shared sidebar sizing and persistence, platform-aware drag regions, Appearance controls, immediate color-mode updates, System mode behavior, and theme persistence remain unchanged.
- [x] No nested Settings route, section persistence, update check, copy action, privacy content, third-party license inventory, copyright text, additional contact method, dependency, IPC channel, database change, or main-process capability is introduced.
- [x] The implementation introduces no raw layout `div` or `span`, standalone CSS, hardcoded color, raw pixel styling, hand-authored SVG, or use of Avatar for the product logo.
- [x] Type checking, linting, the complete automated test suite, production build, and static diff inspection pass.

## Out of Scope

- Data import, export, cleanup, backup, database administration, or other functional Data settings.
- Automatic or manual update checks and changes to the application-update subsystem.
- Copy actions for version, author, email, license, or links.
- Privacy policies, third-party license inventories, standalone legal pages, copyright text, additional contact methods, or social accounts.
- A separate Apache-2.0 license destination.
- Nested Settings routes, section deep links, or persisted Settings section selection.
- Changes to Appearance, color-mode persistence, Settings Back behavior, sidebar resizing, or application navigation outside replacing Data with About.
- A new IPC channel, asynchronous application-metadata loading, About-specific failure feedback, or any additional native capability.
- New dependencies, another styling system, application launch, renderer component tests, DOM assertions, visual snapshots, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Completing Task 001 completes Plan 032. Settings will retain its established frame and functional Appearance section while replacing the intentionally deferred Data placeholder with a complete About experience backed by authoritative version metadata and controlled fixed external destinations.

## Verification

- `pnpm typecheck` — Passed for the node and renderer TypeScript projects.
- `pnpm lint` — Passed with only the repository configuration's existing stylistic deprecation warnings.
- `pnpm test` — Passed 26 test files and 158 tests.
- `pnpm build` — Passed the node and renderer type checks and the Electron Vite production builds for main, preload, and renderer.
- `git diff --check` — Passed.
- Static contract inspection — Passed: `FoundryApi.applicationVersion` is required, preload exposes only `packageMetadata.version`, the production preload bundle contains version `0.2.1`, and renderer content reads the bridged value without duplicating the current version.
- Static Settings inspection — Passed: Appearance remains the local mount-time default; About replaces Data without route, navigation-state, persistence, or database changes; all approved identity, metadata, contact, and project-link content is present; and no excluded control or content was introduced.
- Static external-link inspection — Passed: the email, GitHub Repository, and Releases destinations are fixed module-owned values, use native anchor semantics with Astryx external-link handling, bypass React Router, and continue through the existing main-process window-open handler.
- Static styling inspection — Passed: the About composition uses Astryx layout and content components, StyleX uses an existing spacing token only for the product image, text can wrap within the fill stack item, and no raw layout `div` or `span`, standalone CSS, hardcoded color, raw pixel style, hand-authored SVG, outer Card, or product-logo Avatar was introduced.
- Existing test fixtures that construct the complete `FoundryApi` contract now provide the required deterministic test version `0.0.0-test`; no renderer component, DOM, visual, route-tree, or StyleX test was added.
- User-performed visual acceptance remains pending. No application launch, browser automation, screenshot, accessibility-tree inspection, or desktop automation was performed, per repository rules.
