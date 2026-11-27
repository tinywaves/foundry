# Agent orchestration

## Scope

The Instructions Web page composes saved instructions into external agent
instruction files. The feature is available in the Web UI, local API, and
`foundry agents` CLI command group.

The supported agents and paths are fixed:

| ID | Name | Instruction file | Icon |
| --- | --- | --- | --- |
| `chatgpt` | ChatGPT | `~/.codex/AGENTS.md` | OpenAI |
| `claude-code` | Claude Code | `~/.claude/CLAUDE.md` | Claude Code |

`~` is the operating system user home directory. The API never accepts an
arbitrary output path.

## Web page

At `#/library/instructions`, desktop layouts show the saved instruction list on
the left and the two agent cards on the right. Narrow layouts stack the two
regions. The instruction list shows each saved name and supports dragging into
an agent.

An agent card shows its icon, name, fixed file path, apply switch, and Reapply
action. The file path opens that existing file through the local operating
system. Dragging from the instruction list adds an instruction to the end of the
agent's ordered assignment and ignores duplicates within that agent. Assigned
rows can be removed individually or reordered by drag; the visible number is
the order used when composing the file.

Assigning instructions only changes Foundry state. The external file is not
modified while the switch is off. With the switch on, adding, removing, or
reordering instructions rewrites the managed block immediately. Turning the
switch off removes the managed block. Removing the final assigned instruction
also turns the switch off and removes the block. Reapply is available only while
the switch is on and rewrites the current block to recover from manual or
malformed edits.

Editing an instruction updates the stored instruction only. Enabled agent files
keep the content from their previous write until the affected agent is
reapplied or re-enabled.

An instruction cannot be deleted while any agent assignment references its ID.
Clear it from every agent first; the API returns `409 INSTRUCTION_IN_USE` and
leaves the Markdown file unchanged.

## API

`packages/shared/src/agents.ts` defines the shared response and input contracts.

| Method and path | Result |
| --- | --- |
| `GET /api/agents` | Ordered fixed-agent array with enabled state and instruction IDs |
| `PUT /api/agents/:id/instructions` | Replace the ordered assignment; body `{ "instructionIds": string[] }` |
| `PUT /api/agents/:id/enabled` | Apply or remove the block; body `{ "enabled": boolean }` |
| `POST /api/agents/:id/reapply` | Rewrite the block for an enabled agent |
| `POST /api/agents/:id/open-file` | Ask the server host to open the existing file |

Errors use the standard Foundry JSON envelope. Relevant codes are
`AGENT_NOT_FOUND` (`404`), `AGENT_FILE_NOT_FOUND` (`404`),
`AGENT_HAS_NO_INSTRUCTIONS` (`400`), `UNKNOWN_INSTRUCTION` (`400`),
`DUPLICATE_INSTRUCTION` (`400`), and `AGENT_DISABLED` (`409`).

## CLI

The CLI maps directly to the API operations:

```bash
foundry agents list
foundry agents instructions list [agent]
foundry agents instructions assign chatgpt --instructions <id1>,<id2>
foundry agents instructions enable chatgpt
foundry agents instructions disable chatgpt
foundry agents instructions reapply chatgpt
foundry agents instructions open chatgpt
```

`agents list` reports the fixed agents and their raw assignment state.
`agents instructions list` optionally filters to one agent and resolves the
ordered assignment into `{ id, name }` entries; `name` is `null` if the
referenced instruction file is missing.

`agents instructions assign` replaces the ordered assignment for one agent; the
comma-separated order is the composition order. Passing an empty string clears
the assignment. Duplicate or unknown instruction IDs are rejected. Assigning
does not write the external file while the agent is disabled.
`agents instructions enable` writes the block and fails when the assignment is
empty; `disable` removes only Foundry's managed block; `reapply` rewrites the
block for an enabled agent. `open` opens an existing instruction file through
the operating system.

## Assignment storage

Each agent has one JSON profile:

```text
<home>/.foundry/agents/<sha256(agent-id)>.json
```

The profile keeps the stable agent `id` at the top level and capability state in
named objects. The current record format is:

```json
{
  "id": "chatgpt",
  "instructions": {
    "instructionIds": [
      "instruction-id-1",
      "instruction-id-2"
    ],
    "enabled": true,
    "createdAt": 1795824000000,
    "updatedAt": 1795824000000
  }
}
```

The fixed agent definitions supply names, icons, and file paths; the record
stores only mutable capability state. Agent records are outside the encrypted
backup payload. Timestamps are Unix epoch milliseconds, not ISO strings.

The record remains agent-centric because ordering is per agent. Putting the
assignment list into each instruction file's frontmatter would duplicate shared
instructions across agents, make reorder operations rewrite many files, and
still require a separate agent-level `enabled` state. A top-level agent profile
also leaves room for future sibling capability objects without coupling them to
instruction Markdown bodies.

## Managed block

Foundry writes one block at the end of the external instruction file:

```md
<!-- foundry:instructions:start -->

...assigned instruction Markdown in assignment order...

<!-- foundry:instructions:end -->
```

The marker text is exactly `<!-- foundry:instructions:start -->` and
`<!-- foundry:instructions:end -->`. Before writing, Foundry removes all
recognized Foundry marker blocks and malformed Foundry marker comment lines, so
the final file contains one current block. Stray end markers are removed;
an unmatched start marker removes content through the end of the file.
Malformed marker comments without a usable direction are also removed. Text
outside recognized Foundry marker regions is otherwise preserved. Existing line
endings are kept; a file without a trailing newline gains the single line break
required before the marker.

Disabling removes complete managed blocks and Foundry marker comments, leaving
the rest of the file unchanged. If the external file does not exist, enabling
creates it with only the managed block, while disabling does not create a file.

Writes replace the external file atomically. Existing file permissions are
preserved; a newly created file uses `0600`, and a newly created parent
directory uses `0700` on POSIX.

## Source map

- `src/features/agents/definitions.ts`: fixed agent IDs, names, icons, and paths
- `src/features/agents/document.ts`: block rendering and cleanup rules
- `src/features/agents/service.ts`: orchestration and external file writes
- `src/features/agents/repository.ts`: assignment record persistence
- `src/features/agents/routes.ts`: API routes
- `src/cli/commands/agents.ts`: `foundry agents` command group
- `packages/shared/src/agents.ts`: shared Web/server contracts
- `app/web/src/features/agents/`: browser adapter, query state, cards, and icons
- `app/web/src/features/instructions/`: instruction list, page, dialog, and drag source
- `test/agents.test.ts`: service, file, API, and block cleanup behavior
