# Task 002: Preserve Prompt Edit Entry Context

## Status

`completed`

## Goal

Return from Edit Prompt to the page that opened it while providing a safe Prompts-list fallback for direct or invalid entries.

## Detail

Edit Prompt has two in-application entry paths: the Edit action on a Prompt list card and the Edit action on active Prompt View. Both previously opened the same Edit route without source context, and the editor's Back to Prompts action always navigated to the canonical list regardless of where editing began.

Each entry now uses the pure `getPromptEditorNavigateOptions` helper to attach a narrow `promptEditorSource` route state with either `list` or `view`. The Edit route treats location state as unknown input and accepts only those two explicit values. It does not infer origin from the URL, use an unconstrained return path, or expose navigation context in a query parameter.

The pure `getPromptEditorBackNavigation` helper converts validated source state into a history-return model. A list source renders Back to Prompts, while a View source renders Back to Prompt. Both known sources navigate one history entry backward, restoring the exact source page instead of creating another route entry and preserving list scroll, tab, and View state already owned by browser history. Missing, null, non-object, or unsupported state resolves to a path model that replaces the Edit route with the canonical Prompts list and cannot send the user to an arbitrary earlier page.

`PromptEditPage` resolves the Back model once for both loading and loaded states, then passes its label and handler into the shared editor and `PromptWindowHeader`. The shared header now accepts an optional Back label while retaining Back to Prompts as the default for New Prompt and active Prompt View. Contextual Edit Back navigation continues through React Router, so the editor's existing unsaved-change blocker and discard confirmation remain authoritative. Successful Save still replaces Edit with active Prompt View, and History, Restore, validation, persistence, and process boundaries remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- Explicit Prompt list and Prompt View source state on both Edit entry actions.
- Pure validated source-to-Back-navigation resolution with a canonical fallback.
- Contextual Back labels and handlers shared by Edit loading and loaded states.
- Focused pure-logic coverage for known sources and invalid direct-entry states.

## Acceptance Criteria

- [x] Editing from a Prompt list card displays Back to Prompts and returns to the original list history entry.
- [x] Editing from active Prompt View displays Back to Prompt and returns to the original View history entry.
- [x] Known in-application entries preserve their source page's browser-owned state instead of creating a duplicate destination entry.
- [x] A direct Edit route or missing, null, non-object, or unsupported source state displays Back to Prompts and replaces Edit with the canonical Prompts list.
- [x] Edit loading and loaded states resolve and present the same contextual Back behavior.
- [x] Dirty Edit state continues showing the existing discard confirmation before either contextual Back navigation can proceed.
- [x] New Prompt and active Prompt View retain their default Back to Prompts behavior.
- [x] Successful Save still replaces Edit with active Prompt View, and History, Restore, validation, persistence, and process behavior remain unchanged.
- [x] Type checking, linting, focused tests, the full test suite, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing successful Save navigation, browser-native Back behavior, or forward-history behavior.
- Persisting Edit source outside the current browser history entry or encoding it in the URL.
- Accepting arbitrary return paths from renderer route state.
- Changes to Prompt creation, View content, Trash View, History, Restore, validation, persistence, preload, IPC, database, queries, mutations, or caches.
- New dependencies, renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Handoff

Task 002 establishes validated source-aware Edit Back navigation as the cumulative Prompt View-to-Edit baseline for the next explicitly requested optimization.

## Verification

- `pnpm exec vitest run src/renderer/src/pages/prompts/prompt-editor-navigation.test.ts` passed all 6 focused navigation tests.
- `pnpm test` passed all 22 test files and 145 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static entry inspection confirmed that the Prompt list and active Prompt View are the only in-application callers of the Edit route and both attach an explicit validated source.
- Static flow inspection confirmed that contextual Back uses React Router navigation and therefore remains subject to the existing unsaved-change blocker.
- Static scope inspection confirmed that successful Save navigation, History, Restore, validation, Prompt contracts, persistence, preload, IPC, queries, mutations, caches, and main-process behavior remain unchanged.
- The user approved documentation synchronization after reviewing the completed behavior and verification summary.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
