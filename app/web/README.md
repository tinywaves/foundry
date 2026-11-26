# Foundry Web

React Web UI for the Foundry CLI, built with Vite, Tailwind CSS v4, and shadcn/ui.

The UI uses preset `b27GcrRo` (Base UI Rhea, neutral, Inter, Lucide). Existing
page layouts, responsive rules, and business interactions remain intact. Features live
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

Generate components with `pnpm dlx shadcn@latest add <component>`. The configuration
is in `components.json`; generated `src/components/ui` components and
`src/hooks/use-mobile.ts` are excluded from ESLint. Business components remain
linted. See `DESIGN.md` for layout and interaction constraints.
