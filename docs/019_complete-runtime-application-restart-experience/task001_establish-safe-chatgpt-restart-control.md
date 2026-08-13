# Task 001: Establish Safe ChatGPT Restart Control

## Status

`completed`

## Goal

Establish a constrained and testable macOS main-process capability that identifies and gracefully restarts the ChatGPT desktop app that hosts Codex, providing a stable contract for the post-Apply experience in Task 002.

## Detail

Add a dedicated ChatGPT application controller in the Runtime-owned main-process boundary. Identify the application only by the fixed `com.openai.codex` bundle identifier verified for the current ChatGPT desktop app; do not rely on its display name, executable name, path, or a general process scan.

Use the fixed `/usr/bin/osascript` executable with a bundled JavaScript for Automation script that imports AppKit and calls `NSRunningApplication.runningApplicationsWithBundleIdentifier`. The controller must not use System Events, Accessibility APIs, arbitrary shell commands, or renderer-supplied script content. This avoids requesting Automation or Accessibility permission and keeps the native capability limited to one known application.

Expose a no-input running-state operation and a no-input restart operation through the existing Runtime IPC controller, preload bridge, and shared Runtime contract. Continue to accept requests only from registered main-window main frames. The running-state result distinguishes `running`, `not-running`, and `unavailable`; lookup or output-validation failures are sanitized as `unavailable` rather than treated as evidence that automatic restart is possible.

At restart execution time, query the running state again instead of trusting an earlier renderer observation. If ChatGPT is no longer running, return `not-running` and do not open it. If ChatGPT is running, submit the ordinary AppKit `terminate` request and never call a force-termination API. Poll the bundle-scoped running state every 250 milliseconds for at most 15 seconds. A rejected termination request, lookup failure, or timeout returns `quit-failed` and must not proceed to reopening.

Only after confirming that ChatGPT has fully exited, reopen it through macOS LaunchServices using the same fixed bundle identifier. Poll the bundle-scoped state every 250 milliseconds for at most another 15 seconds. Return `restarted` only after ChatGPT is observed running again. A LaunchServices failure, lookup failure, or reopen timeout returns `reopen-failed`. The controller must serialize restart attempts; a concurrent restart request returns the existing sanitized Runtime conflict error rather than launching a second workflow.

Model restart outcomes as a closed shared union containing `restarted`, `not-running`, `quit-failed`, `reopen-failed`, and `unavailable`. Do not expose command arguments, raw standard output, standard error, executable paths, process identifiers, or native exception details. Task 002 will translate these outcomes into user-facing success or manual-restart guidance.

Keep native execution, platform detection, time progression, and polling injectable behind narrow local interfaces so automated tests can cover every state transition without terminating or launching the installed ChatGPT application. On platforms other than macOS, both capabilities return `unavailable` without invoking native process control. Integrate the controller into `RuntimeSubsystem` without coupling it to storage initialization so restart availability remains independent of the Foundry database.

## Findings

None.

## Dependencies

None.

## Deliverables

- Shared ChatGPT running-state and restart-result types with two no-input Runtime API operations.
- A bundle-scoped macOS ChatGPT application controller using AppKit and LaunchServices through fixed native entry points.
- Trusted Runtime IPC, preload, and subsystem integration that exposes no arbitrary process-control inputs.
- Focused automated coverage for availability, state races, graceful quit, reopen, timeouts, concurrency, platform handling, output validation, and error sanitization.

## Acceptance Criteria

- [x] ChatGPT is identified only by the fixed `com.openai.codex` bundle identifier, independent of display name, executable name, installation path, and unrelated processes.
- [x] A state-query or native-output failure returns `unavailable` and cannot cause the renderer to offer automatic restart as available.
- [x] A restart request rechecks current state and never launches ChatGPT when it is already not running.
- [x] Reopening is attempted only after the same bundle identifier is confirmed to have fully exited.
- [x] Graceful exit and confirmed reopen each use a 15-second upper bound with 250-millisecond polling.
- [x] A rejected quit request, exit timeout, native failure, or reopen failure never escalates to force termination.
- [x] Concurrent restart requests cannot create overlapping quit or launch operations.
- [x] Renderer callers cannot select a bundle identifier, executable, process, path, command, script, timeout, or polling interval.
- [x] The closed result contract lets Task 002 distinguish successful restart, no-longer-running state, quit failure, reopen failure, and unavailable native control without receiving sensitive native details.
- [x] Requests remain restricted to registered main-window main frames.
- [x] Non-macOS platforms return `unavailable` without invoking native process control.
- [x] Automated tests exercise the approved transitions without terminating or launching the installed ChatGPT application.

## Out of Scope

- Renaming the Runtimes-page Apply action or changing any renderer UI.
- Adding the post-Apply result dialog or its user-facing wording.
- Starting ChatGPT when it was not running at restart-request time.
- Force-quitting ChatGPT or controlling Codex CLI, Claude Code CLI, or any other process.
- Windows or Linux application detection and restart behavior.
- Retrying a failed automatic restart.

## Handoff

Task 002 will consume only the no-input ChatGPT running-state operation and the closed one-shot restart result. It will not need access to bundle identifiers, AppKit, LaunchServices, scripts, commands, paths, processes, or timing internals.

## Verification

- `pnpm test` - Passed 14 test files and 90 tests, including 12 focused ChatGPT application-controller tests.
- `pnpm typecheck` - Passed Node and Web TypeScript checks.
- `pnpm lint` - Passed with only the repository's existing ESLint configuration deprecation notices.
- `pnpm build` - Passed main, preload, and renderer production builds.
- `git diff --check` - Passed.
- Installed ChatGPT application termination and reopening were not invoked; native behavior was verified through injected operations and the fixed bundle-scoped command contract.
