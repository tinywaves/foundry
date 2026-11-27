# Web UI Guidance

Use shadcn/ui preset `b1D0dv72`: Base UI Mira, neutral colors, Inter, and Lucide.
Preserve page layouts, responsive rules, content, and behavior while allowing
components to use their preset appearance.

## Boundaries

- Keep feature code under `src/features`. Each feature owns its page, dialogs,
  local styles, types, and browser API adapter.
- Keep router composition and providers in `src/app.tsx`, with layouts and
  navigation definitions in `src/app`. Preserve the main shell and placeholder
  routes while implementing Instructions and Settings.
- Keep `src/components` limited to shared feature-level UI.
- Keep browser helpers under `src/lib` and translations under `src/i18n`.
- Import contracts shared with the server from `@dhzh/foundry-shared`; do not
  recreate a browser-local copy.
- Use React Query for server state. Keep connection lifecycle and DOM theme or
  language updates separate from fetching. See `../../docs/settings.md` for the
  current Settings routes, synchronization, and API boundaries.
- Instructions lives at `#/library/instructions`. Page actions use
  `PageHeaderActions`; desktop layouts show the instruction list on the left and
  agent cards on the right, stacking on narrow screens. The creation dialog keeps
  name and Markdown content required and uses the shared local Monaco editor
  setup. See `../../docs/instructions.md`.
- Agent assignment, drag/reorder, switch, Reapply, and file-opening state belong
  to `src/features/agents`. The instruction list belongs to
  `src/features/instructions` and remains the drag source. Use the shared `Agent`
  contracts and render agent IDs, names, paths, and icons returned or defined by
  the server contract. See `../../docs/agents.md`.
- Settings categories use the `panel` query parameter; omitted or invalid values
  select Appearance. The app root still opens Dashboard. Full-screen back uses
  browser history.
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

Check affected interactions at `900x670` and narrow viewports: instruction
creation, required labels, Markdown source preservation, Settings category links
and browser history, realtime synchronization, localized labels, Advanced
dialogs, hover/focus, and loading, disabled, and error states. For layout or
navigation changes, also verify main-sidebar collapse, mobile navigation, and
full-screen return behavior. Remaining legacy code is reference only; its
Settings implementation has been removed.

Avoid migrating Electron-specific window APIs. Browser equivalents belong in
the adapter layer; purely native actions may become no-ops in the Web UI.
