# CLI Conventions

## Prerequisite

Use the installed `foundry` executable on `PATH`. Check availability with
`foundry --version` or the user's normal command-discovery mechanism.

If the command is unavailable, stop and report that the Foundry CLI is not
installed or not on `PATH`. Do not initialize storage manually.

## Command Discovery

```bash
foundry --help
foundry <command> --help
foundry <command> <subcommand> --help
```

Running bare `foundry` prints help. It does not initialize storage or start the
Web UI.

Command aliases:

- `provider` -> `providers`
- `capture` -> `captures`
- `data` -> `data-transfer`
- `ls` -> `list` where listed by command help
- `show` -> `get` where listed by command help
- `add` -> `create` where listed by command help
- `remove` / `rm` -> `delete` for captures
- `restore` -> `import` for data transfer

## JSON Contract

Successful feature commands write one JSON value to stdout. Do not scrape or
parse localized human prose. Help output is plain text and is only for command
discovery.

Expected domain failures write a JSON envelope to stderr:

```json
{
  "error": {
    "code": "CAPTURE_NOT_FOUND",
    "message": "Capture not found"
  }
}
```

The process exit code is `1` for handled command errors. A failed scrape is
different: capture commands can return successful JSON with `job.status` set to
`"failed"`, so always inspect the job payload.

Citty argument/usage errors may print command help instead of the JSON error
envelope. Correct the command shape and retry.

## JSON Input

Commands that accept structured input support:

```bash
foundry providers create --input '{"name":"Local"}'
foundry providers create --input-file ./provider.json
printf '%s' '{"name":"Local"}' | foundry providers create --input -
```

Use a file or stdin for large payloads and secrets. Provide either `--input` or
`--input-file`, not both.

Error codes for input handling include:

- `INPUT_REQUIRED`
- `CONFLICTING_INPUT`
- `INPUT_READ_FAILED`
- `INVALID_JSON`

## IDs

Use IDs exactly as returned. Do not infer them from names, URLs, or timestamps.

- Provider create returns a top-level `id`.
- Capture create returns `capture.id` and `job.id`.
- Capture list/get returns `capture.id`.
- Job list/get returns `job.id` and `captureId`.

Jobs are capture-owned. Query a job with both IDs:

```bash
foundry captures jobs get <capture-id> <job-id>
```

## Timestamps

CLI timestamps are ISO-8601 strings such as
`2026-10-29T08:58:12.061Z`. Convert them for presentation only when the user
asks; preserve the original value when passing data between commands.

## Secrets

Provider responses and settings responses include stored API keys. This is
intentional for a local-only product. Do not print, quote, summarize, or write
those values to logs unless the user explicitly requests them.

For backup passphrases:

```bash
export FOUNDRY_PASSPHRASE='...'
foundry data-transfer export --output ./foundry.foundry-backup
```

Prefer the environment variable over `--passphrase`.

## Web UI

Start the Web UI only when the user asks for the browser interface:

```bash
foundry web
foundry web --no-open
```

This is a long-running process on `http://127.0.0.1:11111`. For data operations,
use the feature CLI commands instead of keeping the Web server running.

## Downloading The Skill

The installed Foundry package contains this skill. Download the complete skill
directory by copying it into one or both supported workspace targets:

```bash
foundry settings download-skill --target .agents
foundry settings download-skill --target .agents,.claude
```

Target destinations are relative to the user home directory. Here `<home>` is
`~` on POSIX and `%USERPROFILE%` on Windows:

- `.agents` -> `<home>/.agents/skills/foundry`
- `.claude` -> `<home>/.claude/skills/foundry`

Selecting both copies the same skill into both locations. An existing selected
destination is replaced with the bundled version; unselected destinations are
left untouched.

The Web UI exposes the same multi-select operation from Advanced settings.
