# Task 002: Build Operational Dashboard and Skills States

## Status

`completed`

## Goal

Replace renderer placeholders with useful, honest page states while reusing existing Provider data ownership and navigation contracts.

## Detail

Replace the Dashboard's Markdown demonstration with an operational overview derived from the existing Codex and Claude Code Provider list queries. Show Total Providers, Connected, and Needs Attention metrics, followed by a runtime table containing Provider counts, connected counts, and health. Runtime health distinguishes loading, unavailable, not configured, needs attention, healthy, and not fully tested states.

Reuse `useProviderList` and the established Provider query cache rather than adding Dashboard-specific IPC. Show skeletons while either runtime is loading. If one or both runtime queries fail, retain the available row state, show a persistent error Banner, and provide one Retry action that resets both runtime lists. Link directly to Provider management through the shared route contract.

Replace the Skills title-only placeholder with a full-height unavailable empty state. State plainly that Skills discovery and management are not connected in the current build and provide a route-aware Return to Dashboard action. Use the same compact, divider-backed page-heading treatment as Dashboard.

## Findings

None.

## Dependencies

- Task 001: Refine Application Shell and Sidebar, completed.
- Existing TanStack Query Provider list hooks and cache reset helper.
- Existing Provider runtime labels and icon assets.
- Existing Dashboard, Skills, and Providers route paths.

## Deliverables

- Provider connection-health metric cards on Dashboard.
- Runtime health table for Codex and Claude Code.
- Dashboard loading, partial-failure, and retry behavior.
- Direct Manage Providers navigation.
- Explicit Skills unavailable state with a Dashboard return action.

## Acceptance Criteria

- [x] Dashboard no longer renders sample Markdown content.
- [x] Provider totals and connection counts are derived from the existing runtime Provider summaries.
- [x] Runtime status distinguishes no configuration, failed connections, complete success, incomplete testing, loading, and unavailable data.
- [x] Loading values use stable skeletons without shifting the surrounding layout.
- [x] Query failures display recovery guidance and retry both runtime lists without adding a new API surface.
- [x] Dashboard provides a route-aware Manage Providers link.
- [x] Skills clearly communicates that the feature is unavailable in this build.
- [x] Skills provides a route-aware Return to Dashboard action.

## Out of Scope

- Runtime process detection, authentication state, or live network polling.
- Dashboard history, charts, activity feeds, sorting, or customization.
- Skills discovery, filesystem scanning, installation, or execution.
- New main-process, preload, IPC, or persistence behavior.

## Handoff

The renderer now opens on real Provider health information and communicates the unavailable Skills capability without presenting an ambiguous placeholder.

## Verification

- Type checking, linting, and the Electron Vite production build passed for the completed renderer implementation.
- Static inspection confirmed that Dashboard uses the existing Provider query layer and that both page actions use shared route paths.
- The application was not launched and no automated visual inspection was performed, as required by repository policy.
