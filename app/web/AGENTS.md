# Web UI Guidance

The Electron renderer is the visual source of truth. Keep its layout, StyleX
rules, translations, and Astryx component usage when adapting the Web UI.

## Boundaries

- Keep feature code under `src/features`. Each feature owns its page, dialogs,
  local styles, types, and browser API adapter.
- Keep the app shell, navigation, titlebar, and router in `src/app.tsx`.
- Keep `src/components` limited to shared feature-level UI.
- Keep browser helpers under `src/lib` and translations under `src/i18n`.
- Keep shared renderer contracts in `src/shared`.
- Keep `src/layer-order.css` as the first CSS import in `src/index.tsx`; it
  preserves Astryx and StyleX layer precedence.
- Keep StyleX integration in `vite.config.ts`; do not add a custom StyleX
  runtime or bundler compatibility layer.
- Do not add a `@renderer` alias. Use relative imports within the Web app.

## Commands

```bash
pnpm dev
pnpm build
pnpm exec tsc --noEmit
```

The development server runs at `http://localhost:33333` and proxies `/api` to
the standalone API server at `http://localhost:22222`.

## Verification

Compare renderer changes against the Electron app at `900x670`. Check the
overview, providers, provider form, captures, prompts, settings panels, capture
dialog, collapsed sidebar, and a narrow viewport.

Avoid migrating Electron-specific window APIs. Browser equivalents belong in
the adapter layer; purely native actions may become no-ops in the Web UI.
