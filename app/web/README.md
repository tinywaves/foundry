# Foundry Web

React Web UI for the Foundry CLI, built with Vite, Astryx, and StyleX.

The UI is kept visually aligned with the Electron application. Features live
under `src/features`; each feature owns its page, dialogs, local styles, types,
and browser-facing API adapter. The shell and router live in `src/app.tsx`.

```bash
pnpm dev
pnpm build
```

The dev server runs at `http://localhost:33333` and proxies `/api` to the
standalone API server at `http://localhost:22222`.

The production build is written directly to `../../dist/web` and is served by
the Foundry CLI.
