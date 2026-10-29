# Foundry

Foundry is an AI-native local personal workbench distributed as a CLI. Its
settings, providers, captures, scrape jobs, encrypted data transfer, and bundled
agent skill copy are available as JSON CLI commands for both people and agents.
`foundry web` prepares local storage, starts a Hono server, serves the bundled
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
- Copy the bundled agent skill into `<home>/.agents/skills/foundry`,
  `<home>/.claude/skills/foundry`, or both from the CLI or Settings > Advanced.

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
pnpm start web
```

`pnpm start` runs the built CLI from `dist/index.mjs`; `pnpm start web` starts
the Web UI. Build first after changing the CLI, server, or Web UI.

`foundry web` listens on `http://127.0.0.1:11111`, prints the URL, and opens the
browser by default:

```bash
foundry web
foundry web --no-open
foundry --help
foundry --version
```

Running bare `foundry` only prints help. It does not initialize storage or start
the Web UI. The Web host and port are fixed; there are no CLI or
environment-variable port overrides.

## CLI

Feature commands write JSON to stdout and errors to stderr:

```bash
foundry settings get
foundry settings update --input '{"theme":"dark"}'

foundry providers list
foundry providers create --input '{"name":"Local","protocol":"openai-compatible-chat-completions","baseURL":"http://127.0.0.1:11434/v1","apiKey":"","customModels":[]}'
foundry providers set-status <id> --status disabled

foundry captures list
foundry captures create https://example.com/article --note "Read later"
foundry captures get <capture-id>

foundry captures jobs list <capture-id>
foundry captures jobs get <capture-id> <job-id>
foundry captures jobs recapture <capture-id>

foundry data-transfer status
foundry data-transfer export --output ./foundry.foundry-backup
foundry data-transfer inspect ./foundry.foundry-backup
foundry data-transfer import ./foundry.foundry-backup

foundry settings download-skill --target .agents,.claude
```

Use `--input-file <path>` or `--input -` for large JSON payloads. Data-transfer
passphrases can be passed with `--passphrase` or `FOUNDRY_PASSPHRASE`.
`data-transfer import` validates and replaces the local database and settings in
one command.

Skill targets are fixed relative to the user home directory. Here `<home>` is
`~` on macOS/Linux and `%USERPROFILE%` on Windows:

- `.agents` -> `<home>/.agents/skills/foundry`
- `.claude` -> `<home>/.claude/skills/foundry`

Selecting both copies to both locations. Replacing one selected target does not
change the other.

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
test page behavior, then use `pnpm build && pnpm start web` to verify the
production server and static assets.

## Data and Storage

Foundry keeps user data outside the repository in `<home>/.foundry`. `<home>` is
`~` on macOS/Linux and `%USERPROFILE%` on Windows:

- `foundry.sqlite`: providers and their credentials, captures, and scrape jobs
- `settings.json`: application settings and capture-fetcher credentials
- `.data-transfer/`: temporary export and import files

Feature commands initialize the directory, open the SQLite database, and apply
Drizzle migrations before running. `foundry web` does the same before the server
starts. A database created by a newer schema version is rejected instead of
being modified.

On POSIX systems, Foundry creates the data directory with `0700` permissions and
sensitive files with `0600` permissions.

Agent skill copies are user-level rather than Foundry runtime data:

- `<home>/.agents/skills/foundry`
- `<home>/.claude/skills/foundry`

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
|-- skills/
|   `-- foundry/
|       |-- SKILL.md
|       `-- references/
`-- web/
    |-- assets/
    |-- index.html
    `-- favicon.png
```

`tsdown` cleans `dist`, bundles the CLI, and copies the Drizzle migrations and
agent skill. Vite then writes the Web UI directly to `dist/web`. Do not add a
manual copy step for the Web UI.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev:api` | Run the API server at `22222` |
| `pnpm dev:web` | Run the Vite Web UI at `33333` |
| `pnpm build` | Build the CLI and Web UI |
| `pnpm start web` | Run the production Web UI at `11111` |
| `pnpm start` | Print the built CLI help |
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
|-- cli/                  CLI commands, JSON I/O, and browser opening
|-- features/             Feature services, validation, repositories, and routes
|-- lib/                  Small server-side utilities
|-- server/               Hono API, static serving, and server entry points
`-- storage/              SQLite, Drizzle schema, paths, and migrations
skills/foundry/           Agent-facing CLI usage skill and references
drizzle/                  Generated migration SQL and metadata
test/                     Behavioral API and feature tests
```

`skills/foundry/SKILL.md` is the agent-facing Foundry CLI usage skill. Its
feature references live in `skills/foundry/references`.

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

The tarball must include the CLI, Web assets, Drizzle migrations, and bundled
agent skill.

## License

[Apache-2.0](LICENSE)
