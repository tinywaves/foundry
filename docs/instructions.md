# Instructions implementation

## Scope and routes

Instructions is an implemented feature with a Web page and CLI command. The Web
page is `#/library/instructions`. It renders the stored instructions newest
first and exposes creation through a page-header action. The list has loading,
empty, and error states. Selecting a row opens the edit dialog directly.
Right-clicking a row opens Edit and Delete actions. Delete is disabled while any
agent assignment references the instruction.

A shared editor dialog handles both creation and editing. It requires a name
and Markdown content and uses one fixed-height Monaco source area, so switching
between create and edit does not change the form height. The editor follows the
application light/dark theme, preserves Markdown source, and displays the
Markdown save behavior in its placeholder. Monaco is loaded lazily behind the
editor area; dialog controls render immediately.

Creation starts with empty fields. Selecting a row opens the same dialog with
the stored name and Markdown source prefilled. The Web UI edits source and does
not render Markdown. Saving replaces both name and content, keeps the
instruction ID and `createdAt`, advances `updatedAt`, updates the cached list,
and closes the dialog.

The list is owned by React Query under the `instructions` query key. Each row
shows the instruction name and opens the edit dialog. Successful creation and
update update the cached list immediately and invalidate the query so the API
remains authoritative. Updated records move to the top because the list is
ordered by `updatedAt`. List failures show an inline retry action rather than
replacing the page.

The instruction list is also the drag source for agent orchestration. Dragging
does not edit the instruction file. Assignments, managed external files, and the
agent API are covered in [Agent orchestration](agents.md). Ordered agent
assignment state lives in the agent profile under
`<home>/.foundry/agents/<sha256(agent-id)>.json`, inside its `instructions`
namespace rather than in instruction Markdown frontmatter.

## Contracts and API

`packages/shared/src/instructions.ts` defines the shared `Instruction` and
`CreateInstructionInput` contracts. `InstructionsService` owns application
rules, and the repository owns Markdown file access. `createdAt` and `updatedAt`
are Unix epoch milliseconds (`number`); they are not ISO date strings.

| Method and path | Result |
| --- | --- |
| `GET /api/instructions` | Array of instructions ordered by `updatedAt`, newest first |
| `GET /api/instructions/:id` | One instruction, or `404 INSTRUCTION_NOT_FOUND` |
| `POST /api/instructions` | Created instruction with status `201` |
| `PUT /api/instructions/:id` | Updated instruction, or `404 INSTRUCTION_NOT_FOUND` |
| `DELETE /api/instructions/:id` | `204` after removing an unused instruction |

`POST` and `PUT` accept `{ "name": string, "content": string }`. Validation
errors return status `400` with Foundry's standard JSON error envelope and code
`INVALID_INSTRUCTION_INPUT`. Names are trimmed, must be non-empty, and are
limited to 200 characters. Content must contain a non-whitespace character and
is limited to 1,000,000 characters. Missing IDs, including malformed IDs, return
`404 INSTRUCTION_NOT_FOUND`.

Updating writes the instruction Markdown file atomically. It does not rewrite
enabled agent instruction files; those files keep the previous composed block
until the affected agent is reapplied or re-enabled.

Deleting removes the instruction Markdown file. It returns
`409 INSTRUCTION_IN_USE` while any agent assignment contains the instruction.
The usage check and file removal run in one storage transaction, so an
assignment cannot race a deletion. Missing IDs return
`404 INSTRUCTION_NOT_FOUND`.

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
createdAt: 1795801802798
updatedAt: 1795801802798
---

# Release

- Run tests
```

The YAML parser reads only the leading frontmatter block. The remaining Markdown
is returned unchanged, so later `---` blocks are valid instruction content.
Malformed frontmatter, an invalid ID, non-millisecond timestamps, an overlong name,
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

The command prints the same ordered JSON array as `GET /api/instructions`.

Read one instruction:

```bash
foundry instructions get <id>
```

Replace its name and Markdown content:

```bash
foundry instructions edit <id> \
  --name "Release checklist" \
  --content "# Release

- Run tests"
```

Both edit arguments are required. Edit uses the same name and content validation
as creation and prints the updated record.

Delete an unused instruction:

```bash
foundry instructions delete <id>
```

The command prints the deleted record. It fails with `INSTRUCTION_IN_USE` while
any agent assignment references the ID; clear those assignments first with
`foundry agents instructions assign <agent> --instructions ""` or by assigning
the remaining IDs.

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
- `src/cli/commands/instructions.ts`: `foundry instructions new/list/get/edit/delete`
- `app/web/src/features/instructions/`: page, header action, shared editor
  dialog, and API adapter
- `app/web/src/features/instructions/components/markdown-editor.tsx`: shared
  Monaco editor for create and edit
- `app/web/src/lib/monaco.ts`: local Monaco bundle and worker setup

