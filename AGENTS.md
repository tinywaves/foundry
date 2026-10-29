# AGENTS.md

Project guidance for coding agents working on Foundry.

## Product Contract

Foundry is a local personal workbench distributed as a CLI, not as a JavaScript
library. The CLI exposes settings, providers, captures, scrape jobs, and
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
2. Initialize `<home>/.foundry` and open the SQLite database.
3. Apply packaged Drizzle migrations.
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
|-- src/layer-order.css    StyleX layer precedence
`-- vite.config.ts         Vite, Astryx/StyleX, and development proxy

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
    |-- database.ts        SQLite connection, migrations, and schema version
    |-- paths.ts           User-home Foundry paths and POSIX permissions
    `-- schema.ts          Drizzle table definitions

skills/foundry/             Agent-facing Foundry CLI usage manual and references
drizzle/                   Generated migration SQL and metadata
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
- Keep capture job execution and retries in `ScrapeJobRunner`, not in route
  handlers.
- Skill copy targets are fixed user-level keys: `agents` maps to
  `<home>/.agents/skills/foundry`, and `claude` maps to
  `<home>/.claude/skills/foundry`, where `<home>` is `os.homedir()` (`~` on
  POSIX and `%USERPROFILE%` on Windows). Do not expose arbitrary filesystem
  paths through the API or CLI for this feature.
- Treat `.foundry-backup` archive versions and manifest validation as
  compatibility contracts. Change them only with focused migration and
  round-trip tests.

## Web UI Rules

- The active Web UI lives in `app/web` and uses React, Vite, Astryx, and StyleX.
- Keep feature code under `app/web/src/features`; each feature owns its pages,
  dialogs, adapters, types, and local styling.
- Keep the shell, navigation, titlebar, and hash router in
  `app/web/src/app.tsx`.
- Use Vite plus the official `@stylexjs/unplugin`. Do not add a custom StyleX
  runtime, compatibility injector, or Rsbuild integration.
- Keep `src/layer-order.css` as the first CSS import in
  `app/web/src/index.tsx`. Vite otherwise emits Astryx layers before StyleX
  priority layers and breaks low-specificity rules such as hover backgrounds.
- Preserve the Astryx visual language. The Electron renderer is the visual
  reference, but do not copy its directory structure or native window APIs.
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
2. Copy Drizzle migrations into `dist/drizzle` and the agent skill into
   `dist/skills` with `tsdown`.
3. Build the Web UI directly to `dist/web` with Vite.

- Do not add a manual Web UI copy step.
- Keep `app/web/vite.config.ts` `build.outDir` pointed at `../../dist/web`.
- Keep `tsdown.config.ts` `entry` pointed at `src/cli/index.ts`.
- Keep migration copying in `tsdown.config.ts`; packaged CLI builds must not
  depend on the repository `drizzle/` directory at runtime.
- Keep skill copying in `tsdown.config.ts`; packaged CLI builds must not depend
  on the repository `skills/` directory at runtime.
- Keep TypeScript and `@types/node` versions in the pnpm catalog.
- `pnpm start` runs `node dist/index.mjs`; it does not build implicitly.
- Verify packaging with `pnpm pack --dry-run`. The tarball must contain
  `dist/index.mjs`, `dist/web`, `dist/drizzle`, and `dist/skills/foundry`.

## Storage and Migrations

- Runtime data belongs in `<home>/.foundry`, never in the repository or `dist`.
  `<home>` is `os.homedir()`: `~` on macOS/Linux and `%USERPROFILE%` on Windows.
- `src/storage/schema.ts` is the schema source of truth.
- Generate migrations with `pnpm db:generate`; commit the SQL and `meta/`
  files. Do not hand-edit generated migrations.
- The CLI and API development server apply migrations automatically. Do not add
  a second migration path with different behavior.
- Increment `CURRENT_DATABASE_SCHEMA_VERSION` when the persisted SQLite
  structure changes.
- Keep `resolveMigrationsRoot()` compatible with packaged execution and local
  development.
- On POSIX, preserve the intended `0700` directory and `0600` file permissions.
- Tests must use temporary directories. Never point tests or destructive
  migration experiments at the developer's real `<home>/.foundry` data.

## Generated Files

`dist/` is generated output. Change source and build configuration instead of
editing files there.

## Verification

After changing active source files:

```bash
pnpm exec eslint src app/web/src app/web/vite.config.ts vitest.config.ts tsdown.config.ts drizzle.config.ts package.json
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
