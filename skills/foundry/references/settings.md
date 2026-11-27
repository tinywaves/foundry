# Settings

## Overview

Foundry settings control the appearance and regional behavior of the Web UI,
and expose the location of Foundry's runtime data. The CLI exposes four
editable preference keys plus a read-only configuration-folder key:

| Key | Meaning |
| --- | --- |
| `color-theme` | Web UI color theme |
| `language` | Web UI language |
| `time-zone` | Time zone used by the Web UI |
| `time-format` | Date/time display pattern |
| `config-folder` | Read-only absolute path to Foundry's data folder |

The CLI view is not a raw dump of `settings.json`. The file also contains
normalized backend feature settings that the four-key CLI interface does not
expose.

Use this reference for preference changes, opening the data folder, and
installing the Foundry Skill. Use [Encrypted backups](backups.md) for export and
import.

## When to use

Use `foundry settings` when the user asks to:

- Read the current theme, language, time zone, or time format.
- Change one of those preferences.
- Find or open Foundry's configuration/data folder.
- Install or refresh this Skill for other agents.

Do not edit `settings.json` directly. Unknown or partial objects are normalized
to defaults, and direct writes bypass the CLI's validation and Web UI
notification path.

## Read settings

Read all exposed settings:

```bash
foundry settings get
```

The result is a flat JSON object:

```json
{
  "color-theme": "system",
  "language": "system",
  "time-zone": "America/Los_Angeles",
  "time-format": "YYYY-MM-DD HH:mm:ss",
  "config-folder": "/home/alice/.foundry"
}
```

Read one value:

```bash
foundry settings get color-theme
foundry settings get config-folder
```

A single key returns a JSON string, for example `"system"` or
`"/home/alice/.foundry"`.

## Change settings

Apply exactly one change at a time:

```bash
foundry settings set <key> <value>
```

```bash
foundry settings set color-theme dark
foundry settings set language zh-CN
foundry settings set time-zone Asia/Shanghai
foundry settings set time-format "YYYY-MM-DD HH:mm:ss"
```

Quote values containing spaces. The response is:

```json
{ "key": "color-theme", "value": "dark" }
```

### Allowed values

| Key | Allowed values |
| --- | --- |
| `color-theme` | `system`, `light`, `dark` |
| `language` | `system`, `en-US`, `zh-CN`, `zh-TW`, `ja-JP` |
| `time-zone` | `America/Los_Angeles`, `America/New_York`, `Asia/Shanghai`, `Asia/Taipei`, `Asia/Tokyo`, `UTC` |
| `time-format` | `YYYY-MM-DD HH:mm:ss`, `YYYY-MM-DD`, `YYYY/MM/DD HH:mm:ss`, `DD/MM/YYYY HH:mm:ss`, `MM/DD/YYYY hh:mm:ss A`, `HH:mm:ss` |

`system` language uses the operating system locale with an `en-US` fallback.
`system` theme follows the operating system appearance. Run
`foundry settings set --help` to confirm the installed version's values.

### Validation and errors

| Symptom | Code | Cause |
| --- | --- | --- |
| Unknown key on read | `UNKNOWN_SETTING` | Key is not one of the exposed keys |
| Unknown or non-editable key on write | `UNKNOWN_SETTING` / `READ_ONLY_SETTING` | Key is unknown or is `config-folder` |
| Invalid value | `INVALID_SETTINGS_INPUT` | Value is outside the allowed table |

Invalid writes do not change stored settings. The error message lists the
allowed values.

## Configuration folder

Read the path:

```bash
foundry settings get config-folder
```

Open it with the operating system:

```bash
foundry settings config-folder open
```

The command prints `{ "configFolder": "<absolute path>" }`. The folder is
`<home>/.foundry`; it contains settings, instructions, agent profiles, and
retained backend collections. `config-folder` is read-only and cannot be set.

## Web UI synchronization

Running Web clients receive settings changes automatically, including changes
made by another CLI process. There is no Save button or manual refresh step.
After `foundry settings set`, the open Web UI updates through its settings
subscription.

Settings deep links:

| Panel | URL |
| --- | --- |
| Appearance | `#/settings?panel=appearance` |
| Language and region | `#/settings?panel=language-region` |
| Advanced | `#/settings?panel=advanced` |

Omitted or invalid panels show Appearance. The application root opens
Dashboard. Settings and [Instructions](instructions.md) are the implemented Web
features; other main navigation pages remain placeholders. The Settings
full-screen back button returns one browser history entry.

## Install this Skill

```bash
foundry settings download-skill --target .agents,.claude
```

Select `.agents`, `.claude`, or both as a comma-separated list. Paths are fixed
user-level targets:

| Target | Destination |
| --- | --- |
| `.agents` | `<home>/.agents/skills/foundry` |
| `.claude` | `<home>/.claude/skills/foundry` |

Existing copies at selected targets are replaced. Unselected targets are left
alone. The result lists each selected target and its absolute destination:

```json
{
  "installed": [
    {
      "target": "agents",
      "destination": "/home/alice/.agents/skills/foundry"
    }
  ]
}
```

Invalid targets fail with `INVALID_SKILL_INPUT`. A missing bundled Skill fails
with `SKILL_NOT_FOUND`; filesystem failures use `SKILL_COPY_FAILED`.

## Export and import

Encrypted backups and destructive replacement import use the same settings
pipeline but have separate safety rules. Read
[Encrypted backups](backups.md) before running `foundry settings export` or
`foundry settings import`.

## Related

- [Instructions](instructions.md): create and list instruction records.
- [Agents](agents.md): assign and apply instructions.
- [Encrypted backups](backups.md): export/import scope and safety.
