# Foundry

Foundry is a local personal workbench distributed as a CLI with a bundled Web UI.
People and agents can use the CLI to manage instructions and settings, export or
import encrypted backups, and install the bundled Foundry Skill.

## Current scope

The current Web UI implements Instructions and Settings. The CLI exposes
`instructions`, `agents`, and `settings` business command groups. Instructions
supports creating, editing, deleting, and listing Markdown instruction files
from the Web UI or CLI, and the Web page and CLI assign them to ChatGPT and
Claude Code.
Settings covers appearance, language and region, and Advanced actions, including
encrypted backups and bundled Skill installation. The main layout and sidebar
remain available, with placeholder routes for features not implemented yet. The
root route opens Dashboard; opening Settings without a category shows Appearance.

Provider, capture, fetch-job, and session backend services and APIs are retained.
Their presence does not imply a corresponding page or CLI command in the current
product. `app/web/legacy-src` holds remaining reference code; its Settings
implementation has been removed. Keeping the current scope focused on
Instructions and Settings does not mean removing the application shell or other
backend capabilities.

## Requirements and startup

Use Node.js and pnpm versions compatible with `package.json` (currently Node.js
24.22.1 or newer within major 24, and pnpm 12.15 or newer within major 12).

```bash
pnpm install
pnpm build
pnpm start web
```

The installed command is `foundry`. The package exposes a CLI executable, not a
JavaScript library entry point.

```bash
foundry web
foundry web --no-open
foundry --help
foundry --version
```

`foundry web` initializes JSON storage, starts the local Hono server at
`http://localhost:11111`, serves the bundled React UI, and opens the browser.
`--no-open` starts the same server without opening a browser. Bare `foundry`
prints help without initializing storage. `pnpm start` runs the built CLI and
does not build implicitly.

## Settings

```bash
foundry settings get
foundry settings get color-theme
foundry settings set color-theme dark
foundry settings set language zh-CN
foundry settings set time-zone Asia/Shanghai
foundry settings set time-format "YYYY-MM-DD HH:mm:ss"
foundry settings get config-folder
foundry settings config-folder open
```

`get` returns a flat JSON object containing the four editable settings and the
read-only `config-folder`. `get <key>` returns a JSON string, and
`set <key> <value>` returns `{ "key": "...", "value": "..." }`. Invalid values
are rejected. Use `foundry settings set --help` or the
[Settings reference](skills/foundry/references/settings.md) for all supported
keys and values.
Settings commands return JSON on stdout and operation errors on stderr with a
nonzero exit code. Help, version, and Web startup output are human-readable.

Web clients receive settings changes from other tabs and CLI processes while
the server is running. Settings categories can be opened directly:

- `#/settings?panel=appearance`
- `#/settings?panel=language-region`
- `#/settings?panel=advanced`

Omitted or invalid `panel` values select Appearance. Timezone names are localized;
the stored values remain IANA timezone identifiers. The full-screen Settings back
button returns one step through browser history.

## Instructions

Create an instruction with a required name and Markdown content:

```bash
foundry instructions new \
  --name "Release checklist" \
  --content "# Release

- Run tests
- Check the changelog"
```

Quote content containing spaces or newlines. Names are trimmed and limited to
200 characters; content must be non-empty and is capped at 1,000,000 characters.
The command prints the stored instruction as JSON. The Web UI exposes the same
creation flow at `#/library/instructions` and renders the stored instructions
newest first.

List all instructions, newest first:

```bash
foundry instructions list
```

The command prints a JSON array in the same shape as the creation result. Use
the Web page or `GET /api/instructions` for the same ordered list.

Read one instruction or replace its name and Markdown content:

```bash
foundry instructions get <id>
foundry instructions edit <id> \
  --name "Release checklist" \
  --content "# Release

- Run tests"
```

`edit` requires both fields, trims the name, preserves the ID and creation time,
and advances `updatedAt`. It changes the instruction record only; reapply any
enabled agent that uses it to rewrite the managed block.

Delete an unused instruction:

```bash
foundry instructions delete <id>
```

Deletion removes the Markdown file. It is rejected with
`INSTRUCTION_IN_USE` while any agent assignment still references the
instruction; clear the assignment from every agent first. The command prints
the deleted record as JSON.

Instructions are stored as individual Markdown files at
`<home>/.foundry/instructions/<id>.md`. Each file has YAML frontmatter for the
ID, name, and timestamps; timestamps are Unix epoch milliseconds. The Markdown
body is preserved unchanged. The API
provides list/create and `GET`/`PUT`/`DELETE /api/instructions/:id`. In the Web
UI, selecting an instruction opens the editor directly; right-clicking a row
opens Edit and Delete actions. See
[Instructions implementation](docs/instructions.md).

## Agent orchestration

The Instructions page composes saved instructions into two fixed agent files:

- ChatGPT: `~/.codex/AGENTS.md`
- Claude Code: `~/.claude/CLAUDE.md`

