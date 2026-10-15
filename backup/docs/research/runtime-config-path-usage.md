# Runtime Configuration Path Usage

Checked against first-party OpenAI and Anthropic documentation and public GitHub source on **2026-09-09**.

## Conclusion

It is reasonable to expect the default directories to cover most installations, because both runtimes use them without any setup and require an explicit environment variable to move the user configuration. However, there is **no public telemetry, survey, or other representative dataset** from OpenAI or Anthropic that establishes what percentage of users keep the defaults. Public GitHub examples are qualitative implementation evidence, not a user-count sample.

For Foundry, keep the official default as the primary path, but resolve the runtime's official environment-variable override before falling back:

- Codex: `$CODEX_HOME/config.toml`, with `CODEX_HOME` defaulting to `~/.codex`.
- Claude Code: `$CLAUDE_CONFIG_DIR/settings.json` when set; otherwise `~/.claude/settings.json`.

If Foundry adds a manual path setting, present it as an advanced override of this automatic resolution rather than implying that users normally need to configure a path.

## Official Behavior

### Codex

OpenAI documents `~/.codex/config.toml` as the user-level configuration file. It separately documents `CODEX_HOME` as the root for config, auth, logs, sessions, and other state, with `~/.codex` as its default. Thus, the default path is the zero-configuration path, while a non-default path is an explicit opt-in.

Sources: [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml), [OpenAI environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables#core-locations)

### Claude Code

Anthropic documents `~/.claude/settings.json` as the user settings file. It also states that installation does not create a settings file; Claude Code creates this default-path file after the user changes a user-scoped option. `CLAUDE_CONFIG_DIR` explicitly relocates the home-directory files, including settings, session history, and plugins.

Sources: [Anthropic settings scopes](https://code.claude.com/docs/en/settings#settings-files-and-who-they-affect), [Anthropic settings-file creation and `CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/settings#find-or-create-your-settings-files)

## Public Project Evidence

These examples show how real tools account for the paths, but cannot prove population share:

- Orca mirrors Codex's resolution order in executable code: an explicit managed-account home, then `CODEX_HOME`, then `~/.codex`. This is the same automatic-default-plus-override shape Foundry should use. [Orca source](https://github.com/stablyai/orca/blob/main/src/main/rate-limits/codex-auth-presence.ts#L61-L64)
- Trail of Bits' Claude Code configuration tells users to install `settings.json` at `~/.claude/settings.json`, while its installer uses `CLAUDE_CONFIG_DIR` when present and otherwise falls back to `~/.claude`. That treats the default as the normal onboarding path without ignoring supported custom directories. [Project README](https://github.com/trailofbits/claude-code-config#settings), [installer command](https://github.com/trailofbits/claude-code-config/blob/main/.claude/commands/trailofbits/config.md#L20-L24)
- OpenClaw deliberately assigns a separate `CODEX_HOME` to Codex workers to isolate authentication from the user's ambient/default Codex home. This is a concrete reason custom homes exist, but it is a specialized integration and isolation case rather than evidence that ordinary users prefer non-default paths. [OpenClaw coding-agent configuration](https://github.com/openclaw/openclaw/blob/main/skills/coding-agent/SKILL.md#L43-L44), [worker-home setup](https://github.com/openclaw/openclaw/blob/main/skills/coding-agent/SKILL.md#L125-L150)

## Evidence Limitations

GitHub code search overrepresents developers who publish configuration managers, dotfiles, CI setups, multiple-profile tools, and integrations. It does not observe private repositories, local shell configuration, or users who never publish configuration. Counting path strings in repositories would therefore measure published code conventions, not the share of Codex or Claude Code users on default paths.

The defensible product assumption is: **defaults are likely dominant, but custom paths are a real compatibility requirement whose prevalence is unknown**.
