# Instructions

## Overview

An instruction is reusable Markdown content stored by Foundry under a stable
ID. Instructions are the source material for agent orchestration: an agent
assignment selects instruction IDs and an order, then `enable` composes their
content into that agent's instruction file.

Instructions are independent of any one agent. The same instruction can be
assigned to ChatGPT and Claude Code, and removing it from one agent does not
change the other agent or the stored instruction.

Use this reference when the task is to create, read, edit, delete, list, or
inspect the instruction library. Read [Agents](agents.md) when the task also
assigns instructions to an agent or writes them into an agent file.

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
- Removing obsolete guidance after checking that no agent assignment still
  references it.

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
| In use | At least one agent assignment still contains the instruction ID |
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
  "createdAt": 1795801802798,
  "updatedAt": 1795801802798
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
created or changed. Missing flags are reported by the CLI argument parser
instead.

## List instructions

```bash
foundry instructions list
```

The command prints a JSON array ordered by `updatedAt`, newest first. Each item
has the same shape as the creation result, including the full Markdown content.
Both timestamps are Unix epoch milliseconds as numbers.

Because the full library can be large, prefer the agent-oriented view when only
assignment names and order are needed:

```bash
foundry agents instructions list
foundry agents instructions list chatgpt
```

That command resolves IDs to instruction names and does not print content. See
[Agents](agents.md#inspect-assignments).

## Read one instruction

```bash
foundry instructions get <id>
```

Prints one instruction as JSON with the same shape as the list result. Use the
ID printed by `new` or returned by `list`. A missing or malformed ID fails with
`INSTRUCTION_NOT_FOUND`.

## Edit an instruction

```bash
foundry instructions edit <id> \
  --name "Release checklist" \
  --content "# Release

- Run tests
- Verify the changelog"
```

Both `--name` and `--content` are required. Edit replaces both fields, uses the
same validation rules as creation, keeps the instruction ID and `createdAt`,
and advances `updatedAt`. It prints the updated record as JSON.

Editing changes the stored instruction only. Enabled agent files keep the
content from their previous write until the affected agent is reapplied:

```bash
foundry agents instructions reapply chatgpt
```

Read the current assignment first with
`foundry agents instructions list <agent>` when it is unclear which agents use
the instruction.

## Delete an instruction

```bash
foundry instructions delete <id>
```

The command removes the instruction Markdown file and prints the deleted record
as JSON. It does not remove assignments first.

Deletion is allowed only when no agent assignment references the ID. If any
assignment still contains it, the command fails with `INSTRUCTION_IN_USE` and
leaves the file unchanged. Clear the instruction from every agent before
retrying:

```bash
foundry agents instructions list
foundry agents instructions assign chatgpt --instructions <remaining-ids>
foundry agents instructions assign claude-code --instructions ""
foundry instructions delete <id>
```

Use `--instructions ""` when the agent should have no instructions. Otherwise
pass the remaining IDs in their existing order. If an agent is enabled, that
assignment update also rewrites or removes its managed block.

A missing or malformed ID fails with `INSTRUCTION_NOT_FOUND`.

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

1. Read the current record:

   ```bash
   foundry instructions get <id>
   ```

2. Edit it, keeping the ID stable:

   ```bash
   foundry instructions edit <id> \
     --name "Release checklist" \
     --content "# Release

   - Run tests
   - Verify the changelog"
   ```

3. Reapply each enabled agent that uses the instruction.

Agent assignments reference the stable ID, so editing does not require
reassigning the instruction. To remove the record instead, clear all
assignments and use `foundry instructions delete`.

### Remove an instruction from the library

1. Find which agents still reference it:

   ```bash
   foundry agents instructions list
   ```

2. Remove the ID from each agent assignment:

   ```bash
   foundry agents instructions assign chatgpt \
     --instructions <remaining-id-1>,<remaining-id-2>
   foundry agents instructions assign claude-code --instructions ""
   ```

3. Delete the unused record:

   ```bash
   foundry instructions delete <id>
   ```

Deletion is intentionally blocked until every assignment is clear, so a
managed agent file can never keep a dangling instruction reference.

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
createdAt: 1795801802798
updatedAt: 1795801802798
---

# Release

- Run tests
```

- The filename must match the frontmatter `id`.
- The leading frontmatter block is parsed with YAML; later `---` blocks belong
  to the instruction body.
- A malformed frontmatter block, invalid ID, non-millisecond timestamp, or
  filename/ID mismatch makes that file fail validation instead of producing a
  partial record.
- There is no separate index or database. An absent directory means an empty
  instruction list.
- On POSIX, the directory and files are private (`0700` / `0600`).

## Failure modes

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `INVALID_INSTRUCTION_INPUT` | Empty name/content, over-limit value, or invalid input shape | Fix the argument and retry |
| `INSTRUCTION_NOT_FOUND` | The ID is missing, malformed, or no longer stored | Run `foundry instructions list` and use a current ID |
| `INSTRUCTION_IN_USE` | At least one agent assignment still contains the instruction | Run `foundry agents instructions list`, clear the ID from every agent, then retry |
| CLI reports a missing required option | `--name` or `--content` omitted | Add both flags |
| `Invalid instruction file: ...` | A stored Markdown file is malformed or its ID/filename mismatch | Inspect that file in `<home>/.foundry/instructions`; do not guess which record is broken |
| Created instruction is not active in an agent | Creation does not assign or enable it | Use `agents instructions assign` and `enable` |
| Edited content is missing from an agent file | Editing does not rewrite external files | Run `agents instructions reapply` for that agent |

## Backup boundary

Encrypted backups currently contain settings only. Instruction Markdown files
and agent assignments are not included in `.foundry-backup` archives and are
not replaced by backup import. See
[Encrypted backups](backups.md#overview).

## Related

- [Agents](agents.md): assign, reorder, enable, disable, and reapply.
- [Settings](settings.md): application preferences and Skill installation.
- [Encrypted backups](backups.md): export and destructive replacement import.
