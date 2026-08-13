# Complete the Runtime Application Restart Experience

## Status

`completed`

## Goal

Refine the Runtime Apply workflow so every successful configuration write clearly tells users which Runtime must be restarted and, when the ChatGPT desktop app that hosts Codex is already running, offers a safe automatic restart.

## Detail

Change the Runtimes-page entry action from `Apply...` to `Apply` while preserving the existing review and confirmation step.

After any successful Runtime configuration write, replace the transient success toast with a persistent result dialog. This result applies to Provider application from the Runtimes page, restoration of Official Default, and the automatic Apply that follows Runtime-effective edits to an In-use Provider.

For Codex, explain that the ChatGPT desktop app and existing Codex CLI sessions must reload the configuration. Codex is hosted within the ChatGPT desktop app, so automatic restart affects the entire application and may interrupt work in its Chat, Work, and Codex views. When ChatGPT is running, offer `Restart Later` and `Restart ChatGPT`. A restart requests a normal application quit, waits up to 15 seconds for ChatGPT to exit, and then reopens it with a further 15-second limit for confirming that it is running. Foundry never force-quits ChatGPT. The result dialog remains open while the restart is in progress. A successful restart closes the dialog and produces restart-success feedback. If quitting is cancelled, times out, or reopening fails, keep the applied configuration intact, show guidance for completing the restart manually, and offer only `Got It`.

When ChatGPT is not running or cannot be identified, show only `Got It`; Foundry does not launch it. For Claude Code, explain that existing CLI sessions must be restarted manually and show only `Got It`. Foundry never terminates or starts Claude Code processes.

ChatGPT detection and restart behavior belong to the Electron main process and are exposed through a narrowly scoped preload capability. The renderer does not receive arbitrary process-control access.

## Scope

- Rename the Runtimes-page `Apply...` action to `Apply`.
- Add a persistent result dialog after every successful Runtime configuration write.
- Cover Provider Apply, Restore Official Default, and In-use Provider edit-and-Apply success paths.
- Detect whether the ChatGPT desktop app that hosts Codex is running on macOS.
- Gracefully restart an already-running ChatGPT desktop app.
- Handle restart progress, success, cancellation, timeout, and reopen failure without an automatic retry action.
- Preserve the existing Apply, retry, configuration backup, and rollback behavior.
- Add focused automated verification and run the relevant repository checks and production build.

## Out of Scope

- Starting ChatGPT when it is not running.
- Terminating or restarting Codex CLI or Claude Code CLI.
- Restoring CLI arguments, working directories, conversations, or terminal state.
- Force-quitting ChatGPT.
- Restarting Foundry.
- Windows or Linux Runtime process control.
- Changing the existing pre-Apply review dialog or configuration-writing rules.
- Detecting or managing other Codex integrations.

## Decisions

- The configuration is successfully applied before restart handling begins.
- Restart failure does not roll back the applied configuration or Foundry's persisted Runtime state.
- The result dialog requires an explicit action and cannot be dismissed accidentally.
- `Restart Later` means the user accepts responsibility for restarting affected clients.
- An unavailable or unidentifiable ChatGPT desktop app is treated like a non-running application.
- Foundry starts neither ChatGPT nor a Runtime CLI when it was not already running.
- Automatic restart is limited to an already-running ChatGPT desktop app on macOS.
- Foundry identifies ChatGPT through its verified `com.openai.codex` bundle identifier rather than its display name.
- Restarting ChatGPT affects the entire desktop application and may interrupt work in Chat, Work, and Codex views.
- Foundry requests a normal ChatGPT quit and never escalates to a forced termination.
- Foundry waits up to 15 seconds for normal exit and up to 15 seconds to confirm the reopened application, polling at 250-millisecond intervals.
- A failed automatic restart is not retried in the interface; the result dialog gives stage-specific manual guidance and a `Got It` action.
- Existing Plan 018 remains historical; this plan records the new `Apply` label and post-Apply behavior.

## Tasks

- [x] [Task 001: Establish Safe ChatGPT Restart Control](./task001_establish-safe-chatgpt-restart-control.md)
- [x] [Task 002: Complete the Runtime Apply Success Experience](./task002_complete-the-runtime-apply-success-experience.md)
