---
name: foundry-settings
description: Read, change, list, or reset Foundry settings through the installed `foundry settings` CLI command. Use when a user asks to inspect or modify Foundry configuration, including the Web UI theme.
---

# Foundry Settings

Use the installed `foundry settings` command as the only interface for this
capability. Do not access the database or implement settings logic directly.

## Available Settings

| Key | Purpose | Allowed values | Default |
| --- | --- | --- | --- |
| `ui.theme` | Web UI color theme | `system`, `light`, `dark` | `system` |
| `ui.pointer` | Pointer preference | `true`, `false` | `true` |

Use only the values listed above when changing a setting. Do not invent keys
or values.

## Commands

Use `--raw` when the task only needs values or boolean mutation results.

```text
foundry settings list [--raw]
foundry settings get <key> [--raw]
foundry settings set <key> <value> [--raw]
foundry settings reset <key> [--raw]
```

- Use `list` to inspect every available setting.
- Use `get` to inspect one known key.
- Use `set` only when the user requested a specific allowed value.
- Use `reset` to restore the key's default value.

Examples:

```text
foundry settings get ui.theme --raw
foundry settings set ui.theme dark --raw
foundry settings reset ui.theme --raw
```

Without `--raw`, `get` and `list` render `Key` and `Value` columns. With
`--raw`, `get` prints only the value and `list` prints each setting value.
`set` and `reset` print `true` or `false` to indicate the mutation result.
