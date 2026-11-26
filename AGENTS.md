# AGENTS.md

Project guidance for coding agents working on Foundry.

## Product Contract

Foundry is a local personal workbench distributed as a CLI, not as a JavaScript
library. The CLI exposes settings, providers, captures, fetch jobs, and
encrypted data transfer as JSON commands. It can also copy the bundled agent
skill into `<home>/.agents/skills/foundry`,
`<home>/.claude/skills/foundry`, or both. `foundry web` prepares local storage,
starts a local Hono server, serves the bundled React Web UI, and opens the
browser.

- Keep `bin` pointed at `dist/index.mjs`.
- Publish only `dist`.
- Keep `exports` limited to `./package.json` unless the product requirement
  explicitly changes.
- Do not add a package-level JavaScript entry point.
- Keep the Node shebang in the `tsdown` banner, not in source.
- Running bare `foundry` must fall back to help without initializing storage or
  starting the Web UI.

The `foundry web` startup sequence is part of the product contract:

1. Parse CLI arguments with citty.
2. Initialize JSON storage in `<home>/.foundry`.
3. Recover interrupted JSON file transactions.
4. Start capture and data-transfer services.
5. Serve the API and bundled Web UI on `127.0.0.1:11111`.
6. Print the URL and open the browser unless `--no-open` is used.

Do not serve the production Web UI before storage initialization succeeds.

## Architecture

```text
app/web/
|-- src/app.tsx            Hash router, app shell, navigation, and titlebar
|-- src/features/          Feature pages, dialogs, API adapters, and types
|-- src/components/        Shared feature-level UI
|-- src/i18n/              Translations and locale providers
|-- src/lib/               Browser helpers and query client
|-- src/shared/            Browser-side contracts shared by Web features
|-- src/styles/globals.css shadcn preset tokens and Tailwind entry
`-- vite.config.ts         Vite, Tailwind CSS, and development proxy

src/
|-- cli/
|   |-- index.ts           CLI executable entry
|   |-- main.ts            Root command composition
|   |-- commands/          Feature and Web subcommands
|   `-- open-browser.ts    Platform-specific browser opening
|-- features/
|   |-- captures/          Capture service, fetchers, runner, repository, routes
|   |-- data-transfer/     Encrypted archive export and import
|   |-- providers/         Provider repository, model discovery, routes
|   `-- settings/          Settings, bundled skill copy, validation, routes
|-- lib/                   Small server-side utilities
|-- server/
|   |-- api.ts             API composition and feature route mounting
|   |-- app.ts             API plus static Web UI and SPA fallback
|   |-- dev.ts             Standalone API development server
|   |-- runtime.ts         Feature services, event wiring, and background startup
|   |-- start.ts           Production HTTP server
|   `-- web-root.ts        Bundled Web UI resolution
`-- storage/
    |-- index.ts           Default JSON storage initialization
    |-- store.ts           JSON records, process locking and redo recovery
    |-- models.ts          JSON record contracts and format version
    |-- validation.ts      Snapshot integrity validation
    |-- files.ts           Atomic private file writes
    `-- paths.ts           User-home Foundry paths and POSIX permissions

skills/foundry/             Agent-facing Foundry CLI usage manual and references
test/                      Behavioral tests using temporary storage
```

Keep CLI and server responsibilities separate:

- CLI code may compose the server, but must not contain API routes or
  static-file serving.
- Server code must not parse CLI arguments or open browsers.
- Put CLI subcommands in `src/cli/commands`; call feature services instead of
  reimplementing repository or business logic.
- Keep the agent-facing Foundry usage manual in `skills/foundry/SKILL.md` and
  feature-level operating details under `skills/foundry/references`.
- Put API route composition in `src/server/api.ts`.
- Keep production composition in `src/server/start.ts`.
- Keep standalone API development composition in `src/server/dev.ts`.

## Feature Boundaries

- Keep route handlers thin. Put business rules in a feature service and SQL in
  its repository.
- Keep request/response validation in feature `contracts.ts` files.
- Mount new feature routes from `src/server/api.ts`.
- Return API errors as `{ "error": { "code": string, "message": string } }`
  with a deliberate HTTP status. Unknown `/api/*` routes must remain JSON 404s.
- This local-only Web UI returns stored provider and capture API keys so edit
  forms can repopulate credentials and provider model discovery can run
  automatically. Do not log keys or expose them outside API responses.
- Keep capture job execution and retries in `FetchJobRunner`, not in route
  handlers.
- Skill copy targets are fixed user-level keys: `agents` maps to
  `<home>/.agents/skills/foundry`, and `claude` maps to
  `<home>/.claude/skills/foundry`, where `<home>` is `os.homedir()` (`~` on
  POSIX and `%USERPROFILE%` on Windows). Do not expose arbitrary filesystem
  paths through the API or CLI for this feature.
- Treat `.foundry-backup` archive versions and manifest validation as
  compatibility contracts. Change them only with focused validation and
  round-trip tests.

## Web UI Rules

- The active Web UI lives in `app/web` and uses React, Vite, Tailwind CSS v4,
  and shadcn/ui with preset `b27GcrRo` (`base-rhea`, neutral, Inter, Lucide).
