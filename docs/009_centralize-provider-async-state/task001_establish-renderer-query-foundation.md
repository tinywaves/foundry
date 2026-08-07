# Task 001: Establish Renderer Query Foundation

## Status

`completed`

## Goal

Install and configure TanStack Query as a stable renderer-level dependency without migrating any Provider request in this task.

## Detail

Install `@tanstack/react-query` through `pnpm add @tanstack/react-query` so pnpm resolves the current approved release and updates both `package.json` and `pnpm-lock.yaml`. If the registry's latest version has changed from the evaluated `5.101.4` before execution, pause and refresh the dependency evaluation before installing it.

Add a renderer-owned query-client module that creates and exports one module-level `QueryClient` instance. Mount `QueryClientProvider` at the renderer entry around the existing Theme, `HashRouter`, and App subtree. Keeping the client outside React rendering ensures development `StrictMode` effect replay cannot create a replacement client or discard cache state. The existing provider order may otherwise remain structurally unchanged, and this task must not alter Theme, routing, or visible UI behavior.

Configure these query defaults:

- `networkMode: 'always'`
- `retry: false`
- `refetchOnWindowFocus: false`
- `refetchOnReconnect: false`

Configure these mutation defaults:

- `networkMode: 'always'`
- `retry: false`

The `always` network mode ensures local SQLite-backed IPC operations remain available when Chromium reports the device as offline. It also allows connection-test mutations to execute immediately and report their existing main-process result instead of remaining paused in renderer state.

Do not set global `staleTime` or `gcTime`. Task 002 will define Provider-specific cache retention and sensitive-detail disposal without forcing those decisions onto future renderer features. Do not add Query Devtools, cache persistence, an error boundary, another Context, Provider result adapters, query keys, queries, mutations, or cache invalidation in this task.

This is a pure renderer TypeScript dependency with no native module or new Electron capability. No main-process, preload, IPC, SQLite, packaging, platform-specific, or visual behavior changes are required.

Repair the existing verification command plumbing required to complete this task. Replace nested `npm run` calls in the `typecheck`, `build`, and `build:unpack` package scripts with `pnpm run` so the repository's pnpm-only `devEngines` policy does not reject its own documented commands. Preserve the commands' existing ordering and behavior beyond the package-manager invocation.

Extend the existing ESLint ignore configuration to exclude the generated `dist/` and `out/` directories. ESLint 10 currently scans `out/` when `pnpm lint` runs without a path and attempts to apply typed source rules to generated JavaScript. Keep lint coverage for application source, configuration, documentation, and other existing targets unchanged. Do not modify generated files or weaken source lint rules.

## Findings

None.

## Dependencies

### `@tanstack/react-query`

