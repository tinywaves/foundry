# Foundry Web

React Web UI built with Vite, Tailwind CSS v4, and shadcn/ui preset `b1D0dv72`
(Base UI Mira, neutral, Inter, Lucide).

## Current scope

Settings is the implemented feature. Preserve the main layout, sidebar, titlebar,
and placeholder routes under `src/app`; these are the application skeleton.
`src/app.tsx` composes the hash router and providers. Root and unknown routes
open Dashboard, while `#/settings` opens Settings with Appearance selected.
Settings has its own full-screen layout; its back button returns one browser
history entry.

Settings includes Appearance, Language & Region, and Advanced. Categories use
`#/settings?panel=appearance`, `#/settings?panel=language-region`, and
`#/settings?panel=advanced`. The selected category survives reload and supports
browser back/forward. See [Settings implementation](../../docs/settings.md).

Other feature APIs are retained on the backend. Remaining `legacy-src` code is
reference material, excluded from the active Web build; the old Settings code
has been removed. It is not a second active implementation.

## Development

From the repository root, run `pnpm dev:api` and `pnpm dev:web` separately. From
this directory, use:

```bash
pnpm dev
pnpm exec tsc --noEmit
pnpm build
```

The Web dev server runs at `http://localhost:33333` and proxies `/api` to the API
server at `http://localhost:22222`. Vite writes production assets directly to
`../../dist/web`. Use the root `pnpm build` before testing `foundry web`, so both
the CLI/server bundle and the Web assets are current.

## Implementation rules

Feature pages, dialogs, and adapters live in `src/features`; reusable business
components live in `src/components`. Shared server/Web contracts come from
`@dhzh/foundry-shared`. React Query owns server state. All UI text uses the existing
i18n resources (English, Simplified Chinese, Traditional Chinese, and Japanese).

Generate primitives with `pnpm dlx shadcn@latest add <component>` using
`components.json`. Generated `src/components/ui` files and
`src/hooks/use-mobile.ts` are excluded from ESLint; application code remains
linted. Preserve the preset tokens in `src/styles/globals.css`.

See [AGENTS.md](AGENTS.md) for coding and verification rules, and
[DESIGN.md](DESIGN.md) for current layout and interaction behavior.
