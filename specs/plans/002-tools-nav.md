# 002 — Tools Nav and Utilities

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
/tools/:toolId      → ToolDetailPage (shared shell + lazy tool component)
```

Examples: `/#/tools`, `/#/tools/json-view`, `/#/tools/mock1`

## Tool Registry

[`packages/web/src/tools/registry.ts`](../packages/web/src/tools/registry.ts) exports:

- `ToolDefinition` — id, name, description, icon, lazy component
- `tools` — array of registered tools
- `getToolById(id)` — lookup for detail page and breadcrumb

Initial tools:

| id | name | description |
|----|------|-------------|
| `json-view` | JSON View | Format and validate JSON |
| `mock1` | Mock Tool 1 | Placeholder utility |
| `mock2` | Mock Tool 2 | Placeholder utility |

## Pages

### Tools gallery (`pages/tools/index.tsx`)

- Page header + responsive card grid (`sm:2`, `lg:3` columns)
- Each card links to `/tools/:id` with icon, name, description
- Hover: subtle border and shadow

### Tool detail (`pages/tools/detail.tsx`)

- Back link to `/tools`
- Title and description from registry
- Card workspace with `<Suspense>` + skeleton fallback
- Unknown `toolId` → 404 block with back link

## Tool Implementations

### JSON View (`tools/json-view.tsx`)

- Split input/output layout (stacked on mobile, side-by-side on `lg`)
- Live `JSON.parse` validation; formatted output via `JSON.stringify(..., null, 2)`
- Format and Clear buttons
- No third-party JSON library

### Mock 1 / Mock 2

- Placeholder copy + minimal demo (counter / echo input)

## Breadcrumb

- `/tools` → `Tools`
- `/tools/:toolId` → `Tools` (link) > `{tool.name}`

## Files

| File | Role |
|------|------|
| `packages/web/src/components/layout/app-sidebar.tsx` | Tools sidebar group |
| `packages/web/src/components/layout/app-shell.tsx` | Nested breadcrumb |
| `packages/web/src/routes.tsx` | Tools routes |
| `packages/web/src/tools/registry.ts` | Tool metadata |
| `packages/web/src/pages/tools/index.tsx` | Gallery |
| `packages/web/src/pages/tools/detail.tsx` | Detail shell |
| `packages/web/src/tools/json-view.tsx` | JSON formatter |
| `packages/web/src/tools/mock1.tsx` | Placeholder |
| `packages/web/src/tools/mock2.tsx` | Placeholder |

## Dependency Changes

### Add (dependencies)

- (none)

### Add (devDependencies)

- (none)

### Remove (dependencies)

- (none)

### Remove (devDependencies)

- (none)

### Commands (manual only)

- (none)

## Verification

1. `pnpm run dev:web` → sidebar shows Tools; gallery lists three cards
2. Each card opens its tool page; JSON View validates and formats JSON
3. Detail breadcrumb shows `Tools > {name}`; Back returns to gallery
4. Tools sidebar item stays active on detail routes
5. `pnpm run lint` && `pnpm run build`

## Out of Scope

- Tool search / categories
- Sidebar sub-menu for individual tools
- Tree-style JSON viewer dependency
- CLI tool registration
