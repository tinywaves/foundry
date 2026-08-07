# Centralize Provider Async State

## Status

`completed`

## Goal

Introduce a reusable TanStack Query foundation for the renderer and migrate all Provider asynchronous reads and operations to it while preserving existing Provider behavior, Electron security boundaries, and sensitive-data lifetimes.

## Detail

Replace general Provider query and mutation lifecycle orchestration in renderer components with a shared TanStack Query layer. The query layer will operate over the existing typed `globalThis.api.providers` Promise APIs through an adapter that converts unsuccessful `ProviderApiResult` values into typed query errors. It will not add a general HTTP client or expose arbitrary IPC capabilities.

Only the selected runtime will load initially. A first visit to another runtime will render the existing loading table, while later visits may reuse its in-memory cache. Queries will not automatically retry, refresh on window focus, refresh on reconnect, poll, or persist across application launches. Explicit Retry controls remain the user's recovery path.

Provider detail containing the complete API key may remain in query memory only while its Edit dialog is open and must be removed immediately after the dialog closes. Explicitly revealed API keys remain transient component state and never enter the query cache. Query Devtools and persisted caches are not part of this plan.

Provider mutations remain non-optimistic. Successful operations will synchronize or invalidate the appropriate runtime cache before presenting their resulting state. Existing Toasts, Banners, field errors, loading controls, stale-response protection, reveal timers, and object URL cleanup remain behaviorally intact.

Form values, validation errors, runtime selection, dialog state, confirmation state, avatar editing intent, and revealed-key timers remain local React state. The work will remove only the manual effects, revisions, mounted guards, loading flags, and error values superseded by query or mutation ownership. The existing renderer, preload, main-process, repository, and SQLite boundaries remain intact.

## Scope

- Add and configure `@tanstack/react-query` for renderer use.
- Establish typed query errors, Provider query keys, cache defaults, and reusable query ownership.
- Migrate runtime Provider lists, avatars, and Edit detail loading.
- Migrate create, update, delete, saved connection test, draft connection test, avatar selection, Copy, and Reveal operations where query mutation ownership is appropriate.
- Synchronize Provider list data after successful mutations without optimistic UI.
- Remove superseded manual revisions, mounted guards, async loading or error state, and request effects.
- Preserve explicit lifecycle and resource cleanup where TanStack Query cannot own it.
- Preserve current loading, failure, retry, Toast, Banner, field-error, and stale-response behavior.
- Add focused automated verification and run the applicable type checking, linting, and production build commands.

## Out of Scope

- Migrating Dashboard, Skills, routing, or future feature data flows.
- Adding Redux, Zustand, Jotai, XState, React Hook Form, or another general client-state store.
- Changing SQLite, main-process behavior, preload APIs, IPC contracts, or Provider validation.
- True cancellation of work already dispatched through `ipcRenderer.invoke`.
- Query persistence, offline mutation replay, polling, Devtools, or background refresh.
- Optimistic Provider creation, update, or deletion.
- Changing Provider layout, visual design, Copy, Reveal, connection-testing, or error-message semantics.
- Changing API-key persistence, plaintext storage, or encryption decisions.
- Applying a Provider to Codex, Claude Code, or an Agent.

## Decisions

- Use `@tanstack/react-query` because the Provider workflows need explicit query ownership, mutation state inspection, and targeted cache coordination.
- Do not use SWR because its lighter mutation model is less aligned with the Provider page's multiple dialog and row operations.
- Do not adopt React Router data APIs because that would require an unrelated migration from the current declarative `HashRouter` architecture.
- Do not adopt a general client-state store because it would not directly solve asynchronous cache ownership, request deduplication, and mutation invalidation.
- Load only the active runtime initially and retain in-memory data for previously visited runtimes.
- Preserve explicit Retry controls and disable automatic query retries.
- Disable focus and reconnect revalidation.
- Keep complete Edit API keys ephemeral and keep explicitly revealed API keys outside the query cache.
- Keep all query and mutation state memory-only without persistence or Devtools.
- Preserve current non-optimistic interaction behavior.
- Keep renderer UI and form state local when it is not remote asynchronous state.
- Keep the renderer, preload, main-process, repository, and SQLite ownership boundaries unchanged.
- Treat object URLs and reveal timers as explicit renderer resources that still require deterministic cleanup.

## Tasks

- [x] [Task 001: Establish Renderer Query Foundation](./task001_establish-renderer-query-foundation.md)
- [x] [Task 002: Migrate Provider Read Workflows](./task002_migrate-provider-read-workflows.md)
- [x] [Task 003: Migrate Provider Dialog Mutations](./task003_migrate-provider-dialog-mutations.md)
- [x] [Task 004: Migrate Provider Table Actions and Complete Async-State Cleanup](./task004_migrate-provider-table-actions-and-complete-async-state-cleanup.md)
