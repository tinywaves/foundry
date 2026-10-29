---
name: foundry
description: Operate the local Foundry CLI for settings, model providers, saved page captures and their scrape jobs, or encrypted backup export/import. Use when a task asks to inspect or change Foundry data, capture web content into Foundry, investigate capture jobs, or transfer Foundry data; start the Web UI only when the user explicitly needs it.
---

# Foundry

Foundry is a local CLI workbench. Use the installed `foundry` command and treat
its JSON output as the authoritative state.

If `foundry` is not available on `PATH`, report that prerequisite to the user.
This skill documents product usage, not application development or packaging.

## Route By Task

Read only the references needed for the current request.

| User intent | Read |
| --- | --- |
| Invocation, JSON conventions, IDs, stdin, the Web UI | [references/cli-conventions.md](references/cli-conventions.md) |
| Appearance, language, timezone, capture fetcher configuration | [references/settings.md](references/settings.md) |
| List, create, update, disable, or discover models for providers | [references/providers.md](references/providers.md) |
| Captures, capture detail, notes, recapture, or child scrape jobs | [references/captures.md](references/captures.md) |
| Encrypted export, preview, or destructive restore | [references/data-transfer.md](references/data-transfer.md) |

## Core Model

- A **provider** has a stable provider ID and model-discovery configuration.
- A **capture** has a stable capture ID, URL, note, and latest successful
  content job.
- A **scrape job** is a child of exactly one capture. Its canonical command path
  is `foundry captures jobs ...`; there is no global jobs command.
- A successful capture command returns `capture.id`, `job.id`,
  `job.status`, and `content.markdown`.
- CLI timestamps are ISO-8601 strings. The CLI does not apply the user's display
  time format or timezone; that formatting belongs to the Web UI.
- Capture and provider records intentionally expose stored API keys in JSON
  because Foundry is local-only. Never repeat a credential unless the user
  explicitly needs the value.

## Operating Rules

1. Read current state before a nontrivial mutation.
2. Reuse IDs returned by create/list/get commands.
3. Treat provider `update` as full replacement, not partial patching.
4. Check `job.status` after capture operations. A command can exit successfully
   with a completed job whose status is `failed`.
5. Run `data-transfer inspect` before `data-transfer import`; import replaces the
   current database and settings.
6. Prefer `FOUNDRY_PASSPHRASE` over `--passphrase` so backup secrets do not enter
   shell history.
7. Use CLI commands instead of editing files under `<home>/.foundry` directly.

## Command Tree

```text
foundry web [--no-open]

foundry settings get
foundry settings update --input '<json>'
foundry settings open
foundry settings download-skill --target .agents,.claude

foundry providers list
foundry providers get <provider-id>
foundry providers create --input '<json>'
foundry providers update <provider-id> --input '<json>'
foundry providers set-status <provider-id> --status active|disabled|deleted
foundry providers models <provider-id>
foundry providers models-for-connection --input '<json>'

foundry captures list [--filter all|no-successful]
foundry captures counts
foundry captures get <capture-id>
foundry captures create <url> [--note <text>]
foundry captures recapture <capture-id>
foundry captures note <capture-id> <text>
foundry captures delete <capture-id>

foundry captures jobs list <capture-id>
foundry captures jobs get <capture-id> <job-id>
foundry captures jobs recapture <capture-id>

foundry data-transfer status
foundry data-transfer export --output <path> [--force]
foundry data-transfer inspect <path>
foundry data-transfer import <path>

```

`provider`, `capture`, and `data` are aliases for the corresponding command
groups. Run `foundry <command> --help` when the installed version may differ
from these references.

## Workflow: Capture A Page

1. Read `settings get`; if no capture fetcher is selected or its API key is
   empty, update settings first.
2. Run `captures create <url> --note <text>`.
3. Inspect the returned `job.status`.
4. On success, use the returned `content.markdown` directly or fetch it again
   later with `captures get <capture-id>`.
5. On failure, read the job reference and investigate through
   `captures jobs get`.

## Workflow: Change A Provider Safely

1. Run `providers get <provider-id>`.
2. Merge the requested changes into the complete existing provider object.
3. Preserve `apiKey` and `customModels` unless the user intends to replace them.
4. Run `providers update <provider-id> --input '<complete-json>'`.

## Workflow: Restore Data

1. Run `data-transfer status`; active jobs block transfers.
2. Run `data-transfer inspect <path>` and report the preview.
3. Proceed with `data-transfer import <path>` only when replacing current
   Foundry data is the explicit intent.
