# Task 003: Refine Provider Runtime Navigation

## Status

`completed`

## Goal

Make Provider runtime selection compact, recognizable, and linkable while preserving all existing runtime isolation and Provider list behavior.

## Detail

Replace the vertically separated Providers title and text tabs with one medium Astryx `Toolbar`. Keep the Providers heading and runtime selector together at the start of the toolbar and align the Add Provider action at the end. Preserve the page-filling list area and its loading, error, empty, and populated states.

Render Codex and Claude Code as icon-only tabs using official static SVG assets from `@lobehub/icons-static-svg`. Keep the tab labels available to assistive technology and expose the runtime names through tooltips. Reuse the same runtime assets on Dashboard and keep Lucide icons for Foundry-authored actions and states.

Derive the selected runtime from the `runtime` URL query parameter. Accept `claude-code` explicitly and use Codex as the fallback for missing or invalid values, replacing the URL with the canonical value. Runtime changes update the query parameter in place and preserve the existing reset of transient reveal and delete state.

Normalize Provider-facing labels, table headers, menu actions, tooltips, loading text, empty states, and confirmation text while retaining `Provider` and `Providers` as the entity terminology. Keep data loading, cache ownership, runtime isolation, API-key actions, connection testing, and deletion behavior unchanged.

## Findings

None.

## Dependencies

- Task 001: Refine Application Shell and Sidebar, completed.
- Existing Provider route, TanStack Query ownership, and runtime-scoped list behavior.
- New `@lobehub/icons-static-svg` runtime dependency.
- Existing Astryx Toolbar, tabs, Tooltip, table, and feedback components.

## Deliverables

- Compact Providers toolbar containing the title, runtime tabs, and Add Provider action.
- Official Codex and Claude Code runtime icon assets.
- Accessible icon-only tabs with labels and tooltips.
- URL-owned, canonical runtime selection.
- Consistent Provider labels and state feedback.

## Acceptance Criteria

- [x] The Providers title and runtime tabs are aligned in the same toolbar group.
- [x] The Add Provider action remains visually and semantically separate at the toolbar end.
- [x] Codex and Claude Code tabs use official static runtime icons.
- [x] Icon-only tabs retain accessible names and visible hover tooltips.
- [x] `?runtime=codex` and `?runtime=claude-code` select the matching isolated Provider list.
- [x] A missing or invalid runtime query value resolves to Codex and is canonicalized in the URL.
- [x] Runtime changes still clear transient page actions that must not cross runtime boundaries.
- [x] Provider loading, failure, empty, table, reveal, copy, test, edit, and delete behavior remains intact.
- [x] User-facing entity terminology remains `Provider` and `Providers`.

## Out of Scope

- Adding another runtime or discovering runtimes dynamically.
- Changing Provider list query keys, cache lifetimes, or mutation ownership.
- Changing Provider persistence, validation, IPC, or connection-test semantics.
- Provider search, sort, pagination, bulk actions, or runtime migration.

## Handoff

Provider runtime selection is now compact and directly addressable while keeping the existing runtime-scoped management contract intact.

## Verification

- Type checking, linting, and the Electron Vite production build passed with the static SVG imports.
- Static inspection confirmed URL-derived runtime ownership, canonical fallback behavior, accessible tab labels, and preserved page-action resets.
- The application was not launched and no automated visual inspection was performed, as required by repository policy.
