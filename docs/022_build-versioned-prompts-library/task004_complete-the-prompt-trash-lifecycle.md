# Task 004: Complete the Prompt Trash Lifecycle

## Status

`completed`

## Goal

Complete the active-to-Trash Prompt lifecycle through the existing persistence APIs, including confirmed movement, Trash browsing, restoration, logical removal, and Empty Trash.

## Detail

Add a `Trash` button to the Prompts page header and dedicated `/agent-extensions/prompts/trash` and `/agent-extensions/prompts/trash/:promptId` routes. Do not add Prompts and Trash tabs. Register the Trash routes without weakening the existing Prompt route behavior or sidebar selection.

Expose Move to Trash from both active Prompt table rows and Prompt View. Confirm the action with `Move Prompt to Trash?`, describe `"<title>" will be moved to Trash. You can restore it later.`, and label the destructive action `Move to Trash`. A successful table action keeps the user on the Prompts table and removes the row. A successful Prompt View action returns to the Prompts table.

Build Trash as a full-width, edge-to-edge table ordered by the API-provided deletion time descending. Its columns are Title, Moved to Trash, and Actions. The title links to Trash View; row actions expose Restore and Remove from Trash. The header always exposes Empty Trash and disables it when the loaded Trash is empty. The empty state reads `Trash Is Empty`.

Trash View displays only the Prompt snapshot that was current when it moved to Trash: title, description, current version, created time, updated time, moved-to-Trash time, and exact plain-text content. Preserve whitespace and Markdown-like syntax without parsing. Expose only Restore and Remove from Trash; do not expose Copy, Edit, or History.

Restore requires no confirmation. It preserves the Prompt ID, complete version history, current content, and `updatedAt`, and creates no version. Restoring from a table row keeps the user on the Trash table while the restored row disappears. Restoring from Trash View navigates to the restored Prompt's normal View.

Confirm individual removal with `Remove Prompt from Trash?`, describe `"<title>" will no longer be accessible in Foundry. This can't be undone.`, and label the destructive action `Remove from Trash`. A successful row action remains on the Trash table. A successful Trash View action returns to the Trash table. The record remains logically retained in SQLite but becomes permanently inaccessible through product APIs.

Confirm Empty Trash with `Empty Trash?` and display the number of affected Prompts with correct singular or plural wording, followed by `They will no longer be accessible in Foundry. This can't be undone.` Use `It` instead of `They` for one Prompt. Label the destructive action `Empty Trash`. On success, use the API's affected count for feedback, leave the user on the empty Trash table, and make every affected record permanently inaccessible through product APIs while retaining logical rows in SQLite.

Move, Remove from Trash, and Empty Trash confirmation dialogs remain open while pending and after failure. Their mutations do not retry. Restore also does not retry; its failure keeps the user in the current table or View context. Every failure shows an error toast using the API message or the operation-specific fallback. Successful operations report `Prompt moved to Trash.`, `Prompt restored.`, `Prompt removed from Trash.`, or a count-aware Empty Trash result. No visible Retry control is added.

Add Trash list and detail TanStack Query keys and options. Reads reuse the existing single transient retry policy. Initial Trash list failure shows a terminal `Couldn't Load Trash` state. A refresh failure with cached data shows direct error feedback while preserving the table. Final Trash View load failure reports the error and returns to the Trash table.

Explicitly reconcile the infinite-stale caches after each successful lifecycle mutation. Moving removes the Prompt from the active list and clears its active detail, version-list, and version-detail caches, then removes the Trash list cache so its authoritative `trashedAt` is fetched on the next visit. Restoring removes the Trash summary and detail, feeds the returned `PromptDetail` through `updatePromptCaches`, and preserves the existing versions without creating another. Removing clears the Trash summary and detail plus any active and version caches for that ID. Empty Trash uses the loaded Trash IDs to clear their detail and version caches and replaces the Trash list with an empty result after success.

Use existing Astryx layout, table, dialog, loading, metadata, timestamp, and feedback components, StyleX design tokens, and Lucide icons. Run Astryx discovery before writing the UI and preserve the existing AppShell, renderer route boundary, and exact-text content viewer. No main-process, preload, shared-contract, database, dependency, or styling-system change is required.

## Findings

None.

## Dependencies

None.

## Deliverables

- Active Prompt movement controls with confirmation, navigation, and cache reconciliation.
- Dedicated Trash list, empty, loading, cached-failure, and detail workflows.
- Restore, Remove from Trash, and Empty Trash interactions with confirmed navigation and failure behavior.
- Trash route, query, cache, and lifecycle state ownership within the renderer.
- Focused route, query, cache, interaction-model, and failure-state verification.

## Acceptance Criteria

- [x] Prompts exposes a dedicated Trash entry, and the approved list and detail routes render without adding tabs or changing sidebar ownership.
- [x] Moving an active Prompt requires the approved confirmation and produces the confirmed source-specific navigation behavior.
- [x] Trash renders an API-ordered full-width table with the approved columns, title links, row actions, disabled-empty command, and `Trash Is Empty` state.
- [x] Trash View presents the exact current-at-deletion snapshot and exposes only Restore and Remove from Trash.
- [x] Restore requires no confirmation, creates no version, preserves identity, versions, and `updatedAt`, and follows the confirmed table-versus-View navigation behavior.
- [x] Remove from Trash and Empty Trash use the approved confirmations and make affected Prompts permanently inaccessible through product APIs without physically deleting their SQLite rows.
- [x] Empty Trash displays the affected count, uses correct singular or plural wording, and reports the API-returned count after success.
- [x] Mutation failures preserve their dialog or page context, read failures preserve cached data when available, and no visible Retry control appears.
- [x] Every successful lifecycle transition removes stale active, Trash, detail, and version cache state despite infinite query staleness.
- [x] Existing Prompt create, view, edit, copy, and History behavior remains unchanged.
- [x] Automated and static verification passes without launching or visually automating the application.

## Out of Scope

- Trash Copy, Edit, History, bulk selection, bulk Restore, search, sorting controls, pagination, expiration, or physical deletion.
- Recovery through product APIs after Remove from Trash or Empty Trash.
- Prompt schema, storage, IPC, preload, or shared-contract changes.
- New dependencies, another styling system, or visual automation.

## Handoff

Completing this terminal task completes Plan 022 with coherent active, versioned, and Trash Prompt lifecycles across the existing process and security boundaries.

## Verification

- `pnpm test` passed 20 test files and 132 tests, including focused Trash query, bounded retry, route, count-aware copy, and lifecycle cache-transition coverage.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the Node and Web type checks and built the main, preload, and renderer production outputs with electron-vite.
- `git diff HEAD --check` passed.
- Static inspection confirmed the dedicated routes, approved confirmation copy, source-specific navigation, exact plain-text rendering, disabled empty command, cached-list preservation, final detail failure redirect, one-time read retry, mutation retry disablement, and complete lifecycle cache transitions.
- Static boundary inspection confirmed Astryx and StyleX ownership, Lucide application icons, no raw renderer layout elements or standalone CSS, no new dependency, and no Task 004 change to the main process, preload, shared contracts, or database.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
