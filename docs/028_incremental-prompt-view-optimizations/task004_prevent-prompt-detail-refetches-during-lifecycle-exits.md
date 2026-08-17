# Task 004: Prevent Prompt Detail Refetches During Lifecycle Exits

## Status

`completed`

## Goal

Leave Prompt detail pages cleanly after successful lifecycle actions without refetching the detail that the action has made inaccessible.

## Detail

Move to Trash from active Prompt View, Restore from Prompt Trash View, and Remove from Trash from Prompt Trash View each invalidate the entity represented by the current detail query. The action itself previously succeeded, but `usePromptTrashActions` reconciled TanStack Query caches in its hook-level `onSuccess` before the page-level mutation success handler requested navigation. Removing the observed detail query and then publishing the mutation's success state allowed the still-mounted route to render again before React Router's default transition committed. `useQuery` then subscribed to a newly created query for the now-inaccessible detail, the API correctly returned `Prompt not found`, and the detail hook surfaced that secondary read failure as an error toast.

The three detail-page success paths now use the shared `promptLifecycleExitNavigateOptions` value with `flushSync: true` and `replace: true`. The renderer entry uses the DOM-aware `RouterProvider` from `react-router/dom`, which injects `ReactDOM.flushSync` into the underlying React Router provider. The page-level mutation success callback therefore commits and unmounts the old detail route synchronously before mutation observers publish the success update. Move to Trash reaches the Prompts list, Restore reaches the restored active Prompt View, and Remove from Trash reaches the Trash list without giving the old page an opportunity to resubscribe its removed detail query.

Existing lifecycle semantics remain authoritative. Hook-level success handlers still reconcile active, trash, version, and list caches and still show the existing success toast. Genuine mutation errors still show their existing error toast and leave the current page available. The detail hooks continue reporting real read failures, and the solution does not globally suppress `not-found` responses. Ordinary Back navigation and lifecycle actions performed directly on list pages keep their existing behavior because those pages do not observe the detail query removed by the action.

The shared navigation value is pure and has focused coverage for the required synchronous replacement options. No renderer component or route tree is imported into tests, preserving the repository's renderer test boundary.

## Findings

None.

## Dependencies

None.

## Deliverables

- Shared synchronous replacement navigation options for Prompt lifecycle exits.
- Updated active Prompt View Move to Trash success navigation.
- Updated Prompt Trash View Restore and Remove from Trash success navigation.
- Focused pure-logic regression coverage for the lifecycle exit navigation contract.

## Acceptance Criteria

- [x] Moving a Prompt to Trash from active Prompt View reaches the Prompts list without a secondary `Prompt not found` request or toast.
- [x] Restoring a Prompt from Prompt Trash View reaches the restored active Prompt View without refetching the removed trashed-detail query.
- [x] Removing a Prompt from Prompt Trash View reaches the Trash list without a secondary `Prompt not found` request or toast.
- [x] All three lifecycle exits replace the invalid detail history entry and synchronously commit before mutation observers update.
- [x] Existing cache reconciliation, destination routes, success toasts, confirmation behavior, and pending-state guards remain unchanged.
- [x] Genuine mutation and detail-read failures continue using the existing error handling instead of being suppressed.
- [x] Prompt list and Trash list lifecycle actions, ordinary Back navigation, persistence, preload, IPC, database, and main-process behavior remain unchanged.
- [x] Focused tests, type checking, linting, the full test suite, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changes to Prompt mutation requests, API results, query keys, cache reconciliation helpers, retry policy, or detail-hook error handling.
- Global suppression or reinterpretation of `Prompt not found` responses.
- General synchronous navigation outside successful lifecycle exits that invalidate the currently observed detail.
- Changes to list-page lifecycle actions, Prompt detail presentation, confirmation dialogs, or action labels.
- New dependencies, renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Handoff

Task 004 establishes clean synchronous exits after lifecycle mutations as the cumulative behavior for active and trashed Prompt detail surfaces and the baseline for the next explicitly requested optimization.

## Verification

- `pnpm exec vitest run src/renderer/src/pages/prompts/prompt-lifecycle-navigation.test.ts` passed its focused lifecycle navigation test.
- `pnpm test` passed all 23 test files and 146 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static mutation-flow inspection confirmed that TanStack Query hook-level success reconciliation occurs before per-call success callbacks and mutation-observer publication.
- Static router inspection confirmed that the renderer combines `createHashRouter` with the DOM-aware `RouterProvider` from `react-router/dom`, which supplies `ReactDOM.flushSync` for synchronous navigation commits.
- Static scope inspection confirmed that mutation requests, API error handling, query keys, cache helpers, retry behavior, list-page actions, persistence, preload, IPC, database, and main-process behavior remain unchanged.
- The user approved documentation synchronization after reviewing the completed behavior, root cause, and verification summary.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.

## Maintenance Adjustments

### 2026-08-17 19:16:09: Enable DOM-Aware Synchronous Navigation

- Change: The renderer entry now imports `RouterProvider` from `react-router/dom`, allowing the existing lifecycle exit navigation options to commit through `ReactDOM.flushSync`.
- Previous state: The renderer imported the base `RouterProvider` from `react-router`; it did not provide a `flushSync` implementation, so React Router ignored `flushSync: true`, warned that the DOM provider was missing, and retained the asynchronous transition that could refetch an inaccessible Prompt.
- Reason: User verification showed that `Prompt was not found.` still appeared after the initial Task 004 change because its synchronous navigation option was configured but not connected to a DOM-capable provider.
- Documentation impact: Plan 028 and Task 004 now record the DOM RouterProvider requirement, and the stale verification statement that attributed support to `createHashRouter` alone has been corrected.
- Verification: `pnpm typecheck`, `pnpm lint`, all 23 test files and 146 tests, `pnpm build`, and `git diff --check` passed; React Router source and the production renderer bundle confirmed that `react-router/dom` injects `ReactDOM.flushSync`. The application was not launched and no automated visual verification was performed under repository policy.
