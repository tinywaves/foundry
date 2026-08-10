# Align Agent Runtimes Terminology

## Status

`completed`

## Goal

Replace the legacy Agents Switch concept with Agent Runtimes across Foundry's active renderer terminology and navigation without changing Provider behavior.

## Detail

Use `Agent Runtimes` as the canonical product name for the renderer area that organizes runtime-scoped Provider management. Replace the existing sidebar section label, active route names, and route paths so the interface and navigation contract communicate the same concept.

Use `/agent-runtimes` and `/agent-runtimes/providers` as the canonical paths. The parent path continues to redirect to Providers, while the former `/agents-switch` paths are removed and receive only the application's existing fallback behavior. Update direct navigation from Dashboard and align its runtime-status context with the new product terminology without making repeated table labels unnecessarily verbose.

Keep `Provider` as the entity name and preserve existing runtime-scoped data ownership, the `runtime` query parameter, Codex and Claude Code selection, connection state, and Provider workflows. Existing `ProviderRuntime` types and local runtime-oriented identifiers remain accurate domain terminology and are not renamed merely because they contain `runtime`.

Retain the current icon system. The Lucide `ServerCog` icon continues to represent Provider configuration, while the official Codex and Claude Code assets continue to identify individual runtimes. Completed plans remain unchanged as historical records of the decisions that produced the current implementation.

## Scope

- Rename the active sidebar section from Agents Switch to Agent Runtimes.
- Replace active renderer route identifiers and paths with the Agent Runtimes terminology.
- Preserve the parent-to-Providers redirect under the new canonical route.
- Update Dashboard navigation and Agent Runtime context copy where the fuller term is needed.
- Preserve route-derived selection, Provider runtime query state, and existing fallback navigation.
- Review the affected renderer icons and retain them where their semantics remain correct.
- Verify the change through type checking, linting, diff validation, and static inspection.

## Out of Scope

- Provider persistence, SQLite, IPC, preload, main-process, or shared contract changes.
- Renaming `ProviderRuntime`, the `runtime` query parameter, or accurate local runtime identifiers.
- Applying a Provider to an Agent Runtime or adding Agent switching behavior.
- Runtime discovery, additional runtimes, Provider workflow changes, or new navigation destinations.
- Replacing the existing Provider semantic icon or official runtime marks.
- Compatibility redirects for `/agents-switch` or `/agents-switch/providers`.
- Rewriting completed plan and task documents that record the former terminology.
- Changing the repository's AI-native product description or package metadata.
- Visual verification through application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Decisions

- `Agent Runtimes` is the canonical module name, with singular `Agent` used attributively.
- `/agent-runtimes` and `/agent-runtimes/providers` are the only supported canonical paths for this area.
- `/agent-runtimes` redirects to `/agent-runtimes/providers`.
- Former `/agents-switch` paths are removed without compatibility aliases and fall through to the existing Dashboard fallback.
- Dashboard uses the full Agent Runtime term for section context while compact table labels may continue to use `Runtime`.
- `Provider` remains the user-facing entity terminology, and existing Provider behavior is unchanged.
- `ServerCog` and the official Codex and Claude Code assets remain semantically appropriate and require no replacement.
- Completed planning documents remain unchanged as historical records.
- The implementation adds no dependency and remains within the renderer boundary.

## Tasks

- [x] [Task 001: Align Agent Runtimes Terminology and Navigation](./task001_align-agent-runtimes-terminology-and-navigation.md)
