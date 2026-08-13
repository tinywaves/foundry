# Task 001: Expand Agent Navigation and Placeholder Pages

## Status

`completed`

## Goal

Establish the canonical Agent Extensions and Agent Observability routes, sidebar destinations, and consistent unavailable pages while preserving the existing Dashboard and Agent Runtime behavior.

## Detail

Extend the renderer route contract with `/agent-extensions`, `/agent-extensions/skills`, `/agent-extensions/mcp-servers`, `/agent-extensions/prompt-templates`, `/agent-observability`, and `/agent-observability/sessions`. Keep the paths and ordered destination metadata centralized in the existing renderer routes module so the sidebar and router consume one navigation contract.

Redirect `/agent-extensions` to Skills and `/agent-observability` to Sessions with replace navigation. Remove the former `/skills` route without adding a compatibility redirect or alias. A direct visit to `/skills` therefore follows the existing wildcard fallback to Dashboard. Preserve the current Dashboard, Agent Runtime parent redirect, Runtimes, Providers, and wildcard behavior.

Restructure the sidebar in this fixed order: standalone Dashboard, `Agent Extensions`, `Agent Runtime`, and `Agent Observability`. Render both new group labels as non-navigable Astryx `SideNavSection` headings. Agent Extensions contains Skills, MCP Servers, and Prompt Templates; Agent Observability contains Sessions. Retain route-derived selection and use Lucide `Wrench`, the official Model Context Protocol mark, Lucide `FileText`, and Lucide `MessagesSquare` for those destinations, respectively. Adapt the official MCP mark from the existing `@lobehub/icons-static-svg` dependency as a current-color SVG component and apply a subtle same-color outline so its visual weight remains legible beside Lucide icons at the 16-pixel sidebar size. Preserve the existing `Bot` and `Plug` icons and behavior for Runtimes and Providers.

Extract a renderer-owned `UnavailableFeaturePage` component for the behavior genuinely shared by the four placeholder destinations. It owns the existing compact divider-backed page heading, full-height Astryx `EmptyState`, level-two empty-state heading semantics, feature icon presentation, and router-aware `Return to Dashboard` action. It accepts only the page-specific title, unavailable-state title, description, and an Astryx-compatible SVG icon component. Keep the component local to the renderer page boundary; do not create a broader common abstraction.

Render Skills, MCP Servers, Prompt Templates, and Sessions through the shared unavailable-page component. Use these page-specific messages:

- Skills: `Skills Aren't Available Yet` and `Skill discovery and management aren't connected in this build.`
- MCP Servers: `MCP Servers Aren't Available Yet` and `MCP Server discovery and configuration aren't connected in this build.`
- Prompt Templates: `Prompt Templates Aren't Available Yet` and `Prompt Template creation and management aren't connected in this build.`
- Sessions: `Sessions Aren't Available Yet` and `Agent Session collection and analysis aren't connected in this build.`

Continue to use Astryx for shell, section, stack, empty-state, icon, heading, and link behavior. Use StyleX only for the shared full-height empty-state requirement and retain design-system tokens and component props. Do not add standalone CSS, raw layout elements, hardcoded style values, or dependencies. Keep the implementation entirely within the renderer process.

Extend the existing pure route test to verify every canonical path and the exact order and labels of the Agent Extensions, Agent Runtime, and Agent Observability destinations. Use static inspection to verify router wiring, parent redirects, wildcard behavior, icon ownership, Astryx and StyleX compliance, and renderer-only scope. Do not launch the application or perform automated visual inspection under the repository policy.

## Findings

None.

## Dependencies

None.

## Deliverables

- Canonical Agent Extensions and Agent Observability route paths, parent redirects, and ordered destination metadata.
- Sidebar sections and destinations for Skills, MCP Servers, Prompt Templates, Runtimes, Providers, and Sessions in the approved order.
- A focused renderer-owned unavailable-feature page component shared by the four placeholder destinations.
- Skills, MCP Servers, Prompt Templates, and Sessions unavailable pages with feature-specific content and icons.
- Focused automated coverage for the canonical route paths and destination ordering.

