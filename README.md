# Foundry

Foundry is an AI-native local personal workbench distributed as a CLI. Running
`foundry` prepares local storage, starts a Hono server, serves the bundled
React Web UI, and opens it in the default browser.

The package is intentionally CLI-only. It does not expose a JavaScript library
entry point.

## Features

- Manage model providers using OpenAI Responses, Anthropic Messages, or
  OpenAI-compatible Chat Completions protocols.
- Discover provider models and keep custom model IDs alongside remote models.
- Capture links with Firecrawl or DeepSeek, run background jobs with retries,
  and review scrape history and captured Markdown.
- Configure appearance, language and region, capture behavior, and concurrency.
- Export and import an encrypted `.foundry-backup` snapshot containing the
  database and application settings.

## Requirements

- Node.js 24.22.1 or newer
- pnpm 12.15 or newer

The project uses `better-sqlite3`, so pnpm must be allowed to run native package
build scripts. The required allowlist is already declared in
`pnpm-workspace.yaml`.

## Run From Source

```bash
pnpm install
pnpm build
pnpm start
```

`pnpm start` runs the built CLI from `dist/index.mjs`. Build first after changing
the CLI, server, or Web UI.

The CLI listens on `http://127.0.0.1:11111`, prints the URL, and opens the
browser by default:

```bash
foundry
foundry --no-open
foundry --help
foundry --version
```

The host and port are currently fixed. There are no CLI or environment-variable
port overrides.

## Local Development

Run the API and Web UI as two independent processes:

```bash
pnpm dev:api
pnpm dev:web
```

- Web UI: `http://localhost:33333`
- API: `http://localhost:22222`

Vite proxies `/api` from the Web dev server to the API server. There is
intentionally no CLI development command; use the two development servers to
test page behavior, then use `pnpm build && pnpm start` to verify the production
server and static assets.

## Data and Storage

Foundry keeps user data outside the repository in `~/.foundry`:

- `foundry.sqlite`: providers and their credentials, captures, and scrape jobs
- `settings.json`: application settings and capture-fetcher credentials
- `.data-transfer/`: temporary export and import files

The CLI initializes the directory, opens the SQLite database, and applies
Drizzle migrations before the server starts. A database created by a newer
schema version is rejected instead of being modified.

On POSIX systems, Foundry creates the data directory with `0700` permissions and
sensitive files with `0600` permissions.

## Build Output

```bash
pnpm build
```

The build produces:

```text
dist/
|-- index.mjs
|-- drizzle/
|   |-- *.sql
|   `-- meta/
`-- web/
    |-- assets/
    |-- index.html
    `-- favicon.png
```

`tsdown` cleans `dist`, bundles the CLI, and copies the Drizzle migrations.
Vite then writes the Web UI directly to `dist/web`. Do not add a manual copy
step for the Web UI.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev:api` | Run the API server at `22222` |
| `pnpm dev:web` | Run the Vite Web UI at `33333` |
| `pnpm build` | Build the CLI and Web UI |
| `pnpm start` | Run the production CLI at `11111` |
| `pnpm test` | Run behavioral tests |
| `pnpm test:coverage` | Run tests with V8 coverage |
| `pnpm db:generate` | Generate a Drizzle migration after schema changes |
| `pnpm db:migrate` | Apply migrations manually to the local database |

Run the project scripts with the Node.js version declared in `package.json`.
Older Node.js versions cannot run the installed pnpm or project toolchain.

## Project Structure

```text
app/web/                  React, Vite, Astryx, and StyleX Web UI
src/
|-- cli/                  CLI arguments and browser opening
|-- features/             Providers, captures, settings, and data transfer
|-- lib/                  Small server-side utilities
|-- server/               Hono API, static serving, and server entry points
`-- storage/              SQLite, Drizzle schema, paths, and migrations
drizzle/                  Generated migration SQL and metadata
test/                     Behavioral API and feature tests
```

The API is mounted under `/api`. The production server serves files from
`dist/web` and falls back to `dist/web/index.html` for client-side routes.

## Packaging

The published package contains only `dist`. The `bin` entry points to
`dist/index.mjs`, and `exports` exposes only `./package.json`; consumers cannot
import Foundry as a JavaScript library.

Verify package contents with:

```bash
pnpm pack --dry-run
```

The tarball must include the CLI, Web assets, and Drizzle migrations.

## License

[Apache-2.0](LICENSE)
