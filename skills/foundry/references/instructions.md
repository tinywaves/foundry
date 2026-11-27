# Instructions

Create an instruction with a name and Markdown content:

```bash
foundry instructions new \
  --name "Release checklist" \
  --content "# Release

- Run tests"
```

Both arguments are required. Quote values containing spaces or newlines. The
name is trimmed and limited to 200 characters. Content must contain a
non-whitespace character and is limited to 1,000,000 characters. The stored
Markdown body is preserved as supplied.

The command prints the created record as JSON:

```json
{
  "id": "0a5fab1b-df3c-4721-8b0c-63ee87856292",
  "name": "Release checklist",
  "content": "# Release\n\n- Run tests",
  "createdAt": "2026-11-27T17:50:02.798Z",
  "updatedAt": "2026-11-27T17:50:02.798Z"
}
```

Each instruction is stored at
`<home>/.foundry/instructions/<id>.md`. Use the CLI for writes instead of
editing runtime files directly. The current CLI has no list, update, or delete
command. The Web page at `#/library/instructions` exposes the same creation flow.

Encrypted backups currently include settings only. Instructions are not included
in `.foundry-backup` archives and are not replaced by backup import.

