# 003 — tools · JSON View

## Goals

- Ship a **JSON View** utility under `/tools/json-view` (registered in [002 — layout · Tools Nav](./002-layout-tools-nav.md))
- Paste or type JSON in a monospace editor; validate live; format and inspect as an interactive tree
- Tree edits sync back to the editor text; no separate preview mode toggle

## Route and Shell

- Gallery entry: `/#/tools/json-view`
- Rendered inside `ToolDetailPage` — full-height workspace, no duplicate title/back link (breadcrumb: `Tools > JSON View`)
- Tool component: [`packages/web/src/tools/json-view.tsx`](../packages/web/src/tools/json-view.tsx)

## Layout

Adaptive split (no Source/Tree tab):

| State | Layout |
|-------|--------|
| Empty or invalid JSON | Editor fills the tool viewport |
| Valid JSON, **lg+** | Narrow editor column (`~34%`, max `24rem`) + tree fills remaining width; both visible |
| Valid JSON, below **lg** | Compact editor strip (`max-h-40`) + tree uses remaining height |

- No section titles (`Editor` / `Tree` labels removed)
- **Format** and **Clear** float at the **top-start** of the editor (inside the textarea border)
- Validation status (`Valid JSON` / parse error) at the **top-end** of the editor
- Editor top padding (`pt-10`) keeps text below the button row

## Editor

- shadcn `Textarea` (`@/components/ui/textarea`); `dir="ltr"`, `aria-label="JSON input"`, `spellCheck={false}`
- Live `JSON.parse` via `useMemo`; errors surfaced in the editor chrome (`aria-invalid` on control)
- **Format** — `JSON.stringify(parsed, null, 2)` when valid
- **Clear** — reset input to empty string
- No default sample JSON

## Tree Preview

- Library: **`@microlink/react-json-view`** (ESM fork of `react-json-view`; direct default import)
- Renders only when input is non-empty and valid
- `dir="ltr"` on the tree container only (shell layout uses logical directions elsewhere)
- Config: `iconStyle: 'triangle'`, `displayDataTypes`, `displayObjectSize`, `enableClipboard`, `indentWidth: 4`, `collapsed: 2`, `collapseStringsAfterLength: false`, `theme: 'rjv-default'`, transparent background
- `onEdit` / `onAdd` / `onDelete` → stringify `updated_src` back into editor (`applyTreeUpdate`)

## Library Notes

| Attempt | Outcome |
|---------|---------|
| `react-json-view` | CJS — Vite dev: invalid element type |
| `@uiw/react-json-view@2` alpha | ESM OK; in-tree editing incomplete |
| **`@microlink/react-json-view@1.31.22`** | **Current** — same API, ESM, tree edit support |

## Files

| File | Role |
|------|------|
| `packages/web/src/tools/json-view.tsx` | Tool UI |
| `packages/web/src/components/ui/textarea.tsx` | shadcn Textarea (editor) |
| `packages/web/src/tools/registry.ts` | Registers `json-view` id and component |

## Dependency Changes

### Add (dependencies)

- `@microlink/react-json-view` (`packages/web/`) — interactive JSON tree preview and in-tree edits.

### Add (devDependencies)

- (none)

### Remove (dependencies)

- `@uiw/react-json-view` (`packages/web/`) — replaced by `@microlink/react-json-view`.

### Remove (devDependencies)

- (none)

### Commands (manual only)

```bash
pnpm remove @uiw/react-json-view --filter web
pnpm add @microlink/react-json-view --filter web
```

## Verification

1. `pnpm run dev:web` → open `/#/tools/json-view`
2. Paste valid JSON → tree appears without an extra click; Format prettifies editor text
3. Invalid JSON → error in editor chrome; tree hidden
4. Edit/add/delete in tree → editor text updates
5. Narrow viewport → editor strip + tree stack vertically
6. `pnpm run lint` && `pnpm run build`

## Out of Scope

- Draggable split / resize handle between editor and tree
- Source/Tree mode toggle
- Default theme beyond `rjv-default`
- JSON Schema validation, diff, or file upload
