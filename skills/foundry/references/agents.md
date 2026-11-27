# Agents

## Overview

Foundry composes saved instructions into external agent instruction files.
Agent orchestration has three layers:

1. **Instruction library**: reusable Markdown records under
   `<home>/.foundry/instructions`.
2. **Assignment**: an ordered list of instruction IDs stored per agent under
   `<home>/.foundry/agents`.
3. **Managed block**: the marked region Foundry writes into the agent's
   instruction file when the agent is enabled.

Assigning instructions changes Foundry state only. Enabling writes the block;
disabling removes the block; reapplying rewrites it. The instruction library
and all text outside Foundry's block remain independent.

Use this reference when the task is to inspect agent state, assign or reorder
instructions, turn instruction writing on or off, recover a managed block, or
open an agent's instruction file. Read [Instructions](instructions.md) first
when the needed instruction does not exist yet.

## Supported agents

The agents and output paths are fixed:

| Agent ID | Name | Instruction file |
| --- | --- | --- |
| `chatgpt` | ChatGPT | `~/.codex/AGENTS.md` |
| `claude-code` | Claude Code | `~/.claude/CLAUDE.md` |

`~` is the operating system user home directory. No command accepts an
arbitrary output path.

## When to use

Use `foundry agents` when the user wants to:

- See which instructions each agent currently receives.
- Make one or more instructions active for ChatGPT or Claude Code.
- Change the order in which instructions are concatenated.
- Temporarily stop Foundry from writing to an agent file without losing the
  assignment.
- Repair the managed block after a manual or malformed edit.
- Open the external file for inspection.

Do not hand-edit assignment JSON to achieve these outcomes. Use the commands so
the external files and stored state stay consistent.

## Inspect assignments

### Raw agent state

```bash
foundry agents list
```

Prints the fixed agents with `id`, `name`, `icon`, `instructionFile`,
`enabled`, and the ordered `instructionIds`.

### Resolved assignment view

```bash
foundry agents instructions list
foundry agents instructions list chatgpt
```

The optional agent ID filters the output to one agent. Each record resolves the
ordered IDs into names:

```json
[
  {
    "id": "chatgpt",
    "name": "ChatGPT",
    "instructionFile": "~/.codex/AGENTS.md",
    "enabled": false,
    "instructions": [
      { "id": "0a5fab1b-df3c-4721-8b0c-63ee87856292", "name": "Release checklist" },
      { "id": "d24f45f8-5be2-4f4c-8d3a-e1a7f0d6f1c2", "name": "Review rules" }
    ]
  }
]
```

The array order is the composition order. `name` is `null` when the assignment
references an instruction file that is missing; the record still appears so the
broken assignment is visible. Use `foundry instructions list` when the full
instruction content is needed.

## Assign and reorder

```bash
foundry agents instructions assign chatgpt --instructions <id1>,<id2>
```

`--instructions` replaces the entire ordered assignment for that agent. The
comma-separated order is the order the contents are concatenated.

- Adding an instruction: include all existing IDs plus the new ID in the
  desired position.
- Reordering: pass the same IDs in the new order.
- Removing one instruction: pass the remaining IDs.
- Clearing: pass an empty string.

```bash
foundry agents instructions assign chatgpt --instructions ""
```

Rules:

- The same instruction cannot appear twice in one agent.
- Unknown IDs fail with `UNKNOWN_INSTRUCTION`.
- Duplicate IDs fail with `DUPLICATE_INSTRUCTION`.
- Assigning while the agent is disabled does not write the external file.
- Assigning while the agent is enabled rewrites the managed block immediately.
- Clearing the final instruction also turns the agent off and removes the
  managed block.
- An instruction cannot be deleted while any agent assignment references its
  ID. Clear it from every agent first; otherwise deletion fails with
  `INSTRUCTION_IN_USE`.

## Apply and remove

| Command | Effect |
| --- | --- |
| `foundry agents instructions enable <agent>` | Write the managed block and mark the agent enabled |
| `foundry agents instructions disable <agent>` | Remove Foundry's managed block and mark the agent disabled |
| `foundry agents instructions reapply <agent>` | Rewrite the block for an already enabled agent |

```bash
foundry agents instructions enable chatgpt
foundry agents instructions disable chatgpt
foundry agents instructions reapply chatgpt
```