Desktop layouts show instructions on the left and agent cards on the right.
Drag an instruction into an agent to assign it; drag assigned rows to reorder
them. Each agent accepts an instruction only once. The switch applies or removes
Foundry's managed block without affecting other file content, and Reapply
rewrites the current block.

Foundry writes exactly one managed block using the selected markers:

```md
<!-- foundry:instructions:start -->

...assigned instructions in order...

<!-- foundry:instructions:end -->
```

Assignment state is stored under `<home>/.foundry/agents`. Each file keeps the
agent `id` at the top level and instruction state under an `instructions`
namespace. The Web page uses `/api/agents`; the equivalent CLI operations are:

```bash
foundry agents list
foundry agents instructions list [agent]
foundry agents instructions assign chatgpt --instructions <id1>,<id2>
foundry agents instructions enable chatgpt
foundry agents instructions reapply chatgpt
foundry agents instructions disable chatgpt
foundry agents instructions open chatgpt
```

See [Agent orchestration](docs/agents.md) for the CLI, API, behavior, and block
rules.

## Backups and agent Skill

Settings > Advanced provides Export, Import, Config Folder, and Download Skill.
The equivalent CLI operations are:

```bash
foundry settings export --output ./backup.foundry-backup
foundry settings import ./backup.foundry-backup
foundry settings download-skill --target .agents,.claude
```

Backup passphrases use `FOUNDRY_PASSPHRASE` or `--passphrase`. Export rejects an
existing destination unless `--force` is supplied. Import normalizes backup data
and replaces the supported data completely. The current backup payload contains
settings, including settings retained for backend features; it is not a copy of
all runtime files. Instructions, agent assignments, providers, captures, and
fetch jobs are outside this payload. Web import reloads the page without the hash
route and enters the normal root route. See
[backup behavior and format](docs/data-export.md).

Download Skill installs Foundry's agent usage manual, which teaches agents how
to operate the installed Foundry CLI. It copies to selected user-level targets:

- `.agents` → `<home>/.agents/skills/foundry`
- `.claude` → `<home>/.claude/skills/foundry`

`<home>` is the operating system's user home directory. Existing copies at
selected targets are replaced; unselected targets are left alone.

## Development

Run the API and Web dev servers separately:

```bash
pnpm dev:api
pnpm dev:web
```

| Process | URL | Purpose |
| --- | --- | --- |
| Vite Web | `http://localhost:33333` | UI development; proxies `/api` to the API dev server |
| Hono API | `http://localhost:22222` | Standalone API development |
| Production Web | `http://localhost:11111` | Built CLI, API, and bundled Web assets |

Ports are fixed. There is no CLI dev command. Rebuild after source changes when
testing the packaged CLI or production Web flow.

```bash
pnpm exec eslint src app/web/src packages/shared/src app/web/vite.config.ts vitest.config.ts tsdown.config.ts package.json
pnpm exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
pnpm build
pnpm test
git diff --check
```

Use temporary `HOME` storage for mutating CLI or import tests. For UI changes,
verify the affected behavior in a browser as well as running static checks.

## Storage and packaging

Runtime data lives in `<home>/.foundry`, outside the repository and `dist`:

- `settings.json`: normalized application settings
- `providers.json`: retained provider records
- `captures/` and `fetch-jobs/`: one JSON file per retained record
- `instructions/`: one Markdown instruction file per record
- `agents/`: one JSON agent profile per record, including the `instructions`
  capability state

Foundry uses process locking, atomic replacement, and a redo journal for JSON
transactions. Reads load files directly. Startup recovers committed interrupted
writes; a new installation uses default settings and empty collections. Foundry
does not import old SQLite databases. The retained Sessions backend reads external
Codex and Claude Code JSONL transcripts, including `.jsonl.zst` files, read-only.
On POSIX, Foundry runtime directories use `0700` and data files use `0600`.

`pnpm build` bundles the CLI with tsdown, copies the Skill into `dist/skills`,
then builds the Web UI directly into `dist/web` with Vite:

```text
dist/
|-- index.mjs
|-- skills/foundry/
`-- web/
```

The published payload is `dist` plus package metadata and standard root files
included by the package manager. `bin` points to `dist/index.mjs`; `exports`
exposes only `./package.json`. Verify with `pnpm pack --dry-run`.

## Documentation

- [Development constraints](AGENTS.md): architecture, storage, and verification
- [Web development](app/web/README.md) and [design rules](app/web/DESIGN.md)
- [Instructions implementation](docs/instructions.md): Web list, view, edit, API, CLI, and file format
- [Agent orchestration](docs/agents.md): fixed agent files, drag state, CLI/API, and managed block rules
- [Settings implementation](docs/settings.md): routing, synchronization, and API boundaries
- [Data export and import](docs/data-export.md): normalization, replacement, and format
- [Foundry Skill](skills/foundry/SKILL.md): installed CLI usage for agents
- [Sessions vocabulary](GLOSSARY.md): retained backend domain terms
- [ADRs](docs/adr/): decisions with current backend and historical UI scope identified
- [Chatbot research](docs/research/chatbot-api-and-persistence.md): historical proposal

## License

[Apache-2.0](LICENSE)
