# Instructions

## Overview

An instruction is reusable Markdown content stored by Foundry under a stable
ID. Instructions are the source material for agent orchestration: an agent
assignment selects instruction IDs and an order, then `enable` composes their
content into that agent's instruction file.

Instructions are independent of any one agent. The same instruction can be
assigned to ChatGPT and Claude Code, and removing it from one agent does not
change the other agent or the stored instruction.

Use this reference when the task is to create, list, or inspect the instruction
library. Read [Agents](agents.md) when the task also assigns instructions to an
agent or writes them into an agent file.

## When to use

Create an instruction for durable guidance that should be reused across
sessions, for example:

- Repository conventions such as test commands, formatting rules, or review
  checklists.
- A release or deployment checklist that should be applied to multiple coding
  agents.
- A reusable prompt fragment or operating procedure the user wants to keep and
  edit outside a single conversation.
- Shared behavior for both ChatGPT and Claude Code.

Keep one-off task text in the conversation rather than creating an instruction.
An instruction is a stored record, not a temporary prompt.

## Concepts

| Term | Meaning |
| --- | --- |
| Instruction | One Markdown record in the Foundry library |
| ID | Lowercase UUID assigned at creation; also the Markdown filename |
| Name | Human-readable label, trimmed, maximum 200 characters |
| Content | Markdown body preserved as supplied |
| Assignment | Ordered list of instruction IDs stored on an agent |
| Managed block | The marked region Foundry writes into an agent file |

Instructions are not automatically active. They affect an agent only after the
instruction is assigned and that agent is enabled. See [Agents](agents.md) for
the assignment and write rules.

## Create an instruction

Create a record with `foundry instructions new`. Both `--name` and `--content`
are required.

```bash
foundry instructions new \
  --name "Release checklist" \
  --content "# Release

- Run tests
- Update the changelog"
```

Quote content containing spaces or newlines. The shell passes the quoted
multi-line value as one argument.

The command prints the created record as JSON:

```json
{
  "id": "0a5fab1b-df3c-4721-8b0c-63ee87856292",
  "name": "Release checklist",
  "content": "# Release\n\n- Run tests\n- Update the changelog",
  "createdAt": "2026-11-27T17:50:02.798Z",
  "updatedAt": "2026-11-27T17:50:02.798Z"
}
```

Save the returned `id` when the next step assigns the instruction to an agent.

### Creation rules

| Field | Rule |
| --- | --- |
| `name` | Required; surrounding whitespace is trimmed; 1–200 characters after trimming |
| `content` | Required; must contain a non-whitespace character; maximum 1,000,000 characters |
| Markdown body | Preserved from the supplied value; leading/trailing whitespace is not normalized |

Invalid input fails with code `INVALID_INSTRUCTION_INPUT` and no file is
created. Missing flags are reported by the CLI argument parser instead.

## List instructions

```bash
foundry instructions list
```

The command prints a JSON array ordered by `updatedAt`, newest first. Each item
has the same shape as the creation result, including the full Markdown content.

Because the full library can be large, prefer the agent-oriented view when only
assignment names and order are needed:

```bash
foundry agents instructions list
foundry agents instructions list chatgpt
```

That command resolves IDs to instruction names and does not print content. See
[Agents](agents.md#inspect-assignments).

## Common workflows

### Apply a new instruction to both agents

```bash
foundry instructions new \
  --name "Code review rules" \
  --content "Review for correctness, tests, and regressions."
```

Use the returned ID with each agent:

```bash
foundry agents instructions assign chatgpt --instructions <instruction-id>
foundry agents instructions enable chatgpt

foundry agents instructions assign claude-code --instructions <instruction-id>
foundry agents instructions enable claude-code
```

### Add an instruction while preserving the existing order

1. Read the current assignment:

   ```bash
   foundry agents instructions list chatgpt
   ```

2. Reassign with the full list, placing the new ID where it should appear:

   ```bash
   foundry agents instructions assign chatgpt \
     --instructions <existing-id-1>,<existing-id-2>,<new-id>
   ```

`assign` replaces the entire assignment, so omitting an existing ID removes it.

### Replace instruction content

The current CLI has no update or delete command. To change content:

1. Create a new instruction with the revised Markdown.
2. Reassign the agent using the new ID in the desired position.
3. Enable or reapply the agent so the external file picks up the new content.

The old instruction remains in the library. Do not edit the Markdown file
directly unless the user explicitly wants manual recovery.

## Storage and format

Each instruction is stored as one Markdown file:

```text
<home>/.foundry/instructions/<id>.md
```

The file uses YAML frontmatter followed by the untouched Markdown body:

```md
---
id: 0a5fab1b-df3c-4721-8b0c-63ee87856292
name: Release checklist
createdAt: 2026-11-27T17:50:02.798Z
updatedAt: 2026-11-27T17:50:02.798Z
---

# Release

- Run tests
```

- The filename must match the frontmatter `id`.
- The leading frontmatter block is parsed with YAML; later `---` blocks belong
  to the instruction body.
- A malformed frontmatter block, invalid ID, unparseable timestamp, or
  filename/ID mismatch makes that file fail validation instead of producing a
  partial record.
- There is no separate index or database. An absent directory means an empty
  instruction list.
- On POSIX, the directory and files are private (`0700` / `0600`).

## Failure modes

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `INVALID_INSTRUCTION_INPUT` | Empty name/content, over-limit value, or invalid input shape | Fix the argument and retry |
| CLI reports a missing required option | `--name` or `--content` omitted | Add both flags |
| `Invalid instruction file: ...` | A stored Markdown file is malformed or its ID/filename mismatch | Inspect that file in `<home>/.foundry/instructions`; do not guess which record is broken |
| Created instruction is not active in an agent | Creation does not assign or enable it | Use `agents instructions assign` and `enable` |

## Backup boundary

Encrypted backups currently contain settings only. Instruction Markdown files
and agent assignments are not included in `.foundry-backup` archives and are
not replaced by backup import. See
[Encrypted backups](backups.md#overview).

## Related

- [Agents](agents.md): assign, reorder, enable, disable, and reapply.
- [Settings](settings.md): application preferences and Skill installation.
- [Encrypted backups](backups.md): export and destructive replacement import.
