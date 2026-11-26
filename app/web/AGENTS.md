# Web UI Guidance

Use shadcn/ui preset `b27GcrRo`: Base UI Rhea, neutral colors, Inter, and Lucide.
Preserve page layouts, responsive rules, content, and behavior while allowing
components to use their preset appearance.

## Boundaries

- Keep feature code under `src/features`. Each feature owns its page, dialogs,
  local styles, types, and browser API adapter.
- Keep the app shell, navigation, titlebar, and router in `src/app.tsx`.
- Keep `src/components` limited to shared feature-level UI.
- Keep browser helpers under `src/lib` and translations under `src/i18n`.
- Keep shared renderer contracts in `src/shared`.
- Generate shadcn components into `src/components/ui`. Keep generated components
  and `src/hooks/use-mobile.ts` excluded from ESLint; lint application code.
- Use Tailwind CSS v4 through `@tailwindcss/vite`; keep preset tokens and global
  CSS in `src/styles/globals.css`. Do not reintroduce Astryx or StyleX.
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

Check the Web UI at `900x670` and narrow viewports. Check the
overview, providers, provider form, captures, prompts, settings panels, capture
dialog, collapsed sidebar, and a narrow viewport.

Avoid migrating Electron-specific window APIs. Browser equivalents belong in
the adapter layer; purely native actions may become no-ops in the Web UI.
