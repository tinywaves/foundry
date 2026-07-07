# 002 — layout · Tools Nav

## Goals

- Add a **Tools** sidebar section with a gallery page and per-tool detail routes
- Register tools centrally so new utilities are easy to add
- Ship three initial tools: JSON View, Mock Tool 1, Mock Tool 2

## Navigation

Sidebar split into two groups:

- **General**: Dashboard, Settings
- **Tools** (`SidebarGroupLabel`): single entry linking to `/tools`
- Tools nav item stays active for all `/tools/*` routes

## Routing

Nested under `AppShell`:

```
/tools              → ToolsIndexPage (card gallery)
/tools/:toolId      → ToolDetailPage (shared shell + tool component)
```

Examples: `/#/tools`, `/#/tools/json-view`, `/#/tools/mock1`

## Tool Registry

[`packages/web/src/tools/registry.ts`](../packages/web/src/tools/registry.ts) exports:

- `ToolDefinition` — id, name, description, icon, component
- `tools` — array of registered tools
- `getToolById(id)` — lookup for detail page and breadcrumb

Initial tools:

| id | name | description | Plan |
|----|------|-------------|------|
| `json-view` | JSON View | Format and validate JSON | [003 — tools · JSON View](./003-tools-json-view.md) |
| `mock1` | Mock Tool 1 | Placeholder utility | — |
| `mock2` | Mock Tool 2 | Placeholder utility | — |

Components are **eagerly imported** in the registry (no `React.lazy` / route-level code splitting for tools).

## Pages

### Tools gallery (`pages/tools/index.tsx`)

- Page header + responsive card grid (`sm:2`, `lg:3` columns)
- Each card links to `/tools/:id` with icon, name, description
- Hover: subtle border and shadow

### Tool detail (`pages/tools/detail.tsx`)

- Breadcrumb shows tool name; no duplicate back link or title block in the page body
- Tool component fills the content area (`flex-1`); unknown `toolId` → 404 card

## Tool Implementations

### JSON View

See **[003 — tools · JSON View](./003-tools-json-view.md)**.

### Mock 1 / Mock 2

- Placeholder copy + minimal demo (counter / echo input)

## Breadcrumb

- `/tools` → `Tools`
- `/tools/:toolId` → `Tools` (link) > `{tool.name}`

## Files

| File | Role |
|------|------|
| `packages/web/src/components/layout/app-sidebar.tsx` | Tools sidebar group |
| `packages/web/src/components/layout/app-shell.tsx` | Nested breadcrumb; content padding |
| `packages/web/src/routes.tsx` | Tools routes |
| `packages/web/src/tools/registry.ts` | Tool metadata |
| `packages/web/src/pages/tools/index.tsx` | Gallery |
| `packages/web/src/pages/tools/detail.tsx` | Detail shell |
| `packages/web/src/tools/json-view.tsx` | JSON View (see 003) |
| `packages/web/src/tools/mock1.tsx` | Placeholder |
| `packages/web/src/tools/mock2.tsx` | Placeholder |

## Dependency Changes

Tool-specific dependencies are documented in each tool plan (e.g. [003 — tools · JSON View](./003-tools-json-view.md) for `@microlink/react-json-view`).

### Add (dependencies)

- (none at this plan level)

### Add (devDependencies)

- (none)

### Remove (dependencies)

- (none at this plan level)

### Remove (devDependencies)

- (none)

### Commands (manual only)

- (none)

## Verification

1. `pnpm run dev:web` → sidebar shows Tools; gallery lists three cards
2. Each card opens its tool page; JSON View behavior per [003 — tools · JSON View](./003-tools-json-view.md)
3. Detail breadcrumb shows `Tools > {name}`
4. Tools sidebar item stays active on detail routes
5. `pnpm run lint` && `pnpm run build`

## Out of Scope

- Tool search / categories
- Sidebar sub-menu for individual tools
- Per-tool lazy loading / code splitting
- CLI tool registration
