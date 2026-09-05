# Foundry

Foundry is an AI-native local developer runtime for managing Skills, MCP Servers, Prompts, model Providers, and local agent Runtimes. It provides a CLI-managed web interface that runs entirely on the user's machine.

## Usage

Start the local web interface with:

```bash
pnpm dlx @dhzh/foundry ui
```

The server listens on `http://127.0.0.1:54321` and opens the interface in the default browser. Use a different port or keep the browser closed when needed:

```bash
pnpm dlx @dhzh/foundry ui --port 61234 --no-open
```

## Local Web Interface

The Local Web UI uses hash-based URLs so navigation does not require server-side route fallbacks. It currently provides working management flows for Providers, Runtimes, and Application Settings, while the remaining capability surfaces are placeholders for future workflows.

- `/#/dashboard` - Dashboard placeholder and application entry point.
- `/#/skills`, `/#/mcps`, and `/#/prompts` - Capability management placeholders.
- `/#/providers` - Browse saved Codex and Claude Code Provider configurations by Runtime.
- `/#/providers/new` - Create a Provider with connection, authentication, model, and optional presentation details.
- `/#/runtimes` - Detect installed Codex and Claude Code Runtimes, select a saved Provider or Official Default, preview managed configuration changes, and apply them to the Runtime configuration file.
- `/#/settings` - Choose a system, light, or dark Color Mode persisted by the Foundry Server.

Provider records, Runtime assignments, and Application Settings are stored in Foundry's local SQLite database. The browser tab title reports Foundry Server connectivity as `Checking…`, `Healthy`, or `Unhealthy`, and unknown routes render an in-app Not Found page.

## Development

The repository is a pnpm workspace containing the published server and CLI package, a private React app, and a private API contract package.

Install dependencies from the repository root:

```bash
pnpm install
```

Start the Hono server:

```bash
pnpm dev:server
```

In another terminal, start the React app at [http://localhost:3000](http://localhost:3000):

```bash
pnpm dev:app
```

Rsbuild proxies `/api` requests to the Hono server at `http://127.0.0.1:54321`.

## Health Endpoint

`GET /api/health` returns HTTP 200 with the shared response envelope:

```json
{
  "status": "SUCCESS",
  "data": true,
  "message": "Service is healthy."
}
```

Unexpected query parameters are rejected with HTTP 400.

## Workspace Layout

- `src/cli/` - CLI entry point and the `foundry ui` command.
- `src/server/` - Hono server, health handler, static app serving, and lifecycle management.
- `app/` - React and Rsbuild local web interface with Vitest Browser Mode coverage.
- `packages/api-contract/` - Shared response constants and TypeScript types.
- `test/` - Vitest coverage for the CLI, server, and shared contracts.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm --filter @dhzh/foundry-app typecheck
pnpm build
```

## License

Foundry is licensed under the [Apache License 2.0](./LICENSE).
