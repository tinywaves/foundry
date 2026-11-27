# Instructions implementation

## Scope and routes

Instructions is an implemented feature with a Web page and CLI command. The Web
page is `#/library/instructions`. It renders the stored instructions newest
first and exposes creation through a page-header action. The list has loading,
empty, and error states; edit and delete flows are not implemented yet.

The creation dialog requires a name and Markdown content. Content is edited in a
lazily loaded Monaco editor using the local Monaco bundle and editor worker.
The editor follows the application light/dark theme, preserves Markdown source,
and displays the Markdown save behavior in its placeholder.

The list is owned by React Query under the `instructions` query key. Each row
shows the instruction name. A successful creation updates the cached list
immediately and invalidates the query so the API remains authoritative. List
failures show an inline retry action rather than replacing the page.

The instruction list is also the drag source for agent orchestration. Dragging
does not edit the instruction file. Assignments, managed external files, and the
agent API are covered in [Agent orchestration](agents.md). Ordered agent
assignment state lives in the agent profile under
`<home>/.foundry/agents/<sha256(agent-id)>.json`, inside its `instructions`
namespace rather than in instruction Markdown frontmatter.

## Contracts and API

`packages/shared/src/instructions.ts` defines the shared `Instruction` and
`CreateInstructionInput` contracts. `InstructionsService` owns application
rules, and the repository owns Markdown file access.

| Method and path | Result |
| --- | --- |
| `GET /api/instructions` | Array of instructions ordered by `updatedAt`, newest first |
| `POST /api/instructions` | Created instruction with status `201` |

`POST` accepts `{ "name": string, "content": string }`. Validation errors return
status `400` with Foundry's standard JSON error envelope and code
`INVALID_INSTRUCTION_INPUT`. Names are trimmed, must be non-empty, and are
limited to 200 characters. Content must contain a non-whitespace character and
is limited to 1,000,000 characters.

## File storage

Each instruction is one Markdown file:

```text
<home>/.foundry/instructions/<id>.md
```

The filename ID is a lowercase UUID and must match the frontmatter ID. The file
format is:

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

The YAML parser reads only the leading frontmatter block. The remaining Markdown
is returned unchanged, so later `---` blocks are valid instruction content.
Malformed frontmatter, an invalid ID, unparseable timestamps, an overlong name,
or a filename/frontmatter mismatch makes that file fail validation rather than
returning a partially decoded record.

Writes use the storage module's atomic text writer. The `instructions` directory
is private (`0700` on POSIX) and instruction files are private (`0600`). There is
no separate index, manifest, cache, or database. If the directory is absent the
API returns an empty list.

## CLI

```bash
foundry instructions new \
  --name "Release checklist" \
  --content "# Release

- Run tests"
```

Both arguments are required. Quote values containing spaces or newlines. The
command initializes temporary feature services through the normal CLI
composition, creates the file, and prints the created instruction as JSON.

List instructions, newest first:

```bash
foundry instructions list
```

The command prints the same ordered JSON array as `GET /api/instructions`. There
is currently no CLI update or delete command.

## Backup boundary

The current encrypted data export contains normalized settings only. Instructions
are not included in `.foundry-backup` archives and are not removed or replaced by
backup import. A future backup change must update the shared payload and the
export/import repositories together; see [Data export and import](data-export.md).

## Source map

- `packages/shared/src/instructions.ts`: shared record and create-input contracts
- `src/features/instructions/contracts.ts`: input validation
- `src/features/instructions/repository.ts`: Markdown serialization and file access
- `src/features/instructions/routes.ts`: API routes
- `src/cli/commands/instructions.ts`: `foundry instructions new` and
  `foundry instructions list`
- `app/web/src/features/instructions/`: page, header action, dialog, and API adapter
- `app/web/src/lib/monaco.ts`: local Monaco bundle and worker setup

