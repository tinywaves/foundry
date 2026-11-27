---
name: foundry
description: Operate the local Foundry workbench through its installed CLI. Use when a task asks to create, read, edit, delete, list, assign, enable, disable, or reapply Foundry instructions for ChatGPT or Claude Code, read or change Foundry settings, open its configuration folder, export or import encrypted Foundry data, install or inspect the Foundry Skill, or start its Web UI.
---

# Foundry

Foundry is a local personal workbench distributed as a CLI with a bundled Web
UI. The CLI is the stable interface for agents: it creates and reads runtime
data, applies instructions to external agent files, and prints machine-readable
JSON.

Use this Skill when the user wants to:

- Save, read, edit, delete, or inspect reusable Markdown instructions.
- Make ChatGPT or Claude Code follow selected instructions.
- Reorder, enable, disable, or reapply an agent's instruction set.
- Read or change appearance, language, time zone, or time format.
- Export or replace Foundry data with an encrypted backup.
- Open Foundry's data folder or install this Skill for other agents.
- Start the local Web UI for visual inspection.

If `foundry` is unavailable, report the missing prerequisite instead of editing
runtime files by hand.

## Feature map

Read the linked reference before operating a feature. Each reference contains
the command details, output shapes, failure modes, and end-to-end examples.

| Need | CLI entry point | Reference |
| --- | --- | --- |
| Create, read, edit, delete, or list reusable Markdown instructions | `foundry instructions` | [Instructions](references/instructions.md) |
| Inspect, assign, enable, disable, or reapply instructions for an agent | `foundry agents instructions` | [Agents](references/agents.md) |
| Inspect supported agents and raw assignment state | `foundry agents list` | [Agents](references/agents.md) |
| Read or change application preferences | `foundry settings get/set` | [Settings](references/settings.md) |
| Export or import an encrypted backup | `foundry settings export/import` | [Encrypted backups](references/backups.md) |
| Install or refresh this Skill | `foundry settings download-skill` | [Settings](references/settings.md#install-this-skill) |
| Open the Web UI | `foundry web` | [Web UI](#web-ui) |

## How the pieces fit

Instructions, agent assignments, and agent files are three separate layers:

```text
<home>/.foundry/instructions/<id>.md
        |
        |  assign: choose IDs and order
        v
<home>/.foundry/agents/<sha256(agent-id)>.json
        |
        |  enable: write the managed block
        v
~/.codex/AGENTS.md or ~/.claude/CLAUDE.md
```

- An instruction is reusable content with an ID, name, and Markdown body.
- An agent assignment is an ordered list of instruction IDs. The same
  instruction can be assigned to multiple agents.
- Assigning only changes Foundry state. The external agent file changes only
  through `enable`, `disable`, or `reapply`.
- Foundry owns only its marked block in the external file. Text outside the
  block remains untouched.

## Safe workflow

1. Read current state before changing it:

   ```bash
   foundry instructions list
   foundry agents instructions list
   ```

2. Use a feature command for the write. Do not hand-edit instructions,
   assignment records, or Foundry's managed block.
3. Verify the result:

   ```bash
   foundry agents instructions list chatgpt
   ```

4. When the task touches an agent file, confirm the returned JSON and the
   resulting managed block.

## Common workflows

### Create an instruction and apply it to both agents

```bash
foundry instructions new \
  --name "Release checklist" \
  --content "# Release

- Run tests
- Update the changelog"

foundry agents instructions assign chatgpt --instructions <instruction-id>
foundry agents instructions enable chatgpt

foundry agents instructions assign claude-code --instructions <instruction-id>
foundry agents instructions enable claude-code
```

Read [Instructions](references/instructions.md) for creation rules and
[Agents](references/agents.md) for assignment and enable semantics.

### Edit an instruction and propagate the new content

```bash
foundry instructions edit <instruction-id> \
  --name "Release checklist" \
  --content "# Release

- Run tests
- Verify the changelog"
```

Editing changes the stored instruction only. Reapply each enabled agent that
uses it:

```bash
foundry agents instructions reapply chatgpt
foundry agents instructions reapply claude-code
```

### Inspect what each agent currently receives

```bash
foundry agents instructions list
```

This resolves ordered IDs to instruction names. Use `foundry instructions list`
when the full Markdown content is needed.

### Delete an instruction nobody uses

```bash
foundry agents instructions list
foundry instructions delete <instruction-id>
```

Deletion is blocked while any agent assignment references the instruction.
Clear the assignment from every agent before deleting; see
[Instructions](references/instructions.md#delete-an-instruction).

### Temporarily stop writing instructions without losing the order

```bash
foundry agents instructions disable chatgpt
```

The assignment remains stored. Later:

```bash
foundry agents instructions enable chatgpt
```

### Change only application preferences

```bash
foundry settings get
foundry settings set color-theme dark
foundry settings set language zh-CN
```

## CLI conventions

- Successful business operations print JSON. Parse the output instead of
  scraping human text.
- Operation errors print
  `{"error":{"code":"...","message":"..."}}` to stderr and exit nonzero.
- Argument-parsing errors use the CLI's diagnostic output.
- Use `foundry --help` and `foundry <feature> <command> --help` to confirm the
  installed version's command tree and arguments.
- Quote values containing spaces or newlines. Commands are non-interactive.
- Run `foundry` without a command only to read help; it does not initialize
  storage or start the Web UI.
- Keep backup passphrases and other credentials out of logs and responses.

## Data locations

| Path | Contents |
| --- | --- |
| `<home>/.foundry/settings.json` | Normalized application settings |
| `<home>/.foundry/instructions/<id>.md` | One Markdown instruction per file |
| `<home>/.foundry/agents/<sha256(agent-id)>.json` | Assignment order and enabled state per agent |
| `~/.codex/AGENTS.md` | ChatGPT instruction file managed by Foundry |
| `~/.claude/CLAUDE.md` | Claude Code instruction file managed by Foundry |
| `<home>/.agents/skills/foundry` | Installed Skill for `.agents` targets |
| `<home>/.claude/skills/foundry` | Installed Skill for `.claude` targets |

`<home>` is the operating system user home directory (`~` on POSIX). Treat
Foundry's JSON and Markdown stores as runtime data; use the CLI for writes.

## Web UI

Start the Web UI when the user asks for it:

```bash
foundry web
```

Use `--no-open` to start the same local server without opening a browser. It
prints the URL and serves the UI on port `11111`. Instructions and Settings are
the implemented Web features. The Instructions page is at
`#/library/instructions` and supports creation, direct source editing, and
agent assignment. Right-clicking an instruction row exposes Edit and Delete;
Delete is disabled while an agent assignment uses the instruction. The Web UI
edits Markdown source and does not render it.
Settings routes are documented in
[Settings](references/settings.md#web-ui-synchronization).

## Safety boundaries

- Backup import is destructive and replaces supported data. Read
  [Encrypted backups](references/backups.md) before running it.
- Encrypted backups include instructions and agent assignments, but not the
  external agent instruction files. Reapply enabled agents after import.
- Deleting an instruction is rejected with `INSTRUCTION_IN_USE` while any agent
  assignment references its ID. Clear those assignments first.
- Enabling an agent overwrites Foundry's managed block. Reapply is the recovery
  path after manual or malformed edits inside that block.
- The agent output paths are fixed. No command accepts an arbitrary destination
  path.
