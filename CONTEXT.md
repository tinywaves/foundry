# Foundry

Foundry provides local interfaces for working with its developer runtime.

## Language

**Foundry CLI**:
The `foundry` executable through which a user accesses Foundry from a terminal. Invoking it without a command presents help rather than starting a service.
_Avoid_: Foundry command, terminal UI

**Local Web UI**:
A browser-based Foundry interface served on and accessible only from the user's machine.
_Avoid_: Electron UI, desktop UI

**Foundry Server**:
The local service that provides the Local Web UI and Foundry's HTTP API. It may be started through the Foundry CLI or directly for development.
_Avoid_: CLI server, Web UI server

**Foundry Library API**:
A potential programmatic interface exposed if Foundry is consumed as an npm package. It is independent of the Foundry CLI and is not yet a committed product surface.
_Avoid_: CLI API, command API
