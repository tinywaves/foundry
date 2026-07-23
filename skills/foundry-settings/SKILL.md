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

Use only the values listed above when changing a setting. Do not invent keys
or values.

## Commands

Always use `--json` so command output remains machine-readable.

```text
foundry settings list --json
foundry settings get <key> --json
foundry settings set <key> <value> --json
foundry settings reset <key> --json
```

- Use `list` to inspect every available setting.
- Use `get` to inspect one known key.
- Use `set` only when the user requested a specific allowed value.
- Use `reset` to restore the key's default value.

Examples:

```text
foundry settings get ui.theme --json
foundry settings set ui.theme dark --json
foundry settings reset ui.theme --json
```

`list` returns a JSON array. `get`, `set`, and `reset` return one JSON object
with this shape:

```json
{
  "key": "ui.theme",
  "group": "ui",
  "value": "dark",
  "valid": true,
  "secret": false,
  "options": ["system", "light", "dark"],
  "created_at": 0,
  "updated_at": 0
}
```

The timestamps are UTC Unix epoch milliseconds. Their example value above is
illustrative.

A successful response with `"valid": false` is readable stored data whose
business value is invalid, not a command failure. Report that state without
silently resetting it. An unsupported key, an unsupported value, or a command
execution failure is an actual failure and should be surfaced to the user.
