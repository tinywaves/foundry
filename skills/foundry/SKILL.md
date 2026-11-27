---
name: foundry
description: Operate the local Foundry workbench through its installed CLI. Use when a task asks to create Foundry instructions, read or change Foundry settings, open its configuration folder, export or import Foundry data, install the Foundry Skill, or start its Web UI.
---

# Foundry

Use the installed `foundry` CLI to operate the local workbench. If the command is
unavailable, report the missing prerequisite. This Skill documents product usage;
repository development guidance belongs to the project's own documentation.

## Choose a feature

Read the reference for the requested feature before operating it. The table
lists features supported by the current CLI. Use installed command help to check
availability when versions differ.

| Task | Reference |
| --- | --- |
| Instructions: create a named Markdown instruction | [references/instructions.md](references/instructions.md) |
| Settings: appearance, language and region, configuration folder, encrypted export/import, or Skill installation | [references/settings.md](references/settings.md) |

## CLI conventions

- Use `foundry --help` and `foundry <feature> --help` to check installed commands.
  Bare `foundry` prints help without initializing storage.
- Successful business operations print JSON. Operation errors print
  `{"error":{"code":"...","message":"..."}}` to stderr and exit nonzero.
  Argument-parsing errors use the CLI's diagnostic output.
- Help, version, and Web startup output are human-readable.
- Read relevant current state before a change and verify the result afterward.
  Use feature commands for writes rather than editing runtime files directly.
- Keep credentials and backup passphrases out of logs and responses.

## Web UI

Start the Web UI when requested with `foundry web`. Use `foundry web --no-open`
to start the same local server without opening a browser. It prints the URL and
serves the UI on port 11111. Instructions is at
`#/library/instructions`; Settings uses the Settings routes documented in its
reference. Feature-specific behavior belongs in those references.
