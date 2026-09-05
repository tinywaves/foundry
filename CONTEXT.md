# Foundry

Foundry provides local interfaces for managing agent capabilities and execution configuration.

## Language

**Foundry CLI**:
The `foundry` executable through which a user accesses Foundry from a terminal. Invoking it without a command presents help rather than starting a service.
_Avoid_: Foundry command, terminal UI

**Local Web UI**:
A browser-based Foundry interface served on and accessible only from the user's machine.
_Avoid_: Electron UI, desktop UI

**Capabilities**:
The Foundry product area for reusable resources that expand supported local agents. It contains Skills, MCP Servers, and Prompts.
_Avoid_: Extensions, integrations

**Capability**:
A reusable resource that expands what a local agent can do. Foundry groups Skills, MCP Servers, and Prompts as Capabilities.
_Avoid_: Plugin, extension

**Skill**:
A packaged set of instructions and supporting resources that can be installed for supported local agents.
_Avoid_: Plugin, extension

**MCP Server**:
A configured Model Context Protocol server that exposes tools or context to supported local agents.
_Avoid_: MCP tool, MCP plugin

**Prompt**:
Reusable instruction text managed by Foundry.
_Avoid_: Prompt template

**Execution**:
The Foundry product area for configuring how supported local agents run and access model providers. It contains Providers and Runtimes.
_Avoid_: Infrastructure, environments

**Provider**:
A user-defined model-service connection configuration scoped to exactly one Runtime type. It has no built-in vendor identity, and its display name need not be unique.
_Avoid_: Model, backend, vendor

**Runtime**:
A supported local agent application whose provider configuration Foundry can manage.
_Avoid_: Provider, model

**Foundry Server**:
The local service that provides the Local Web UI and Foundry's HTTP API. It may be started through the Foundry CLI or directly for development.
_Avoid_: CLI server, Web UI server

**Application Settings**:
User-controlled preferences that shape Foundry's presentation and behavior across Local Web UI sessions and clients. Appearance is the first supported setting category; Application Settings are shared rather than browser-specific.
_Avoid_: Preferences, configuration

**Color Mode**:
The Application Setting that selects Foundry's light, dark, or system-matched appearance.
_Avoid_: Theme, dark mode

**Service Health**:
An application-wide indication of whether the Local Web UI can communicate successfully with the Foundry Server. It has the states Checking, Healthy, and Unhealthy.
_Avoid_: Connection status, API health

**Foundry Library API**:
A potential programmatic interface exposed if Foundry is consumed as an npm package. It is independent of the Foundry CLI and is not yet a committed product surface.
_Avoid_: CLI API, command API
