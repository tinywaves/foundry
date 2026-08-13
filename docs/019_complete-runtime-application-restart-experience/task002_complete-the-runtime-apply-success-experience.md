# Task 002: Complete the Runtime Apply Success Experience

## Status

`completed`

## Goal

Route every successful Runtime configuration write into one persistent restart-guidance experience and complete the Runtimes-page action-label change from `Apply...` to `Apply`.

## Detail

Add a shared renderer-owned `RuntimeApplyResultDialog` and a small closed result model that records the affected Runtime and success source: Provider application from the Runtimes page, Official Default restoration, or the Apply that follows a Runtime-effective edit to an In-use Provider. The dialog title is respectively `Provider Applied`, `Defaults Restored`, or `Provider Updated and Applied`.

Keep result state at the page boundary. `RuntimesPage` closes `RuntimePreviewDialog`, clears the successful Runtime draft, refreshes Runtime and Runtime-scoped Provider state, and then opens the result dialog. `ProvidersPage` receives the successful Apply result from `ProviderDialog`, closes and disposes the Provider dialog, selects the affected Runtime, refreshes existing query state, and then opens the same result dialog. Never render the result dialog inside another Dialog or keep the old success toast alongside it.

Build the result experience from Astryx `Dialog`, `DialogHeader`, `Layout`, `LayoutContent`, `LayoutFooter`, `Banner`, `Spinner`, `Button`, and Stack/Text primitives. Use `purpose="required"` throughout so the result always requires an explicit footer action and cannot be dismissed by Escape, backdrop click, or a header close action. The dialog first states that the requested configuration write succeeded; restart detection or failure never changes or rolls back that result.

For Codex, query the no-input ChatGPT application-state API when the result dialog opens. During that request, show `Checking ChatGPT...` through a labelled Spinner and render no footer actions. Validate the response through the renderer Runtime query boundary. A `running` result explains that Codex is hosted by the ChatGPT desktop app, warns that restarting the entire application may affect other work in its Chat, Work, and Codex views, and offers `Restart Later` plus `Restart ChatGPT`. Every Codex state also tells users that existing Codex CLI sessions must be restarted manually.

Submitting `Restart ChatGPT` calls the no-input one-shot restart operation, keeps the required dialog open, renders button loading, and disables every dismissal path. A validated `restarted` result closes the dialog and shows the sole success toast, `ChatGPT restarted`. A `not-running` result explains that ChatGPT exited before the request and will load the configuration when the user next opens it. A `quit-failed` result asks the user to quit and reopen ChatGPT manually. A `reopen-failed` result explains that ChatGPT exited but Foundry could not reopen it and asks the user to open it manually. An `unavailable` result or a state/restart IPC failure says automatic restart is unavailable and asks the user to handle the restart manually. Each non-success terminal state offers only `Got It`; there is no restart retry action.

When the initial Codex state is `not-running`, explain that ChatGPT will load the configuration next time the user opens it and show only `Got It`. When the state is `unavailable` or the state request fails, do not infer that ChatGPT is running, do not offer automatic restart, and show only `Got It` with manual guidance. Foundry must not launch ChatGPT from any of these states.

For Claude Code, do not call either ChatGPT API. State that the configuration write succeeded and that existing Claude Code CLI sessions must be restarted manually, then offer only `Got It`.

Rename the Runtimes-page entry action from `Apply...` to `Apply` while preserving its target-validity rules, disabled tooltips, and existing Preview confirmation behavior. Preserve all Apply failure, `Retry Apply`, Provider Save failure, and Save-success/Apply-failure behavior. Add renderer boundary validation for the closed ChatGPT state and restart-result unions so an unknown main-process response becomes a sanitized `RuntimeRequestError` and follows manual guidance rather than enabling process control.

## Findings

None.

## Dependencies

None.

## Deliverables

- A shared Runtime Apply result model and required result dialog for all successful configuration-write sources.
- Page-level success orchestration that closes prior dialogs before presenting restart guidance.
- Validated ChatGPT state lookup, one-shot restart behavior, progress state, success feedback, and stage-specific manual fallbacks.
- Manual-only Claude Code and Codex CLI restart guidance.
- The Runtimes-page `Apply` label with existing review and availability behavior preserved.
- Focused renderer response-validation and result-flow coverage.

## Acceptance Criteria

- [x] Provider application from the Runtimes page opens `Provider Applied`, Official Default restoration opens `Defaults Restored`, and an In-use Provider edit followed by Apply opens `Provider Updated and Applied`.
- [x] The prior Apply or Provider dialog closes before the result dialog opens, and the old Apply-success toast is not shown alongside the result dialog.
- [x] Every result dialog states that configuration was written successfully before presenting restart status or failure guidance.
- [x] Codex state lookup renders `Checking ChatGPT...`, exposes no footer action while pending, and cannot be dismissed.
- [x] Only a validated `running` state offers `Restart ChatGPT`; `not-running`, `unavailable`, malformed, and failed state responses never offer or initiate automatic restart.
- [x] A running ChatGPT warning identifies the whole desktop application and the possible effect on Chat, Work, and Codex views before restart.
- [x] While restart is pending, duplicate actions and all dismissal paths remain unavailable.
- [x] A successful restart closes the result dialog and shows exactly one `ChatGPT restarted` toast.
- [x] `not-running`, `quit-failed`, `reopen-failed`, `unavailable`, malformed, and rejected restart results show the approved stage-specific manual guidance with only `Got It` and no restart retry action.
- [x] Every Codex result tells users to restart existing Codex CLI sessions manually.
- [x] Claude Code results tell users to restart existing Claude Code CLI sessions manually, show only `Got It`, and never call a ChatGPT state or restart API.
- [x] Restart detection or failure never rolls back or obscures the successful Apply result, draft cleanup, Runtime refresh, or Provider refresh.
- [x] Existing Apply failure, `Retry Apply`, Provider Save failure, and Save-success/Apply-failure behavior remain unchanged.
- [x] The Runtimes-page entry action reads `Apply` and preserves its existing availability, disabled-tooltip, and Preview-confirmation behavior.
- [x] Renderer validation rejects unknown ChatGPT state and restart-result values without exposing native details.
- [x] Relevant automated tests, TypeScript checks, linting, the production build, and whitespace validation pass without launching the application or invoking a real ChatGPT restart.

## Out of Scope

- Changes to the native ChatGPT application controller completed in Task 001.
- Changes to Runtime configuration preview, generation, backup, replacement, rollback, or persistence rules.
- Retrying a failed automatic restart.
- Starting ChatGPT when it is not running.
- Terminating, starting, or restoring Codex CLI or Claude Code CLI sessions.
- Windows or Linux application process control.
- Browser, screenshot, accessibility-tree, desktop-automation, or other visual acceptance work.

## Handoff

This is the terminal task for Plan 019. Its completed output will leave every successful Runtime configuration write with explicit restart guidance and a safe, optional ChatGPT restart when the host application is already running.

## Verification

- `pnpm test` - Passed 15 test files and 96 tests, including focused renderer response-validation and result-state tests.
- `pnpm typecheck` - Passed Node and Web TypeScript checks.
- `pnpm lint` - Passed with only the repository's existing ESLint configuration deprecation notices.
- `pnpm build` - Passed main, preload, and renderer production builds.
- `git diff --check` - Passed.
- Electron, browser, screenshot, accessibility-tree, and desktop automation were not launched. No real ChatGPT restart was invoked; user visual inspection remains the final UI acceptance step.
