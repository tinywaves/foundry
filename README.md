# @dhzh/foundry

An AI-native local developer runtime for tools, skills, agents, and workflows.

## Setup

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

The Web UI lives in [`packages/web/`](packages/web/) as `@dhzh/foundry-web` (Rsbuild, React 19, Tailwind CSS v4).

From the repo root:

```sh
pnpm run dev:web       # Rsbuild dev server (--open) → http://localhost:3000
pnpm run build:web     # production build → dist/web/
pnpm run preview:web   # preview production build locally
pnpm run dev:cli       # CLI watch mode (run build:web once first)
```

Inside `packages/web/`, the same workflows use `pnpm run dev`, `build`, and `preview`.

## Project layout

| Path | Role |
|------|------|
| `src/cli/` | CLI source (`cac` + Hono) |
| `packages/web/` | Web UI workspace package |
| `bin/index.js` | Published CLI entry → `dist/cli/index.mjs` |
| `dist/cli/` | Bundled CLI |
| `dist/web/` | Web UI build output (embedded in npm tarball) |

## Learn more

- [Rsbuild documentation](https://rsbuild.rs)
- [Rsbuild GitHub](https://github.com/web-infra-dev/rsbuild)