- Keep feature code under `app/web/src/features`; each feature owns its pages,
  dialogs, adapters, and types.
- Keep the shell, navigation, titlebar, and hash router in `app/web/src/app.tsx`.
- Generate shadcn components into `app/web/src/components/ui`; this directory and
  the generated `app/web/src/hooks/use-mobile.ts` are excluded from ESLint.
  Application components and business code must still pass ESLint.
- Use the official `@tailwindcss/vite` plugin. Keep preset tokens and the CSS
  entry in `app/web/src/styles/globals.css`; use Tailwind for business styling.
- Preserve existing page composition, responsive behavior, interactions, and
  business rules. Component appearance follows the preset.
- Do not reintroduce Electron-only titlebar drag regions or macOS traffic-light
  padding into the Web UI.
- Do not introduce Next.js. The Web UI is a client-side React application.

See `app/web/AGENTS.md` for additional Web-specific guidance.

## Development and Ports

Development runs as two independent processes:

```bash
pnpm dev:api
pnpm dev:web
```

- Web dev server: `http://localhost:33333`
- API dev server: `http://localhost:22222`
- Production Web UI: `http://localhost:11111`

Vite proxies `/api` from the Web dev server to the API server. Ports are fixed
and strict; do not add environment-variable or CLI port overrides unless
explicitly requested.

There is intentionally no CLI dev command. Test page behavior with the Web and
API development servers. Rebuild `dist` to test production static serving.

## Build and Packaging

`pnpm build` must remain:

1. Build and clean the CLI with `tsdown`.
2. Copy the agent skill into `dist/skills` with `tsdown`.
3. Build the Web UI directly to `dist/web` with Vite.

- Do not add a manual Web UI copy step.
- Keep `app/web/vite.config.ts` `build.outDir` pointed at `../../dist/web`.
- Keep `tsdown.config.ts` `entry` pointed at `src/cli/index.ts`.
- Keep skill copying in `tsdown.config.ts`; packaged CLI builds must not depend
  on the repository `skills/` directory at runtime.
- Keep TypeScript and `@types/node` versions in the pnpm catalog.
- `pnpm start` runs `node dist/index.mjs`; it does not build implicitly.
- Verify packaging with `pnpm pack --dry-run`. The tarball must contain
  `dist/index.mjs`, `dist/web`, and `dist/skills/foundry`.

## Storage

- Runtime data belongs in `<home>/.foundry`, outside the repository and
  `dist`. `<home>` is `os.homedir()` on every supported platform.
- Store settings in `settings.json` and all providers in the `providers.json`
  array. Captures and fetch jobs each have one JSON file per record in their
  collection directories. Provider avatars are optional base64 image data URLs.
- `src/storage/models.ts` owns record contracts and the JSON format version.
- Use `FoundryStorage` transactions for writes. Keep process locking, atomic
  replacement and redo recovery inside the storage module. Read JSON files
  directly on each request; do not introduce cross-request caches or manifests.
- Preserve active-URL uniqueness, one active job per capture and valid capture/job
  references in repositories and snapshot validation.
- Preserve POSIX `0700` directories and `0600` files.
- New storage starts from default settings and empty JSON collections. Startup
  does not import old SQLite databases.
- Node's built-in SQLite is limited to the external, read-only Codex session
  adapter. Foundry persists only JSON.
- Export and import JSON snapshots only. Verify format changes with validation
  and encrypted round-trip tests.
- Tests use temporary directories; never run imports or mutating
  commands against the developer's real `<home>/.foundry` data.

## Generated Files

`dist/` is generated output. Change source and build configuration instead of
editing files there.

## Verification

After changing active source files:

```bash
pnpm exec eslint src app/web/src app/web/vite.config.ts vitest.config.ts tsdown.config.ts package.json
pnpm --filter web exec tsc --noEmit
pnpm build
pnpm test
git diff --check
```

Use targeted ESLint checks for active code when the repository-wide lint scope
includes files outside the current implementation.

Only add tests for meaningful behavior. Prefer API-level, repository-level, or
user-visible behavior over implementation-detail tests. Do not keep placeholder
tests for static-file serving or the health endpoint.

For Web startup, server, or static-serving changes, smoke-test the production
flow:

```bash
pnpm build
node dist/index.mjs web --no-open
curl http://localhost:11111/
curl http://localhost:11111/api/health
```

For feature CLI changes, smoke-test the affected command against temporary
`HOME` storage. Do not point mutating command tests at the developer's real home
directory.

For Skill changes, rebuild and verify `dist/skills/foundry` matches
`skills/foundry`. Smoke-test
`foundry settings download-skill --target .agents,.claude` with temporary
`HOME` and confirm only the selected user-level target directories are written.

For API development changes, also verify the standalone API server:

```bash
pnpm dev:api
curl http://localhost:22222/api/health
```

For Web UI changes, test the real interaction in a browser, including hover,
dialog, empty, loading, error, collapsed-sidebar, and narrow-viewport states
affected by the change. Do not rely on TypeScript or a successful build as proof
that visual behavior is correct.
