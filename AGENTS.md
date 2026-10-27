# AGENTS.md

Project guidance for coding agents working on Foundry.

## Product

Foundry is distributed as a CLI, not as a JavaScript library. The CLI starts a
local Hono server, serves the bundled React Web UI, and opens the browser.

Do not expose a package-level JavaScript entry unless the product requirement
changes. Keep `bin` and the Web UI assets as the public surface.

## Architecture

```text
app/web/                 React Web UI built with Rsbuild
src/cli/                 CLI arguments, output, and browser opening
src/server/api.ts        Hono API routes
src/server/app.ts        API plus static Web UI and SPA fallback
src/server/start.ts      production HTTP server
src/server/dev.ts        standalone API development server
src/server/web-root.ts   resolves bundled dist/web assets
```

Keep CLI and server responsibilities separate:

- CLI code may call the server, but must not contain API routes or static-file
  serving.
- Server code must not parse CLI arguments or open browsers.
- Put API routes in `src/server/api.ts`.
- Keep production composition in `src/server/app.ts`.

## Commands

Install dependencies:

```bash
pnpm install
```

Development runs as two independent processes:

```bash
pnpm dev:api
pnpm dev:web
```

- Web dev: `http://localhost:33333`
- API dev: `http://localhost:22222`
- Rsbuild proxies `/api` to the API dev server.

There is intentionally no CLI dev command. Test page behavior through the Web
dev server and API dev server.

Build and run:

```bash
pnpm build
pnpm start
```

The CLI entry is `src/cli/index.ts`. `tsdown` writes `dist/index.mjs` and injects
the Node shebang through `banner`.

## Fixed Ports

Ports are hard-coded while the local development flow is being established:

- Web dev server: `33333`
- API dev server: `22222`
- Production CLI entry: `11111`

Do not add environment-variable or CLI port overrides unless explicitly
requested.

## Build Contract

`pnpm build` must remain:

1. Build and clean the CLI with `tsdown`.
2. Build the Web UI directly to `dist/web` with Rsbuild.

Do not add a manual copy step. `app/web/rsbuild.config.ts` owns the output path.
Keep `output.distPath.root` pointed at `../../dist/web`.

Do not introduce Next.js. The Web UI is a client-side React application built
with Rsbuild.

## Package Rules

- The package is CLI-only; keep `bin` pointed at `dist/index.mjs`.
- Publish only `dist`.
- Keep the CLI shebang in the `tsdown` banner, not in source.
- Keep TypeScript and `@types/node` versions in the pnpm catalog.
- Verify packaging with `pnpm pack --dry-run`; the tarball must include
  `dist/index.mjs` and `dist/web`.

## Verification

After changing active source files:

```bash
pnpm exec eslint src app/web/rsbuild.config.ts vitest.config.ts tsdown.config.ts package.json
pnpm build
pnpm test
git diff --check
```

`pnpm lint` still scans legacy files under `backups/` and may report unrelated
historical errors. Use targeted ESLint checks for active code unless the
backup directory is explicitly cleaned up.

Only add tests for meaningful behavior. Do not keep placeholder tests for
static-file serving or the health endpoint. `pnpm test` currently has no active
test files and must pass.

For server-related changes, smoke-test the real flow:

```bash
curl http://localhost:11111/
curl http://localhost:11111/api/health
```

For API development changes, also verify the separate API server:

```bash
curl http://localhost:22222/api/health
```
