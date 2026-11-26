# Foundry

Foundry is an AI-native local personal workbench distributed as a CLI. Its
settings, providers, captures, fetch jobs, encrypted data transfer, and bundled
agent skill copy are available as JSON CLI commands for both people and agents.
`foundry web` prepares local storage, starts a Hono server, serves the bundled
React Web UI, and opens it in the default browser.

The package is intentionally CLI-only. It does not expose a JavaScript library
entry point.

## Features

- Manage model providers using OpenAI Responses, Anthropic Messages, or
  OpenAI-compatible Chat Completions protocols.
- Discover provider models and keep custom model IDs alongside remote models.
- Save links as agent-facing index cards using the configured capture fetcher,
  run background jobs with retries, and inspect the raw fetcher response.
- Configure appearance, language and region, capture behavior, and concurrency.
- Export and import an encrypted `.foundry-backup` snapshot containing the
  JSON records and application settings.
- Copy the bundled agent skill into `<home>/.agents/skills/foundry`,
  `<home>/.claude/skills/foundry`, or both from the CLI or Settings > Advanced.

## Requirements

- Node.js 24.22.1 or newer
- pnpm 12.15 or newer

Foundry stores its own data as JSON files. No native SQLite package is required.

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
`data-transfer import` validates and replaces local JSON records and settings in
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

- `settings.json`: application settings
- `providers.json`: an array of providers, credentials, and optional base64 avatars
- `captures/<record-key>.json`: captures
- `fetch-jobs/<record-key>.json`: fetch jobs, configuration snapshots and responses
- `.data-transfer/`: temporary export and import files

Capture and fetch-job filenames use a SHA-256 key of the record ID for portable, collision-safe
paths; the original ID is preserved inside each document.

Feature commands initialize JSON storage before running. `foundry web` does the
same before the server starts. A process lock serializes writers and protects
consistent reads. Writes use temporary-file replacement and a durable redo
journal; interrupted committed writes are completed on the next open. Each read
loads the requested JSON files directly; no cross-request cache or manifest is
required.

A new installation starts directly with default JSON settings and empty
collections directly under `.foundry`, without a `data/` subdirectory. Startup
does not inspect or import old SQLite databases. Unrelated files are left alone.
The read-only Sessions view reads Codex and Claude Code JSONL transcripts, including
Zstandard-compressed files. It does not read their databases, global state, or
session indexes. Threads are grouped by the working directory recorded in their
transcripts; Codex project membership and later UI-only renames are not imported.
Existing `providers/` records are automatically migrated into `providers.json`
under the process lock using the recovery journal. Provider avatars accept PNG,
JPEG, GIF, WebP, or SVG images up to 2 MB; clearing an avatar restores the default icon.

Encrypted exports and imports use JSON snapshots in `data/foundry.json`.
SQLite-based backup archives are not supported.

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
|-- skills/
|   `-- foundry/
|       |-- SKILL.md
|       `-- references/
`-- web/
    |-- assets/
    |-- index.html
    `-- favicon.png
```

`tsdown` cleans `dist`, bundles the CLI, and copies the bundled
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
`-- storage/              JSON records, process locking, and transaction recovery
skills/foundry/           Agent-facing CLI usage skill and references
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

The tarball must include the CLI, Web assets, and bundled
agent skill.

## License

[Apache-2.0](LICENSE)