Semantics:

- `enable` fails with `AGENT_HAS_NO_INSTRUCTIONS` when the assignment is empty.
- `disable` preserves the ordered assignment. Enabling again restores the same
  block.
- `reapply` fails with `AGENT_DISABLED` when the agent is off.
- `disable` removes complete managed blocks and malformed Foundry markers while
  preserving all other file content.
- Enabling an agent whose file does not exist creates the file with only the
  managed block. Disabling a missing file does not create it.
- Editing an instruction does not rewrite enabled agent files. Reapply each
  agent that uses the edited instruction to write the new content.

## Open the file

```bash
foundry agents instructions open chatgpt
```

Opens the existing instruction file through the local operating system. Fails
with `AGENT_FILE_NOT_FOUND` when the file does not exist. Opening is a
read/inspection action; it does not rewrite the file.

## Common scenarios

### Apply the same instruction to both agents

```bash
foundry agents instructions assign chatgpt --instructions <id1>,<id2>
foundry agents instructions enable chatgpt

foundry agents instructions assign claude-code --instructions <id1>,<id2>
foundry agents instructions enable claude-code
```

Both files now contain the same instructions in the same order, each inside its
own Foundry managed block.

### Pause one agent without losing its order

```bash
foundry agents instructions disable claude-code
```

The Claude Code file loses only Foundry's block. Its stored assignment remains.
Resume later:

```bash
foundry agents instructions enable claude-code
```

### Move an instruction later in the composition

Read the current order, then reassign it explicitly:

```bash
foundry agents instructions assign chatgpt \
  --instructions <second-id>,<first-id>
```

If the agent is enabled, the file is rewritten immediately in the new order.

### Recover after editing inside the managed block

```bash
foundry agents instructions reapply chatgpt
```

Reapply regenerates the block from the current assignment. It does not recover
deleted text outside the block.

### Remove all instructions from one agent

```bash
foundry agents instructions assign chatgpt --instructions ""
```

This clears the assignment, turns the agent off, and removes the managed block.
The instruction records remain in the library and other agents are unchanged.

## Managed block

Foundry writes at most one block using these exact markers:

```md
<!-- foundry:instructions:start -->

...assigned instruction contents in order...

<!-- foundry:instructions:end -->
```

Enabling and reapplying overwrite the managed block. Disabling removes complete
blocks and malformed Foundry markers while preserving text outside them. A
single instruction's content is inserted as stored; Foundry does not rewrite
the Markdown body.

## Storage

Each agent has one JSON profile:

```text
<home>/.foundry/agents/<sha256(agent-id)>.json
```

The profile keeps the stable agent ID at the top level and instruction state in
an `instructions` namespace:

```json
{
  "id": "chatgpt",
  "instructions": {
    "instructionIds": ["instruction-id-1", "instruction-id-2"],
    "enabled": true,
    "createdAt": 1795824000000,
    "updatedAt": 1795824000000
  }
}
```

Read it through `foundry agents list` or
`foundry agents instructions list`; use the CLI for writes. Timestamps are Unix
epoch milliseconds, not ISO strings.

## Errors

| Code | Meaning | Recovery |
| --- | --- | --- |
| `AGENT_NOT_FOUND` | The agent ID is not `chatgpt` or `claude-code` | Use a supported ID |
| `UNKNOWN_INSTRUCTION` | An assigned instruction ID has no stored record | Create the instruction or remove the ID |
| `DUPLICATE_INSTRUCTION` | The same ID appears twice in one assignment | Pass each ID once |
| `AGENT_HAS_NO_INSTRUCTIONS` | Tried to enable an empty assignment | Assign at least one instruction |
| `AGENT_DISABLED` | Tried to reapply while the agent is off | Enable the agent first |
| `AGENT_FILE_NOT_FOUND` | Tried to open a file that does not exist | Enable the agent or write the file outside Foundry first |
| `INVALID_AGENT_INPUT` | Malformed API/CLI input shape | Correct the argument |

Operation errors use Foundry's JSON error envelope and exit nonzero.

## Related

- [Instructions](instructions.md): create and list the Markdown records.
- [Settings](settings.md): application preferences and Skill installation.
- [Encrypted backups](backups.md): backup scope; assignments are not included.
