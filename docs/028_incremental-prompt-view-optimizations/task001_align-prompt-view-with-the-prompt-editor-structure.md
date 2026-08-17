# Task 001: Align Prompt View with the Prompt Editor Structure

## Status

`completed`

## Goal

Align active Prompt View with the established New and Edit page structure while keeping its content non-editable and preserving its existing actions.

## Detail

Prompt View now belongs to `FullWindowLayout` alongside the New and Edit routes instead of rendering within `AppShellLayout`. Prompt Trash View remains in the application shell. The active View route therefore uses the full window without the sidebar and constrains scrolling through the existing full-window layout behavior.

The editor's existing two-row header was extracted into the shared `PromptWindowHeader`. View, New, Edit, and their applicable loading states now use the same compact Prompt title drag region and fixed action row. The macOS title row retains the established native window-control inset and drag behavior. View places Back to Prompts at the start of the action row, groups Copy and Move to Trash as compact secondary actions at the end, and keeps Edit as the trailing compact primary action. Existing copy progress, move-to-trash confirmation, successful trash navigation, and edit navigation behavior remain unchanged.

The View body now follows the same vertical Title, Description, and Content order as the authoring form. Title and Description render through the existing Astryx fields inside a native disabled fieldset, keeping them non-editable without applying Astryx's field-level muted disabled appearance. A missing Description continues to display `None`. The previous Updated At metadata is no longer presented on active Prompt View, but its persisted value and shared contract remain unchanged.

The Markdown Preview surface was extracted from `PromptMarkdownEditor` into the shared `PromptMarkdownPreview`. Active Prompt View renders Content directly through that Preview without exposing Source mode or loading CodeMirror. New and Edit continue using the same Preview when their existing mode control selects Preview. The shared surface retains its fixed twenty-line-equivalent height, internal scrolling, compact Astryx Markdown rendering, and link policy that permits Electron-controlled HTTP and HTTPS opening while blocking relative and hash navigation.

No Prompt contract, persistence, preload, IPC, query, mutation, cache, or main-process behavior changed. No dependency was added. The repository's renderer policy leaves final visual inspection to the user.

## Findings

None.

## Dependencies

None.

## Deliverables

- Full-window route ownership for active Prompt View.
- Shared Prompt window header used by View, New, and Edit.
- Read-only Title and Description fields in the established authoring order.
- Shared Markdown Preview used by active Prompt View and the existing editor Preview mode.
- Matching full-window loading header for active Prompt View.

## Acceptance Criteria

- [x] Active Prompt View renders without the application sidebar under the same full-window route layout as New and Edit.
- [x] View displays the Prompt title in the shared compact drag region and renders Back to Prompts in the fixed action row.
- [x] Copy, Move to Trash, and Edit retain their existing behavior and appear as compact trailing actions with Edit primary.
- [x] Title, Description, and Content appear in the same vertical order as New and Edit.
- [x] Title and Description are non-editable without Astryx field-level muted disabled styling, and a missing Description displays `None`.
- [x] Content renders as Markdown in the shared fixed-height Preview surface without exposing Source mode or loading the CodeMirror editor.
- [x] External Preview links retain the existing Electron-controlled opening path, while relative and hash links cannot navigate Foundry.
- [x] Updated At and the previous raw preformatted Content surface are no longer shown on active Prompt View.
- [x] Prompt Trash View, Prompt contracts, persistence, preload, IPC, queries, mutations, caches, and main-process behavior remain unchanged.
- [x] Type checking, linting, focused tests, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Prompt Trash View structure, metadata, content rendering, restore, or permanent removal behavior.
- Changes to Prompt New, Edit, History, validation, saving, Restore, or unsaved-change behavior beyond shared presentation extraction.
- Changes to Prompt data contracts, timestamps, storage, preload, IPC, database, queries, mutations, or caches.
- Source mode, editing, or CodeMirror loading within Prompt View.
- New dependencies, renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Handoff

Task 001 establishes the active Prompt View full-window structure, shared Prompt chrome, read-only field order, and Markdown Preview as the baseline for the next explicitly requested Prompt View optimization.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 22 test files and 142 tests.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static route inspection confirmed that active Prompt View moved to `FullWindowLayout` while Prompt Trash View remains under `AppShellLayout`.
- Static scope inspection confirmed no changes to Prompt contracts, persistence, preload, IPC, queries, mutations, caches, main-process behavior, or Prompt Trash View.
- Static Astryx inspection found no application-authored raw `div` or `span` layout, standalone CSS, raw colors, raw pixel values, or utility classes in the new and changed shared Prompt UI source.
- The user confirmed the completed implementation boundary and approved documentation synchronization into a new plan.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
