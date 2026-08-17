# Task 002: Bootstrap the Persisted Application Color Mode

## Status

`completed`

## Goal

Restore the persisted application color mode before the renderer's first primary UI render and establish application-wide controlled theme state that the Settings experience can consume.

## Detail

Move renderer-wide Settings initialization into a one-time asynchronous bootstrap at the renderer entry module. Call Task 001's `globalThis.api.settings.getApplicationSettings()` before `createRoot` renders the primary application tree. Use the returned `light`, `dark`, or `system` preference as the initial renderer setting. Keeping the initialization outside React effects ensures development `StrictMode`, component remounts, and route changes cannot trigger duplicate database reads.

If the Settings API returns a typed failure or its IPC Promise rejects, resolve the initial preference to `system` and continue rendering the application. Do not add a Banner, Toast, Retry action, blocking error page, or other dedicated failure interaction. This silent fallback is the minimum startup behavior required to keep the application usable while the plan intentionally excludes storage-error UX.

Add a renderer-owned `ApplicationSettingsProvider` initialized with the resolved application settings snapshot. Its context exposes the current `colorMode` and a purpose-specific `updateColorMode` operation. Keep the provider focused on the approved application setting rather than adding a generic renderer settings registry, dynamic keys, or a second persistence abstraction.

Render the existing root Astryx `Theme` as a controlled consumer of the provider by passing the current application color mode through its `mode` prop. Preserve the current Foundry theme object, `StrictMode`, `QueryClientProvider`, `LinkProvider`, hash router, and DOM-aware `RouterProvider` behavior. The application-settings provider must own only the state needed to wrap the same existing application tree.

When `updateColorMode` is called, update renderer state from the selected value immediately so the root Theme and every route switch in the same interaction flow, then asynchronously invoke Task 001's `updateApplicationColorMode` API. Handle both typed API failure results and rejected Promises without an unhandled rejection. Do not show failure feedback or roll the current session back in this plan; if persistence fails, the selected mode remains active for the current session and a later application launch resolves from the last successfully stored value.

Do not use TanStack Query for this root bootstrap or controlled theme state. The preference must be available before the Query and Router UI is presented, is not remote server state, and has one application-level writer. Task 003 will consume the provider directly instead of introducing a duplicate query cache or page-local copy.

Continue delegating effective System resolution and live operating-system preference changes to Astryx. The root Theme receives `system`, while Astryx resolves the active light or dark presentation and updates its consumers. The existing lazy Prompt Markdown Source editor continues reading `useTheme().mode`, so it follows explicit and System-derived application changes without CodeMirror-specific modifications or eager loading.

Extract startup result resolution into a pure renderer model that does not import React components, route modules, StyleX, or UI code. Add focused Vitest coverage for a successful stored preference, a typed Settings API failure, and a rejected settings read. Do not render or import the provider, root application, Theme, Router, or other UI modules in renderer tests, in accordance with repository policy.

Expected file-level impact is limited to the renderer entry point and new renderer-owned application-settings state and pure model modules. Task 001's contracts and persistence boundary remain unchanged. Do not add the Settings route, sidebar entry, full-window page, Appearance section, or segmented control in this task.

## Findings

None.

## Dependencies

- Completed Task 001: Establish Database-Backed Application Settings.
- No new third-party dependency.

## Deliverables

- A one-time asynchronous renderer Settings bootstrap before the primary application tree renders.
- An application-settings context, provider, and consumer API for the current color mode and its update operation.
- A controlled root Astryx Theme driven by the restored or current application color mode.
- Immediate renderer color-mode updates followed by asynchronous database persistence without unhandled rejections.
- Focused pure-logic tests for successful startup restoration and the approved System fallback paths.

## Acceptance Criteria

- [x] The renderer reads application Settings exactly once before presenting the primary application UI, and development `StrictMode`, remounts, and route changes do not repeat the read.
- [x] A successful stored `light`, `dark`, or `system` preference becomes the initial controlled root Theme mode without first rendering primary UI in another mode.
- [x] An absent database record starts in `system` through Task 001's successful default snapshot.
- [x] A typed Settings API failure or rejected startup IPC Promise still renders the application in `system` without dedicated error interaction.
- [x] The root Astryx Theme always receives the current controlled application color mode from one renderer-owned provider.
- [x] Updating the color mode changes renderer state immediately and invokes the approved database persistence operation.
- [x] A typed persistence failure or rejected update Promise creates no unhandled rejection, dedicated error UI, or session rollback; the current session retains the selected mode.
- [x] Astryx continues resolving `system` from live operating-system preference changes, while explicit `light` and `dark` modes remain fixed.
- [x] The lazy Prompt Markdown Source editor continues following Astryx's resolved mode without CodeMirror changes or eager loading.
- [x] The existing Foundry theme definition, Query client, Link provider, hash router, DOM-aware Router provider, and route behavior remain unchanged outside controlled Theme ownership.
- [x] Focused pure-logic tests, type checking, linting, the full test suite, production build, diff validation, and static integration inspection pass without renderer component tests or visual automation.

## Out of Scope

- The Settings route, sidebar entry, full-window page, Back navigation, Appearance group, or segmented control.
- Loading UI, error banners, Toasts, Retry actions, persistence status, or write rollback.
- TanStack Query Settings state, cross-window synchronization, or observation of external database changes.
- CodeMirror implementation changes, theme transition animation, custom themes, palettes, or other Appearance preferences.
- A generic renderer Settings registry, new dependency, new test framework, or visual-test infrastructure.
- React component rendering tests, DOM assertions, application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 003 will consume the provider's current `colorMode` and `updateColorMode` operation to build the full-window Settings route and the Appearance Theme segmented control without duplicating startup or persistence state.

## Verification

- `pnpm exec vitest run src/renderer/src/application-settings-model.test.ts` passed 1 test file and 4 tests.
- `pnpm test` passed all 25 test files and 155 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices and no new application warnings.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that `bootstrapRenderer` performs the sole Settings read before `createRoot`, outside React effects and development `StrictMode` remount behavior.
- Static inspection confirmed that one application-settings provider owns the selected mode, the root Astryx Theme receives its controlled value, and updates change local state before invoking the approved persistence API.
- Pure-model coverage confirmed that successful values are restored, typed and rejected startup failures resolve to `system`, and typed and rejected persistence failures produce no unhandled rejection.
- Static diff inspection confirmed no changes to the Prompt Markdown Source editor, Task 001's Settings contract or persistence modules, Query behavior, routes, or page modules.
- Static test inspection confirmed that the new renderer test imports only the pure application-settings model and shared types, not React components, Theme, Router, StyleX, or UI modules.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
