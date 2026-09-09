# Foundry

Foundry is a local control plane for AI development tools. It provides a CLI-managed web interface for saving model Providers, applying them to installed agent Runtimes, and moving user-owned configuration between Foundry installations.

Foundry currently supports [OpenAI Codex](https://github.com/openai/codex) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code). The Dashboard, Skills, MCPs, and Prompts screens are present as placeholders; their management workflows are not connected to the Local Web UI yet.

## Requirements

- Node.js `24.18.0` or newer within the Node 24 release line
- pnpm `11.22.0` or newer within the pnpm 11 release line for repository development

## Quick Start

Start the latest published Local Web UI without installing Foundry globally:

```bash
pnpm dlx @dhzh/foundry@latest ui
```

Foundry listens only on `127.0.0.1`, uses port `54321` by default, and opens the interface in the default browser. Stop it with `Ctrl+C`.

```bash
# Use another port.
pnpm dlx @dhzh/foundry@latest ui --port 61234

# Start without opening a browser.
pnpm dlx @dhzh/foundry@latest ui --no-open

# Show command help or the installed version.
pnpm dlx @dhzh/foundry@latest ui --help
pnpm dlx @dhzh/foundry@latest --version
```

| Option | Default | Description |
| --- | --- | --- |
| `--port <port>` | `54321` | Listen on a port from `1` through `65535`. |
| `--open` | enabled | Open the Local Web UI after the server starts. |
| `--no-open` | - | Keep the browser closed. |

Running `foundry` without a subcommand prints help and does not start a server.

## Current Capabilities

### Providers

A Provider is a saved model-service connection scoped to one Runtime. Foundry can:

- create, edit, copy, list, and soft-delete Codex and Claude Code Providers;
- store Runtime-specific endpoints, API keys, model selections, and optional presentation details;
- test a saved connection against the Provider's model-listing endpoint;
- apply or reapply a Provider directly from its card; and
- prevent deletion while the Provider is assigned to a Runtime.

Codex Providers use the Responses protocol and support a default model, optional review model, and optional API key. Claude Code Providers use the Messages protocol and support authentication-header selection, role models, subagent settings, model capabilities, and selected Claude Code feature flags.

### Runtimes

Foundry detects the `codex` and `claude` executables from `PATH`, reads their version, and manages these user-level configuration files:

| Runtime | Configuration file |
| --- | --- |
| Codex | `~/.codex/config.toml` |
| Claude Code | `~/.claude/settings.json` |

Before applying a saved Provider or Official Default, Foundry compares every managed field and separates proposed changes from unchanged fields. Long configuration paths, field names, and field values remain on one line and reveal the full value on hover when truncated. Applying a preview:

- preserves fields outside Foundry's managed field set;
- rejects the apply if the file changed after the preview was created;
- writes through a temporary file and atomically replaces the target;
- keeps the latest configuration backup beside the file with a `.foundry-backup` suffix; and
- records the selected Provider or Official Default as the Runtime Assignment.

Official Default removes Foundry-managed active selection fields while preserving unrelated configuration, saved Provider tables, and official account credentials. Foundry does not infer Runtime Assignments from configuration files changed outside the application.

### Settings

Application Settings currently contain a persisted Color Mode: System, Light, or Dark. The Settings page also owns Foundry data import and export.

## Local Web Routes

The Local Web UI uses hash routing, so browser navigation does not require server-side route fallbacks.

| Route | Status | Purpose |
| --- | --- | --- |
| `/#/` | Available | Redirects to the Dashboard. |
| `/#/dashboard` | Placeholder | Application entry point. |
| `/#/skills` | Placeholder | Future Skill management. |
| `/#/mcps` | Placeholder | Future MCP Server management. |
| `/#/prompts` | Placeholder | Future Prompt management. |
| `/#/providers` | Available | Lists Providers by Runtime; accepts `?runtime=codex` or `?runtime=claude-code`. |
| `/#/providers/new` | Available | Creates a Provider. |
| `/#/providers/:providerId/edit` | Available | Edits an existing Provider. |
| `/#/providers/:providerId/copy` | Available | Creates a new Provider from an existing one. |
| `/#/runtimes` | Available | Detects and configures supported Runtimes. |
| `/#/settings` | Available | Changes Color Mode and imports or exports data. |
| any other hash route | Available | Renders the in-app Not Found page. |

The browser title also reports Foundry Server health as `Checking...`, `Healthy`, or `Unhealthy`.

## Data Import and Export

The Settings page exports all current Exportable Data as one timestamped `.foundry` file. The file is a ZIP-backed binary container intended for Foundry rather than manual editing; it is not encrypted.

| Module | Encoding | Exported data | Import behavior |
| --- | --- | --- | --- |
| `settings` | JSON | Application Settings | Overwrites current settings. |
| `providers` | JSON | All active Providers, including API keys and avatars | Appends new Providers, including duplicates. |

Provider database IDs, timestamps, and deletion metadata are omitted so the destination database can generate them. Deleted Providers, Runtime Assignments, and other machine-specific operational state are not exported.

Each package contains a manifest with its format, creation time, Foundry version, and per-module path, media type, overwrite policy, byte size, and SHA-256 checksum. Import validates the container and manifest before processing modules. Supported modules are atomic but independent: one module can fail or be unsupported without rolling back another module that imported successfully.

Because Provider API keys are stored in the export, keep `.foundry` files private and store them securely.

## Local Data and Safety

Foundry stores Provider records, Runtime Assignments, and Application Settings in one `foundry.sqlite` database in the operating system's application-data directory. The directory is resolved with [`env-paths`](https://github.com/sindresorhus/env-paths); on macOS the default database location is `~/Library/Application Support/foundry/foundry.sqlite`.

Provider API keys are stored in this local database. Access to the machine and its user account should therefore be treated as access to those credentials.

Database migrations run automatically when the server starts. Before applying pending migrations to an existing database, Foundry creates an online SQLite backup under the adjacent `backups/` directory and retains the newest migration backup. A database migrated by a newer or incompatible Foundry version is rejected instead of being silently changed.

The HTTP server is loopback-only and has no remote-listening mode or authentication layer. It should not be exposed through a reverse proxy or port-forwarding setup.

## HTTP API

The Local Web UI uses relative `/api` requests. The server currently exposes:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Reports Foundry Server health. |
| `GET` | `/api/settings` | Reads Application Settings. |
| `PATCH` | `/api/settings` | Updates Application Settings. |
| `GET` | `/api/providers?runtime=:runtime` | Lists Provider summaries for `codex` or `claude-code`. |
| `POST` | `/api/providers` | Creates a Provider. |
| `GET` | `/api/providers/:providerId` | Reads full Provider configuration. |
| `PUT` | `/api/providers/:providerId` | Updates a Provider without changing its Runtime type. |
| `DELETE` | `/api/providers/:providerId` | Soft-deletes an unassigned Provider. |
| `POST` | `/api/providers/:providerId/copy` | Creates a Provider copy from submitted data. |
| `POST` | `/api/providers/:providerId/test-connection` | Runs a non-persistent Provider connection test. |
| `GET` | `/api/runtimes` | Detects supported Runtimes and returns their assignments. |
| `POST` | `/api/runtimes/:runtime/preview` | Previews configuration changes for a Provider or Official Default. |
| `POST` | `/api/runtimes/:runtime/apply` | Applies an unchanged preview and records the Runtime Assignment. |
| `GET` | `/api/data/export` | Downloads the current `.foundry` export. |
| `POST` | `/api/data/import` | Imports a `.foundry` file from the raw request body. |

JSON success and business-result responses use a shared envelope:

```json
{
  "status": "SUCCESS",
  "data": true,
  "message": "Service is healthy."
}
```

`message` is optional. Request validation failures use HTTP `400`; domain outcomes also carry a machine-readable `status` such as `PROVIDER_NOT_FOUND` or `RUNTIME_CONFIGURATION_CHANGED`. The export endpoint instead returns `application/octet-stream` with an attachment filename. Import requests are limited to 256 MiB.

The API is an internal local contract shared by the server and Local Web UI. It is not currently documented as a stable remote integration API.

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

Start the Hono server on `http://127.0.0.1:54321`:

```bash
pnpm dev:server
```

In another terminal, start the React app on [http://localhost:12345](http://localhost:12345):

```bash
pnpm dev:app
```

Rsbuild proxies `/api` to the Hono development server. Other useful commands are:

| Command | Purpose |
| --- | --- |
| `pnpm dev:cli` | Runs the source CLI's `ui` command. |
| `pnpm test` | Runs Node tests and Chromium Browser Mode tests once. |
| `pnpm test:dev` | Runs Vitest in watch mode. |
| `pnpm test:coverage` | Runs tests with V8 coverage. |
| `pnpm lint` | Checks the workspace with ESLint. |
| `pnpm lint-fix` | Applies ESLint fixes. |
| `pnpm typecheck` | Type-checks the root TypeScript project. |
| `pnpm --filter @dhzh/foundry-app typecheck` | Type-checks the React app. |
| `pnpm build` | Builds the server/CLI package, migrations, and Local Web UI into `dist/`. |
| `pnpm db:generate` | Generates a new Drizzle migration after an approved schema change. |
| `pnpm release` | Starts the interactive version-bump workflow for maintainers. |

Run the full verification set before release:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm --filter @dhzh/foundry-app typecheck
pnpm build
```

Pushing a `v*` tag triggers separate GitHub Actions workflows that create the GitHub release and publish `@dhzh/foundry` to npm with provenance.

## Repository Layout

- `src/cli/` - Citty CLI and the `foundry ui` command.
- `src/server/` - Loopback Hono server, persistence, HTTP handlers, Runtime configuration, static assets, and shutdown lifecycle.
- `app/` - Private React, Rsbuild, Tailwind CSS, shadcn/ui, and TanStack Query workspace for the Local Web UI.
- `packages/api-contract/` - Private shared runtime constants and TypeScript HTTP contracts; bundled into the published output.
- `drizzle/` - Forward-only SQLite migrations bundled with the package.
- `test/` - Node-side Vitest coverage for the CLI, server, persistence, and contracts.
- `app/test/` - Vitest Browser Mode coverage using Playwright and Chromium.
- `docs/adr/` - Architecture decision records for routing, server state, persistence, credentials, Runtime management, and export format.
- `docs/design/` and `docs/research/` - Detailed feature behavior and supporting technical research.
- `src/main/` - Earlier Skill and Prompt subsystem code that is not wired into the current CLI, server, or Local Web UI entrypoints.

The published package contains the CLI, the minimal library entrypoint, bundled migrations, and the built Local Web UI. The private app and API-contract workspaces are not published as separate packages.

## Open Source Inspiration

Foundry is inspired by open-source projects that explore better ways to manage local AI development tools:

- [CC Switch](https://github.com/farion1231/cc-switch) - Inspiration for Provider management and local agent Runtime configuration workflows.

## License

Foundry is licensed under the [Apache License 2.0](./LICENSE).
