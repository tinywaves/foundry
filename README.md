# @dhzh/foundry

An AI-native local developer runtime for tools, skills, agents, and workflows.

## Setup

Requires Node.js `^24.18.0` and pnpm `^11.9.0`.

```sh
pnpm install
```

## CLI

Build and start the local Web UI:

```sh
pnpm run build
node bin/index.js
```

The CLI serves the built Web UI at `http://127.0.0.1:7777` (static files from `dist/web/`).

## Web UI

The Web UI lives in [`packages/web/`](packages/web/) (workspace package `web`): Vite 8, React 19, Tailwind CSS v4, and [shadcn/ui](https://ui.shadcn.com) (`base-luma` style on `@base-ui/react`).

From the repo root:

```sh
pnpm run dev:web       # Vite dev server → http://localhost:5173
pnpm run build:web     # typecheck + production build → dist/web/
pnpm run dev:cli       # CLI watch mode (run build:web once first)
```

Inside `packages/web/`, use `pnpm run dev` and `pnpm run build`.

### shadcn/ui

Config: [`packages/web/components.json`](packages/web/components.json). Add components from `packages/web/`:

```sh
pnpm dlx shadcn@latest add button
```

Components are copied into `packages/web/src/components/ui/`.

## Project layout

| Path | Role |
|------|------|
| `src/cli/` | CLI source (`cac` + Hono) |
| `packages/web/` | Web UI workspace package |
| `packages/web/src/components/ui/` | shadcn/ui components |
| `.agents/skills/` | Agent skills for shadcn workflows |
| `bin/index.js` | Published CLI entry → `dist/cli/index.mjs` |
| `dist/cli/` | Bundled CLI |
| `dist/web/` | Web UI build output (embedded in npm tarball) |

## Learn more

- [Vite documentation](https://vite.dev)
- [shadcn/ui documentation](https://ui.shadcn.com)
- [Repository guidelines for agents](AGENTS.md)
