# Task 002: Build Runtime Provider Navigation and Table

## Status

`completed`

## Goal

Build the read-only Providers page foundation that loads and displays real Provider summaries in fully isolated Codex and Claude Code runtime views, ready for the create, edit, and row actions added by the following tasks.

## Detail

Replace the current Providers title placeholder with a runtime-scoped data surface. The page will default to the Codex runtime and render Codex and Claude Code through Astryx `TabList` and `Tab` components. Selecting a tab immediately requests the active Providers for that runtime through `globalThis.api.providers.listProviders(runtime)`. The page must ignore stale asynchronous responses after rapid tab changes so a response for one runtime can never populate the other runtime's view.

The selected runtime's Providers will render in an edge-to-edge Astryx `Table` without a surrounding Card. The table will use explicit column sizing and horizontal overflow for narrow windows. It will not add search, sorting, pagination, selection, or bulk operations. Task 002 will render these columns:

- Name: an Astryx `Avatar` and the Provider name. The name is not clickable and is not an edit trigger.
- Base URL: the persisted Provider endpoint.
- API key: `Not set` when no key exists, otherwise a passive masked representation derived only from `hasApiKey` and `apiKeySuffix`. This task never requests the complete key.
- Status: an Astryx `StatusDot` paired with visible `Never tested`, `Connected`, or `Failed` text.
- Last tested: a locally formatted persisted timestamp, or `Never` when no test has run.

When a Provider has a remark or official website, hovering or keyboard-focusing its Name presentation will open an Astryx `HoverCard` containing only the metadata that exists. A Provider with neither value will not receive an empty HoverCard. Website links will use the validated persisted URL, open in a new window, and rely on the existing main-process window-open policy to hand external navigation to the system browser.

Rows without a custom image will immediately use the Astryx default avatar rather than generated initials. After a successful list response, the renderer will request only rows marked with `hasCustomAvatar` through `globalThis.api.providers.getProviderAvatar(id)`. Custom avatar requests will run independently so they do not block the table. Returned bytes will become renderer-owned object URLs. The page will revoke replaced or abandoned object URLs on runtime changes and component unmount. An individual avatar failure falls back to the default avatar without failing the Provider list.

The page will provide stable, explicit request states. Initial loads and runtime changes will preserve the table structure with Skeleton rows. A successful empty response will show an EmptyState that identifies the selected runtime but has no inactive call to action. A failed list request will clear data associated with that failed request and show an Astryx Banner with a Retry command. Retry reloads the currently selected runtime. Late success or failure results from an obsolete request must not replace the active runtime's loading, empty, data, or error state.

This task intentionally stops at a functional read-only page. It will not render dead Add provider, MoreMenu, Copy, Reveal, Delete, or Test connection controls. Task 003 will add the header Add provider action and Edit workflow. Task 004 will add Copy, Reveal, Delete, and connection-testing behavior. Renderer code may extract focused page-local components or hooks when they clarify request and avatar lifecycle ownership, but it will not introduce speculative abstractions for those later workflows.

All renderer work will use Astryx components, StyleX, and existing design tokens. It will not add standalone CSS, raw layout elements, a new dependency, or changes to the main process, preload bridge, SQLite schema, or shared Provider contract.

## Findings

None.

## Dependencies

None.

## Deliverables

- A Providers page with Codex and Claude Code runtime tabs and Codex selected initially.
- A real, runtime-scoped Provider table backed by the existing typed preload list API.
- Provider Name cells with custom-avatar resolution, Astryx default-avatar fallback, and optional metadata HoverCards.
- Passive API-key, connection-status, and last-tested summary presentation.
- Stable loading, empty, request-failure, retry, and individual avatar-failure states.
- Renderer-owned asynchronous request and object-URL lifecycle handling that prevents runtime data leakage and avatar resource leaks.

## Acceptance Criteria

- [x] Opening the Providers page selects Codex and requests only active Codex Providers.
- [x] Switching between Codex and Claude Code shows only the selected runtime's Providers, including during rapid repeated switching and out-of-order responses.
- [x] The table displays Name, Base URL, masked API key state, connection status, and last-tested information without requesting a complete API key.
- [x] Name cells display stored custom avatars when available and the Astryx default avatar otherwise; an individual avatar-load failure does not fail the table.
- [x] Hovering or focusing a Name with metadata presents its available remark and official website, while a Name without metadata has no empty popover and is never an edit trigger.
- [x] Website activation is constrained to the persisted validated URL and delegates external opening through the existing Electron policy.
- [x] Loading, empty, and list-error states are visually distinct, Retry reloads the active runtime, and obsolete requests cannot overwrite the current state.
- [x] Custom-avatar object URLs are revoked when replaced, abandoned by a runtime change, or released on page unmount.
- [x] The table remains usable in a narrow content area through horizontal overflow without adding sorting, search, pagination, selection, or bulk actions.
- [x] No inactive Add provider or row-action controls are rendered before their owning tasks.
- [x] The implementation uses Astryx, StyleX, and existing design tokens without a new dependency or changes to the approved persistence and preload contracts.
- [x] Type checking and linting pass for the completed renderer change.

## Out of Scope

- Creating or editing Providers, including the Add provider button, Edit MoreMenu item, and dialogs owned by Task 003.
- Copying or revealing complete API keys, deleting Providers, or testing connections, which are owned by Task 004.
- Requesting complete Provider details or complete API keys.
- Changing Provider persistence, IPC handlers, preload APIs, validation, migrations, or shared contracts.
- Applying a Provider to either runtime or modifying external runtime configuration.
- Search, sorting, pagination, selection, and bulk actions.
- Visual acceptance through application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 003 will consume the runtime selection state, Provider-list loading boundary, table structure, avatar presentation, and refresh path established here. It will add the header Add provider action, Add/Edit dialogs, and an Edit row action, then refresh the existing selected-runtime list after successful mutations without changing the read-only contracts established by this task.

## Verification

- `pnpm typecheck` was attempted but its existing `npm run` delegation was rejected by the repository's pnpm-only `devEngines.packageManager` policy before TypeScript ran. The equivalent `pnpm typecheck:node` and `pnpm typecheck:web` commands passed.
- `pnpm lint` was attempted but scanned generated `out/` files that lack typed parser configuration. The repository-wide source check `pnpm exec eslint . --ignore-pattern out --ignore-pattern dist` passed.
- `pnpm build` encountered the same existing `npm run typecheck` package-manager rejection before reaching electron-vite. After the equivalent type checks passed, `pnpm exec electron-vite build` completed successfully for main, preload, and renderer bundles.
- `git diff --check` passed.
- Static inspection confirmed that Task 002 renderer code calls only `listProviders(runtime)` and `getProviderAvatar(id)`.
- Static inspection confirmed that every request is runtime-and-revision scoped, stale responses are ignored, and each effect-owned object URL map is revoked on replacement, runtime or retry cleanup, and unmount.
- Static inspection confirmed that the Task 002 renderer files contain no raw layout `div` or `span`, standalone CSS imports, hardcoded color values, or inactive later-task controls.
- Visual acceptance was not run because repository policy reserves application launch and visual inspection for the user.