## Acceptance Criteria

- [x] The sidebar presents Dashboard, Agent Extensions, Agent Runtime, and Agent Observability in the approved order.
- [x] Agent Extensions contains Skills, MCP Servers, and Prompt Templates with Lucide `Wrench`, the official Model Context Protocol mark, and Lucide `FileText` icons, respectively.
- [x] Agent Runtime retains Runtimes and Providers with their existing labels, icons, routes, and behavior.
- [x] Agent Observability contains Sessions with the `MessagesSquare` icon.
- [x] Every canonical destination route renders its corresponding page and produces the correct route-derived selected state.
- [x] `/agent-extensions` redirects with replace navigation to `/agent-extensions/skills`.
- [x] `/agent-observability` redirects with replace navigation to `/agent-observability/sessions`.
- [x] `/skills` has no active route or compatibility alias and follows the existing wildcard fallback to Dashboard.
- [x] Skills, MCP Servers, Prompt Templates, and Sessions each show a page heading, a feature-specific unavailable explanation, a semantically appropriate icon, and a route-aware `Return to Dashboard` action.
- [x] The four unavailable pages share one focused renderer component without weakening the renderer, preload, or main-process boundaries.
- [x] Dashboard, Runtimes, Providers, the Agent Runtime parent redirect, and wildcard fallback behavior remain unchanged.
- [x] The implementation adds no dependency, standalone CSS, raw layout element, hardcoded style value, preload API, IPC handler, database behavior, or main-process capability.
- [x] Route tests, type checking, linting, diff validation, and the planned static inspections pass.

## Out of Scope

- Skill discovery, installation, configuration, management, or execution.
- MCP Server discovery, configuration, connection, lifecycle, or execution.
- Prompt Template creation, editing, persistence, organization, or execution.
- Agent Session collection, persistence, querying, message display, timeline, message-flow visualization, or analysis.
- Dashboard, Runtime, or Provider product changes.
- Compatibility routes for `/skills` or other former paths.
- Main-process, preload, IPC, database, filesystem, or external Runtime integration changes.
- New dependencies, standalone CSS, or another styling system.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Completion leaves stable, canonical navigation and page boundaries that separate future Skills, MCP Servers, Prompt Templates, and Agent Session observability work into independently reviewable plans. Each future plan can replace one placeholder page's internal content without redefining the sidebar or route namespace.

## Verification

- `pnpm test` passed 15 test files and 99 tests, including four route-contract tests.
- `pnpm typecheck` passed the Node and Web TypeScript checks.
- `pnpm lint` passed with only the repository's existing ESLint configuration deprecation notices.
- `git diff --check` passed.
- Static inspection confirmed the canonical routes, both parent redirects, exact-path selected states, approved Lucide icons, official MCP mark, Astryx and StyleX usage, and renderer-only scope.
- Static search confirmed active source contains no `/skills` route, `routePaths.skills` reference, raw `div` or `span` layout, standalone CSS import, hardcoded color, or hardcoded pixel style in the changed renderer modules.
- The application was not launched and no automated visual inspection was performed, as required by repository policy.

## Maintenance Adjustments

### 2026-08-13 15:45:35: Use the Official MCP Mark

- Change: Replaced the MCP Servers `ServerCog` icon in the sidebar and unavailable state with the official Model Context Protocol mark from the existing `@lobehub/icons-static-svg` package. The renderer adapts the mark as an Astryx-compatible current-color SVG component and adds a `0.4` same-color outline for optical weight at the 16-pixel sidebar size.
- Previous state: MCP Servers used the Lucide `ServerCog` semantic icon in both navigation and unavailable-page contexts.
- Reason: The protocol has a dedicated mark, and its unadjusted fill appeared visibly lighter than neighboring Lucide icons at the sidebar rendering size.
- Documentation impact: Updated the Task 001 Detail, icon acceptance criterion, and verification statement. Plan 020's Goal, Scope, Decisions, status, task order, and completion state remain unchanged.
- Verification: `pnpm test` passed 15 test files and 99 tests; `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Visual acceptance remains with the user under repository policy.
