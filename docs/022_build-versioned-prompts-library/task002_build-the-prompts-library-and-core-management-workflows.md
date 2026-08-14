# Task 002: Build the Prompts Library and Core Management Workflows

## Status

`completed`

## Goal

Replace the Prompt Templates placeholder with a complete Prompts library supporting list, create, view, edit, and exact plain-text copy workflows.

## Detail

Rename active renderer identifiers, navigation labels, files, components, route constants, and tests from Prompt Templates to Prompts. Introduce the canonical `/agent-extensions/prompts`, `/agent-extensions/prompts/new`, `/agent-extensions/prompts/:promptId`, and `/agent-extensions/prompts/:promptId/edit` routes. Do not retain the former route, and keep the Prompts sidebar item selected for every nested route.

Replace `HashRouter` with the existing React Router data-router equivalent while preserving hash-based navigation and the current AppShell. This enables `useBlocker` to guard dirty editors with an Astryx `AlertDialog`. Cancel, browser Back, sidebar navigation, and other in-app route changes require confirmation when fields differ from their loaded baseline. Closing the Electron window remains unguarded.

Build an edge-to-edge Prompts table with Title, Description, Updated At, and Actions columns. Title opens View. Copy and Edit use Lucide icon buttons with accessible labels and tooltips. The header provides New Prompt. Empty and initial loading states occupy the table region without cards.

View displays the current title, optional description, update metadata, and source content as selectable plain text. Preserve whitespace and indentation visually, do not parse Markdown, and copy through `globalThis.api.prompts.copyPrompt` so the stored text remains exact.

Create and Edit share a focused form model with Title, Description, and Content fields. Mirror the shared title code-point, description code-point, required-content, and UTF-8 byte limits for immediate feedback while keeping main-process validation authoritative. Do not trim or transform Content. Disable duplicate submissions while saving and retain all entered values after failure.

Successful Create navigates to the new Prompt View. Successful Edit navigates to the updated View. Create Cancel returns to the table; Edit Cancel returns to that Prompt's View, subject to dirty-state confirmation.

Add Prompt-specific TanStack Query keys and adapters. Active read queries may automatically retry once only for potentially transient `storage-unavailable` or `internal` failures. Invalid input, missing records, corrupt storage, and unsupported database versions fail immediately. Mutations never retry automatically. Do not change the application-wide query defaults.

After final list-load failure, show one failure toast and a non-action error state without a Retry control. After final detail-load failure, show one failure toast and replace-navigate to the Prompts table. Create, Edit, and Copy failures show one direct toast while preserving the current UI context. Copy success also shows confirmation.

Use Astryx `Table`, `Layout`, `TextInput`, `TextArea`, `Timestamp`, `AlertDialog`, Toast, buttons, and tooltips; use StyleX design tokens for the small amount of owned layout and plain-text presentation styling. Add no dependency or styling system.

## Findings

None.

## Dependencies

None.

## Deliverables

- Renamed Prompts navigation, canonical routes, page identifiers, and route tests.
- Full-width Prompts table with loading, empty, populated, and failure states.
- Full-width current Prompt View with exact-content copy.
- Shared Create and Edit form workflows with validation and dirty-state protection.
- Prompt query adapters, cache updates, bounded read retry behavior, and notifications.
- Focused route, form-model, query, and cache-behavior tests.

## Acceptance Criteria

- [x] All active renderer terminology and identifiers use Prompts, and the former route is unsupported.
- [x] Nested Prompts routes keep the sidebar destination selected.
- [x] The table is ordered by the API result and exposes View, Copy, Edit, and New Prompt without Delete or Trash controls.
- [x] View renders plain source text without Markdown interpretation, and Copy uses the constrained Prompt API.
- [x] Create and Edit enforce the approved field rules without transforming Prompt content.
- [x] Create/Edit Save and Cancel navigate according to the confirmed destinations.
- [x] Dirty in-app navigation requires confirmation; staying preserves every field and discarding completes the intended navigation.
- [x] Successful mutations update or invalidate the appropriate list/detail caches without stale visible data.
- [x] Reads retry only eligible transient failures once; mutations do not retry.
- [x] Final failures provide direct feedback without a visible Retry control and preserve applicable user context.
- [x] Automated and static verification passes without launching or visually automating the application.

## Out of Scope

- Delete, Trash entry, Trash workflows, and lifecycle confirmations, deferred to Task 004.
- History, historical viewing, copying, and restoration, deferred to Task 003.
- Electron-window close protection.
- Search, sorting controls, pagination, tags, categories, favorites, import, or export.
- Conflict detection, Markdown rendering, variables, roles, and rich text.

## Handoff

Task 003 will extend the Edit route and form state with the resizable History panel while reusing the Prompt routes, query keys, current-detail cache, exact-content viewer, copy feedback, and dirty-navigation guard established here.

## Verification

- `pnpm test` passed 18 test files and 121 tests, including 17 focused Prompts route, validation, retry, query, and cache tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the Node and Web type checks and built the main, preload, and renderer production outputs with electron-vite.
- `git diff HEAD --check` passed.
- Static inspection confirmed canonical Prompts terminology and routes, nested sidebar selection, no visible Retry control, no Delete/Trash/History UI, no Prompt renderer access to Electron or storage internals, and no new dependency or styling system.
- Static UI inspection confirmed Astryx and StyleX ownership, labeled form and icon controls, first-error focus, long-title wrapping, exact plain-text rendering, and preserved cached content after refresh failures.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
