# Task 001: Align Agent Runtimes Terminology and Navigation

## Status

`completed`

## Goal

Align the active renderer's Agent Runtimes terminology and navigation contract while preserving all existing Provider behavior.

## Detail

Rename the flat renderer route identifiers from `agentsSwitch` and `agentsSwitchProviders` to `agentRuntimes` and `agentRuntimesProviders`. Replace their values with `/agent-runtimes` and `/agent-runtimes/providers`, respectively. Keep the parent route as a React Router `Navigate` redirect to the Providers route and update every active route consumer together so navigation, route-derived selection, and direct Dashboard links share the same canonical contract.

Remove the former `/agents-switch` route definitions without adding compatibility aliases. A direct visit to a former path will flow through the existing wildcard route and return to Dashboard. The new Providers path continues to support the existing `runtime=codex` and `runtime=claude-code` query values, canonical query handling, and runtime-specific Provider state.

Change the static sidebar section title from `Agents Switch` to `Agent Runtimes`. Keep `Providers` as its only visible destination and retain the Lucide `ServerCog` icon because it accurately represents Provider endpoint configuration. Preserve the official Codex and Claude Code marks used by the Providers page and Dashboard.

Update Dashboard feature-level context from `Runtime Status` to `Agent Runtime Status`, from `Couldn't Load All Runtime Data` to `Couldn't Load All Agent Runtime Data`, and from the table accessible name `Provider runtime health` to `Agent runtime provider health`. Keep the compact `Runtime` table header and `Manage Providers` command because their surrounding context is already explicit.

Do not rename `ProviderRuntime`, provider-runtime modules, runtime-scoped variables, or the `runtime` query parameter. Those names describe the existing domain correctly and are independent of the retired Agents Switch product label. Do not change Provider queries, caching, forms, actions, persistence, IPC, preload, or main-process behavior. Completed plans remain unchanged as historical records.

## Findings

None.

## Dependencies

- Existing React Router route table and shared renderer `routePaths` object.
- Existing Astryx `SideNavSection`, navigation, Dashboard, and table components.
- Existing Lucide `ServerCog` icon and official Codex and Claude Code assets.
- No new dependency is required.

## Deliverables

- Canonical Agent Runtimes route identifiers and paths throughout the active renderer.
- Agent Runtimes sidebar context with preserved Providers navigation and selection behavior.
- Dashboard Agent Runtime context copy and canonical Manage Providers navigation.
- Preserved Provider runtime selection, workflows, and icon semantics.

## Acceptance Criteria

- [x] The sidebar section displays `Agent Runtimes` and keeps Providers as its visible destination.
- [x] Providers navigation and selected state use `/agent-runtimes/providers`.
- [x] `/agent-runtimes` redirects to `/agent-runtimes/providers`.
- [x] Former `/agents-switch` paths have no route or compatibility alias and use the existing Dashboard fallback.
- [x] Dashboard displays `Agent Runtime Status`, reports incomplete data as `Couldn't Load All Agent Runtime Data`, and links Manage Providers through the new canonical path.
- [x] The runtime-health table has the accessible name `Agent runtime provider health` while its compact `Runtime` column label remains unchanged.
- [x] The Provider page retains canonical `runtime` query handling, runtime isolation, and all existing Provider behavior.
- [x] `ServerCog` and the official Codex and Claude Code runtime assets remain unchanged.
- [x] Active renderer source contains no `Agents Switch`, `agentsSwitch`, or `/agents-switch` references.
- [x] Type checking, linting, and diff validation pass.

## Out of Scope

- Provider data models, persistence, validation, queries, cache policy, forms, or actions.
- Shared Provider contracts, SQLite, IPC, preload, or main-process changes.
- Renaming `ProviderRuntime`, the `runtime` query parameter, or accurate runtime-scoped identifiers.
- Applying Providers, switching Agent configuration, runtime discovery, or adding navigation destinations.
- Replacing existing Provider or runtime icons.
- Compatibility routes or redirects for former Agents Switch URLs.
- Rewriting completed plan and task history.
- Updating the repository's AI-native product description or package metadata.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Completion closes Plan 011 with a single canonical Agent Runtimes name and route contract across the active renderer. Future runtime features can extend the new `/agent-runtimes` namespace without inheriting the retired Agents Switch terminology.

## Verification

- `pnpm typecheck` passed. It emitted the repository's existing warnings about simultaneous `packageManager` and `devEngines.packageManager` declarations.
- `pnpm lint` passed. It emitted existing `@stylistic/eslint-plugin` configuration deprecation warnings.
- `git diff --check` passed.
- Static search confirmed that active renderer source contains no `Agents Switch`, `agentsSwitch`, or `/agents-switch` references.
- Static inspection confirmed consistent new parent routing, Providers routing, selected state, and Dashboard navigation.
- Static inspection confirmed that Provider runtime state, query parameters, behaviors, and icon sources are unchanged.
- Visual verification is not run because repository policy reserves application launch and visual inspection for the user.
