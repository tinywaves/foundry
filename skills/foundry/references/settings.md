# Settings

Read the settings exposed by the CLI with `foundry settings get`, or read one
value with `foundry settings get <key>`. The full CLI result is a flat JSON object
with the four editable keys below and read-only `config-folder`; it is not a raw
dump of `settings.json`. A single key returns a JSON string.

| Key | Allowed values |
| --- | --- |
| `color-theme` | `system`, `light`, `dark` |
| `language` | `system`, `en-US`, `zh-CN`, `zh-TW`, `ja-JP` |
| `time-zone` | `America/Los_Angeles`, `America/New_York`, `Asia/Shanghai`, `Asia/Taipei`, `Asia/Tokyo`, `UTC` |
| `time-format` | `YYYY-MM-DD HH:mm:ss`, `YYYY-MM-DD`, `YYYY/MM/DD HH:mm:ss`, `DD/MM/YYYY HH:mm:ss`, `MM/DD/YYYY hh:mm:ss A`, `HH:mm:ss` |
| `config-folder` | Read-only absolute path to `<home>/.foundry` |

Apply one change with `foundry settings set <key> <value>`. Quote values
containing spaces. The response is `{"key":"...","value":"..."}`. Invalid
values are rejected with the allowed values in the error message.
`config-folder` cannot be set. Run `foundry settings set --help` to check the
installed version's supported keys and values.

```bash
foundry settings get
foundry settings get color-theme
foundry settings set color-theme dark
foundry settings set language zh-CN
foundry settings set time-zone Asia/Shanghai
foundry settings set time-format "YYYY-MM-DD HH:mm:ss"
foundry settings get config-folder
foundry settings config-folder open
```

Running Web clients receive settings changes automatically, including changes
from another CLI process.

## Export and import

For encrypted backups and complete replacement import, read
[backups.md](backups.md) before running `foundry settings export` or
`foundry settings import`. These commands use the application data pipeline;
the current dataset contains normalized settings, including backend feature
settings, and is not limited to the four get/set fields.

## Install this skill

```bash
foundry settings download-skill --target .agents,.claude
```

Select `.agents`, `.claude`, or both as a comma-separated list. Copies go to
`<home>/.agents/skills/foundry` and `<home>/.claude/skills/foundry` respectively.
Existing copies at selected targets are replaced. Output lists the installed
absolute destinations. Paths are fixed user-level targets on every platform.

## Settings in the Web UI

Settings deep links use `#/settings?panel=appearance`,
`#/settings?panel=language-region`, or `#/settings?panel=advanced`.
Omitted or invalid panels show Appearance. This is the Settings category default;
the application root opens Dashboard. Settings and
[Instructions](instructions.md) are the implemented Web features; other main
navigation pages remain placeholders. The Settings full-screen back button
returns one browser history entry.