- Purpose: Provide `QueryClient`, `QueryClientProvider`, and the query and mutation ownership consumed by later Plan 009 tasks.
- Selected version: `5.101.4`, expected to be recorded as the compatible range `^5.101.4` when installed without a version according to repository policy.
- Module format: A `type: module` package with explicit modern ESM import exports and maintained CommonJS require exports.
- TypeScript: Bundled modern and legacy declarations; no separate declarations package is required.
- Compatibility: Its React peer range is `^18 || ^19`, covering Foundry's React 19. The standard renderer exports are compatible with TypeScript 5.9, Vite 7, Electron's Chromium renderer, and the existing CommonJS application package boundary.
- Maintenance: Version `5.101.4` was released on 2026-07-21. The official repository was still receiving updates on 2026-08-03 and had approximately 50,076 stars when checked.
- Adoption: The npm downloads API reported 261,543,024 downloads from 2026-07-06 through 2026-08-04.
- Security and license: Exact-version OSV queries for `@tanstack/react-query` and its only runtime dependency, `@tanstack/query-core`, returned no advisories. Both packages and the official repository use the MIT license. The packages contain no install lifecycle script or native module.
- Packaging cost: The package depends only on `@tanstack/query-core`. Their registry-reported unpacked sizes total approximately 3.18 MB; production bundling remains tree-shakeable renderer JavaScript without native packaging work.
- Alternatives: SWR `2.5.0` is current, typed, MIT-licensed, and smaller, but its official mutation API states that separate `useSWRMutation` hooks do not share mutation state. TanStack Query better fits the planned row-scoped concurrent mutation inspection and explicit cache coordination. Existing React Router `8.3.0` data APIs would require replacing the declarative `HashRouter` architecture with a data router, which is unrelated scope. React primitives preserve the manual lifecycle coordination this plan is intended to remove, while general client-state stores do not provide the required query ownership and invalidation model.
- Sources checked: [npm registry metadata](https://registry.npmjs.org/@tanstack%2freact-query), [npm downloads API](https://api.npmjs.org/downloads/point/last-month/@tanstack/react-query), [TanStack Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview), [TanStack Query repository](https://github.com/TanStack/query), [OSV](https://osv.dev/), [SWR mutation documentation](https://swr.vercel.app/docs/mutation), [SWR repository](https://github.com/vercel/swr), and [React Router data-loading documentation](https://reactrouter.com/start/data/data-loading), all accessed on 2026-08-06.

## Deliverables

- Updated dependency manifest and lockfile containing the approved `@tanstack/react-query` release.
- A stable renderer-owned `QueryClient` with the approved global query and mutation defaults.
- `QueryClientProvider` mounted around the existing renderer application subtree.
- Pnpm-compatible `typecheck`, `build`, and `build:unpack` package scripts with unchanged command semantics.
- ESLint configuration that excludes generated `dist/` and `out/` artifacts while retaining existing source lint coverage.
- The persisted dependency evaluation in this task document.

## Acceptance Criteria

- [x] The renderer App subtree can consume TanStack Query context through one stable `QueryClient` instance.
- [x] React `StrictMode` rendering cannot recreate the shared `QueryClient`.
- [x] Queries and mutations execute regardless of Chromium's online status.
- [x] Queries do not retry automatically or refetch because of window focus or network reconnection.
- [x] Mutations do not retry automatically.
- [x] Global configuration does not impose `staleTime`, `gcTime`, cache persistence, or Provider-specific policy.
- [x] Existing Theme, `HashRouter`, routes, Provider requests, and visible behavior remain unchanged.
- [x] No Query Devtools, persistence layer, native dependency, IPC capability, or main-process change is introduced.
- [x] The documented `pnpm typecheck` and `pnpm build` commands no longer invoke npm and pass under the repository's pnpm-only `devEngines` policy.
- [x] `build:unpack` continues to delegate to the production build through pnpm without changing its packaging behavior.
- [x] `pnpm lint` excludes generated `dist/` and `out/` artifacts while continuing to lint repository source and configuration.
- [x] Type checking, linting, and the production build pass.

## Out of Scope

- Provider result adapters, query keys, read queries, mutations, and cache invalidation.
- Provider loading, error, retry, cache-retention, and sensitive-detail behavior changes.
- Migrating data loading for any page.
- UI, Theme, navigation, or route changes.
- Package-script modernization beyond the nested package-manager calls required by `typecheck`, `build`, and `build:unpack`.
- ESLint rule, parser, or coverage changes beyond excluding generated `dist/` and `out/` artifacts.
- Automated visual, browser, accessibility-tree, screenshot, or desktop verification.

## Handoff

Task 002 will consume the mounted QueryClient and approved defaults, then add the Provider result adapter, query keys, per-query cache lifetimes, sensitive-detail disposal, and read-query migration without revisiting renderer bootstrap ownership. The standard repository typecheck, lint, and build commands will be usable directly for its verification.

## Verification

- `pnpm list @tanstack/react-query --depth 0` passed and resolved the direct production dependency to `5.101.4`.
- `pnpm typecheck` passed both the node and web TypeScript projects.
- `pnpm lint` passed after excluding only the generated `dist/` and `out/` directories. Existing upstream ESLint deprecation warnings remain non-failing.
- `pnpm build` passed the full typecheck and Electron Vite production build, including 2,412 transformed renderer modules.
- `git diff --check` passed.
- Static inspection confirmed one module-level QueryClient, the approved query and mutation defaults, unchanged Theme and `HashRouter` composition, no global `staleTime` or `gcTime`, and no Provider query or mutation migration.
- `pnpm peers check` was run as a supplemental diagnostic. Its existing `@emnapi/core` and `@emnapi/runtime` warnings trace through `@dhzh/eslint-config` and are unrelated to `@tanstack/react-query`.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
