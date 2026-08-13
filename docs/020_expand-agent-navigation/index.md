# Expand Agent Navigation

## Status

`completed`

## Goal

Establish a coherent Agent-oriented navigation structure for Extensions and Observability, with stable page entry points for future capabilities but without implementing those capabilities.

## Detail

Reorganize the sidebar around three complementary areas. `Agent Extensions` describes reusable capabilities and configuration that extend an Agent, `Agent Runtime` retains the existing Runtime and Provider workflows, and `Agent Observability` provides the future entry point for understanding Agent execution.

Place `Skills`, `MCP Servers`, and `Prompt Templates` under the non-navigable `Agent Extensions` section. Place `Sessions` under the non-navigable `Agent Observability` section. Preserve `Dashboard` as the standalone primary destination and keep the existing `Agent Runtime` section and behavior between Extensions and Observability.

Use `/agent-extensions` and `/agent-observability` as route namespaces. Their parent paths redirect to `/agent-extensions/skills` and `/agent-observability/sessions`, respectively. Remove `/skills` without a compatibility route; direct navigation to the former path uses the application's existing fallback behavior and returns to Dashboard.

Provide complete unavailable states for Skills, MCP Servers, Prompt Templates, and Sessions. Each page has its own heading, an honest feature-specific explanation that the capability is not connected in this build, and a route-aware `Return to Dashboard` action. The pages share the existing title-bar and full-height empty-state treatment so future plans can replace their internal content without revisiting the navigation contract.

This plan establishes navigation and placeholder pages only. Each Extension capability and Agent message observability will be shaped and implemented through separate future plans.

## Scope

- Add a static `Agent Extensions` sidebar section containing Skills, MCP Servers, and Prompt Templates.
- Preserve the existing `Agent Runtime` section containing Runtimes and Providers.
- Add a static `Agent Observability` sidebar section containing Sessions.
- Order the sidebar areas as Dashboard, Agent Extensions, Agent Runtime, and Agent Observability.
- Establish canonical Agent Extensions and Agent Observability route namespaces and parent-path redirects.
- Move Skills from `/skills` to `/agent-extensions/skills` without a compatibility route.
- Add canonical routes for MCP Servers, Prompt Templates, and Sessions.
- Provide consistent full-page unavailable states for all four destination pages.
- Preserve route-derived sidebar selection and direct navigation behavior.
- Keep the change within the renderer and verify it with the repository's non-visual checks.

## Out of Scope

- Skill discovery, installation, configuration, management, or execution.
- MCP Server configuration, connection, discovery, lifecycle, or execution.
- Prompt Template creation, editing, persistence, organization, or execution.
- Agent Session collection, persistence, querying, message display, timeline, message-flow visualization, or analysis.
- Dashboard, Runtime, or Provider behavior changes.
- Compatibility routes or redirects for `/skills` or any other former path.
- Main-process, preload, IPC, database, filesystem, or external Runtime integration changes.
- New third-party dependencies or styling systems.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Decisions

- Use `Agent Extensions` because Skills, MCP Servers, and reusable Prompt Templates all extend Agent capabilities.
- Use `MCP Servers` instead of `MCPs` to name the managed concept precisely.
- Use `Prompt Templates` instead of `Prompts` because the destination represents reusable templates rather than conversation messages.
- Use `Agent Observability` because the future product direction includes Agent message visualization and analysis rather than message-history browsing alone.
- Use `Sessions` as the Observability entry because messages, timelines, message flow, and analysis share one session context.
- Keep future Overview, Timeline, Message Flow, and Analysis views inside Session detail rather than exposing them as sidebar destinations.
- Render Agent Extensions and Agent Observability as non-navigable section headings; their namespace root routes redirect to the first destination.
- Use `/agent-extensions/skills`, `/agent-extensions/mcp-servers`, `/agent-extensions/prompt-templates`, and `/agent-observability/sessions` as canonical destination paths.
- Remove `/skills` without compatibility behavior; the existing wildcard fallback returns former direct visits to Dashboard.
- Use complete unavailable states rather than title-only placeholders so every destination communicates its current status and offers recovery navigation.
- Preserve the existing `Agent Runtime` terminology, routes, workflows, and sidebar position between Extensions and Observability.
- Add no dependency and keep all changes inside the renderer boundary.

## Tasks

- [x] [Task 001: Expand Agent Navigation and Placeholder Pages](./task001_expand-agent-navigation-and-placeholder-pages.md)
