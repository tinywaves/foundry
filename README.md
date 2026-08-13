# Foundry

Foundry is an Electron desktop application for managing local AI agent Runtime configurations. The current release focuses on custom Provider management for Codex and Claude Code: define connection and model settings once, preview the resulting configuration changes, and apply them to the corresponding local Runtime.

> Foundry is in an early stage. Provider and Runtime management are functional; the Skills area is currently a placeholder, and broader tools, agents, and workflows remain future work.

Tagged builds are published on the [GitHub Releases](https://github.com/tinywaves/foundry/releases) page. The current automated release workflow produces an unsigned, unnotarized macOS Universal DMG, so macOS may require explicit approval before opening it.

## Current Features

- Manage separate custom Providers for Codex and Claude Code.
- Store Provider names, Base URLs, API keys, model mappings, remarks, websites, and optional avatars locally.
- Test Provider connectivity before or after saving.
- View Provider health and Runtime status from the dashboard.
- Select a Provider or restore Official Default settings for each Runtime.
- Preview every managed configuration field before writing to disk, with secrets redacted by default.
- Preserve settings outside Foundry's managed fields and keep a backup of the previous configuration.
- Automatically reapply an in-use Provider after a Runtime-effective edit.
- Show persistent restart guidance after every successful configuration write.
- On macOS, optionally restart an already-running ChatGPT desktop app so its hosted Codex experience reloads the configuration.

## Supported Runtimes

| Runtime | Configuration file | Managed configuration | Reload behavior |
| --- | --- | --- | --- |
| Codex | `~/.codex/config.toml` | Model selection and a Foundry-managed `model_providers` entry | Foundry can gracefully restart an already-running ChatGPT desktop app on macOS. Existing Codex CLI sessions must be restarted manually. |
| Claude Code | `~/.claude/settings.json` | Anthropic endpoint, token, model-role mappings, fallback model, and subagent model under `env` | Existing Claude Code CLI sessions must be restarted manually. |

Restoring Official Default removes the Runtime selection overrides managed by Foundry. It does not delete saved Provider records or unrelated Runtime settings.

## Typical Workflow

1. Open **Agent Runtime > Providers** and add a Provider for Codex or Claude Code.
2. Enter the endpoint, API key, and Runtime-specific model settings.
3. Run **Test Connection** to verify that the endpoint responds successfully.
4. Open **Agent Runtime > Runtimes**, select the desired Provider, and choose **Apply**.
5. Review the exact field-level changes in the preview dialog and confirm the write.
6. Follow the result dialog to restart the affected desktop application or CLI session.

When an in-use Provider is edited, Foundry saves the Provider first and reapplies it only when a Runtime-effective field changed. If the reapply fails, the saved Provider remains available and the dialog offers the existing Apply retry flow.

## Connection Tests

Provider tests run in the Electron main process with a 15-second timeout and do not follow redirects.

- Codex sends `GET <base-url>/models` and uses `Authorization: Bearer <api-key>` when a key is configured.
- Claude Code sends `GET <base-url>/v1/models`, or `GET <base-url>/models` when the Base URL already ends in `/v1`. It sends `anthropic-version: 2023-06-01` and uses `x-api-key` when configured.
- Any `2xx` response passes. Network, TLS, timeout, redirect, and non-`2xx` outcomes are recorded as sanitized connection failures.

## Configuration Safety

Foundry treats configuration writes as a previewed and recoverable operation:

- Existing TOML or JSON is parsed before any change is offered.
- Only the documented Runtime fields are modified; unrelated settings are preserved.
- The proposed output is generated, parsed again, and validated before replacing the active file.
- Writes use same-directory temporary files with restrictive `0600` permissions.
- The latest previous file content is stored beside the Runtime configuration as `<filename>.foundry-backup`.
- If the configuration is written but Foundry cannot record the new application state, it restores the previous file content.
- Concurrent writes to the same Runtime are rejected.

Provider records, including API keys and avatars, are stored in a local SQLite database named `foundry.sqlite` under Electron's platform-specific `userData` directory. Applied API keys are also written to the target Runtime configuration because the Runtime requires them. Treat both the Foundry user-data directory and Runtime configuration files as sensitive local data.

## ChatGPT Restart Behavior

Automatic restart is intentionally narrow and available only on macOS:

- ChatGPT is identified by the fixed bundle identifier `com.openai.codex`.
- Foundry offers restart only after confirming that ChatGPT is already running.
- Restart requests a normal application termination and never force-quits ChatGPT.
- Foundry waits up to 15 seconds for exit, reopens the same bundle, and waits up to another 15 seconds to confirm startup.
- If detection, quit, or reopen fails, the applied configuration remains intact and Foundry shows manual guidance without an automatic retry action.
- Foundry never launches ChatGPT when it was not already running and never starts or terminates Codex CLI or Claude Code CLI processes.

Restarting ChatGPT affects the entire desktop application and may interrupt work in its Chat, Work, and Codex views.

## Development

### Prerequisites

- Node.js `24.18.0`
- pnpm `11.9.0`

### Install and Run

```bash
pnpm install
pnpm dev
```

### Verify Changes

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

### Package the Application

```bash
pnpm build:mac
pnpm build:win
pnpm build:linux
```

`pnpm build:unpack` creates an unpacked application directory for local packaging checks. Pushing a `v*` tag runs the release workflow, builds a macOS Universal DMG, and attaches it to a GitHub Release. Automated release artifacts are not currently signed or notarized.

## Architecture

```text
src/main/       Electron lifecycle, SQLite storage, configuration writes,
                connection tests, and native ChatGPT control
src/preload/    Narrow contextBridge APIs for Provider and Runtime operations
src/renderer/   React UI, page workflows, and renderer-side response validation
src/shared/     Typed Provider and Runtime contracts shared across processes
resources/      Runtime packaging assets
build/          electron-builder resources and macOS entitlements
```

The renderer does not receive arbitrary filesystem, process, shell, or IPC access. Native operations remain in the main process and are exposed through purpose-specific preload methods with constrained inputs and validated responses.

## Technology

- Electron and `electron-vite`
- React 19 and TypeScript
- Astryx Design System and StyleX
- TanStack Query
- SQLite through `better-sqlite3`
- Vitest and ESLint
- `electron-builder`

## License

Foundry is licensed under the [Apache License 2.0](./LICENSE).
