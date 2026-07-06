# 001 — Admin Shell Layout

## Goals

- Build a standard admin shell (left sidebar + right content area) with **React Router 8 Hash routing** and **shadcn Sidebar**
- Lock the entire page to the viewport: no document-level scroll, no iOS Safari rubber-band bounce
- Only the right-hand `<main>` scrolls internally; header and sidebar stay fixed
- Two placeholder pages (`dashboard`, `settings`) to verify nested routing keeps the shell mounted

## Layout

```
┌─────────────────────────────────────────────────┐
│ h-dvh overflow-hidden (html/body/#root)         │
│ ┌──────────┬──────────────────────────────────┐ │
│ │ Sidebar  │ Header (shrink-0)                │ │
│ │          ├──────────────────────────────────┤ │
│ │          │ main (flex-1 min-h-0 overflow-y) │ │
│ │          │   <Outlet />                     │ │
│ └──────────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Scroll rules

1. **Document** (`main.css`): `html, body, #root` → `h-dvh overflow-hidden overscroll-none`
2. **Shell** (`AppShell`): `flex h-dvh w-full overflow-hidden`; `SidebarInset` → `flex min-h-0 flex-1 flex-col overflow-hidden`
3. **Content** (only scroll container): `<main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">`

## Routing

Hash routing via `createHashRouter`. URLs: `/#/dashboard`, `/#/settings`. No CLI SPA fallback required.

```tsx
createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

## shadcn Components (prerequisite)

Before implementing layout code, install shadcn UI components via CLI. These copy source files into `packages/web/src/components/ui/` (not npm runtime deps in most cases):

| Component | Purpose |
|-----------|---------|
| `sidebar` | Shell layout (`SidebarProvider`, `SidebarInset`, `SidebarTrigger`) |
| `separator` | Sidebar dependency |
| `sheet` | Mobile sidebar overlay |
| `tooltip` | Sidebar dependency |
| `breadcrumb` | Content area header |

```bash
cd packages/web
pnpm dlx shadcn@latest add sidebar separator sheet tooltip breadcrumb
```

After running, check `packages/web/package.json` for any new entries and update **Dependency Changes** below if needed.

## Files

| File | Role |
|------|------|
| `packages/web/src/routes.tsx` | Hash router definition |
| `packages/web/src/components/layout/app-shell.tsx` | `SidebarProvider` + viewport shell + scrollable main |
| `packages/web/src/components/layout/app-sidebar.tsx` | Sidebar navigation |
| `packages/web/src/pages/dashboard.tsx` | Placeholder with long content |
| `packages/web/src/pages/settings.tsx` | Placeholder |
| `packages/web/src/main.css` | Viewport lock base styles |
| `packages/web/src/main.tsx` | `RouterProvider` mount |

## Dependency Changes

### Add (dependencies)

- (none — `react-router` already in `packages/web/`)

### Add (devDependencies)

- (none — unless shadcn CLI adds packages; see commands below)

### Remove (dependencies)

- (none)

### Remove (devDependencies)

- (none)

### Commands (manual only)

```bash
cd packages/web
pnpm dlx shadcn@latest add sidebar separator sheet tooltip breadcrumb
```

## Verification

1. `pnpm run dev:web` → `http://localhost:5173`
   - Page height equals viewport; no body scrollbar
   - On macOS Safari / iOS, no page-level rubber-band bounce
   - Long content on dashboard scrolls only inside `<main>`; sidebar and header stay fixed
2. Sidebar navigation switches `/#/dashboard` ↔ `/#/settings` without remounting the shell
3. `pnpm run build` then `node bin/index.js` → `http://127.0.0.1:7777/#/dashboard` renders; refresh keeps route
4. `pnpm run lint`

## Out of Scope

- Login / auth routes outside the layout
- Theme toggle, user menu, real business pages
- Mobile sheet sidebar fine-tuning beyond shadcn defaults
