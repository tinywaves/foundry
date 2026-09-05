# Restoring Official Runtime Configuration

Checked against first-party OpenAI Codex and Anthropic Claude Code documentation/source on **2026-09-05**. Scope is limited to user-level configuration for Codex and Claude Code.

## Decision

Foundry's **Restore Official Configuration** action should:

1. Edit only the runtime's user-level settings file.
2. Remove only fields that Foundry took ownership of when applying a Provider.
3. Preserve the settings file and every unrelated setting.
4. Never log the user out, delete credentials, or edit shell/cloud credential state.
5. Let the runtime's built-in provider, model selection, and authentication flow take over on the next launch.

Foundry deliberately retains Codex Provider tables after reset so it does not remove keys used by existing Codex sessions. The retained tables are inactive because reset removes the top-level `model_provider` selection. When applying a saved Provider, Foundry uses `foundry` if no custom Provider table exists, reuses the sole existing table, or asks the user to choose when multiple tables exist.

This is a user-level reset, not a promise that no higher-priority command-line, project, managed, or process-environment override exists.

## Codex

### Target file

Edit `$CODEX_HOME/config.toml`; `CODEX_HOME` defaults to `~/.codex`, so the normal path is `~/.codex/config.toml`. Provider and authentication configuration is machine-local and belongs at user scope. [OpenAI configuration basics](https://developers.openai.com/codex/config-basic/#codex-configuration-file) [OpenAI configuration precedence](https://developers.openai.com/codex/config-basic/#configuration-precedence)

### Fields to remove or restore

Remove these top-level fields when Foundry took ownership of them:

- `model_provider` when Foundry set it. With the key absent, Codex uses its built-in `openai` provider by default.
- `model` when Foundry set it. Do not replace it with a hard-coded OpenAI model; absence lets the installed Codex version choose its current built-in default.
- `review_model` when Foundry set it. With the key absent, `/review` uses the current session model.
- `openai_base_url` only if Foundry explicitly wrote that override instead of using a generated provider table. Normally Foundry should not use this mechanism for a custom Provider.

Retain the Foundry-managed `[model_providers.<key>]` table and its fields. Foundry does not take ownership of `forced_login_method`: it should neither set nor remove this field because it restricts official OpenAI authentication to `chatgpt` or `api` rather than selecting a custom model Provider.

Do not remove another tool's Provider table or a user-authored field merely because it has a similar value. Foundry changes only its declared managed fields under the user-selected table and preserves every other field and table. [OpenAI configuration reference](https://developers.openai.com/codex/config-reference/#configtoml) [OpenAI custom provider authentication](https://developers.openai.com/codex/auth/#alternative-model-providers) [OpenAI source: provider configuration fields](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L101-L151)

### Credential state Foundry must not touch

- `$CODEX_HOME/auth.json` / `~/.codex/auth.json`.
- The operating-system credential store used by `cli_auth_credentials_store`.
- `cli_auth_credentials_store` itself, unless Foundry had independently and explicitly taken ownership of that setting.
- Shell or process credentials such as `OPENAI_API_KEY` and `CODEX_ACCESS_TOKEN`.
- Workload-identity configuration, organization policy, or `forced_chatgpt_workspace_id`.

Codex intentionally caches login details in `auth.json` or the OS credential store and reuses them across launches. [OpenAI login caching and credential storage](https://developers.openai.com/codex/auth/#login-caching)

### Next-launch behavior

- If a valid ChatGPT or OpenAI API-key login is already cached, Codex reuses it with the built-in `openai` provider.
- If no valid login exists, the official Codex CLI authentication path is `codex login`, which opens the browser flow; OpenAI documents this as the default path when no valid session is available.
- Foundry should not invoke `codex logout` during reset. Resetting provider configuration and clearing official credentials are separate operations.

[OpenAI authentication methods](https://developers.openai.com/codex/auth/#openai-authentication) [OpenAI Codex CLI login behavior](https://developers.openai.com/codex/auth/#codex-cli)

## Claude Code

### Target file

Edit `$CLAUDE_CONFIG_DIR/settings.json` when `CLAUDE_CONFIG_DIR` is set; otherwise edit `~/.claude/settings.json`. Do not edit project `.claude/settings.json`, project-local `.claude/settings.local.json`, managed settings, or `~/.claude.json`. [Anthropic settings locations](https://code.claude.com/docs/en/settings#settings-files-and-who-they-affect) [Anthropic user and internal state files](https://code.claude.com/docs/en/settings#find-or-create-your-settings-files)

### Fields to remove or restore

Remove the following only when Foundry wrote them for the applied Provider:

**Top-level settings**

- `model`
- `modelOverrides`
- `apiKeyHelper`

**Keys inside `env` for a generic Anthropic-compatible gateway**

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_API_KEY`
- `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`
- `ANTHROPIC_CUSTOM_HEADERS`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_DEFAULT_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_FABLE_MODEL`
- Any Foundry-written companion `*_NAME`, `*_DESCRIPTION`, or `*_SUPPORTED_CAPABILITIES` variables for those pinned models
- `CLAUDE_CODE_SUBAGENT_MODEL`

Removing both the endpoint override and higher-precedence custom credential sources is essential: `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, and `apiKeyHelper` all outrank the normal `/login` subscription credential. Removing model overrides lets Claude Code resolve its official account/organization default rather than retaining a gateway-specific deployment name. [Anthropic gateway configuration](https://code.claude.com/docs/en/llm-gateway-connect#set-the-base-url-and-credential) [Anthropic authentication precedence](https://code.claude.com/docs/en/authentication#authentication-precedence) [Anthropic model selection](https://code.claude.com/docs/en/model-config#how-model-selection-works) [Anthropic pinned model configuration](https://code.claude.com/docs/en/model-config#pin-models-for-third-party-deployments)

If Foundry supports native cloud-provider Providers, it must also remove every Foundry-written routing flag and associated endpoint/auth field for that target, especially:

- Bedrock: `CLAUDE_CODE_USE_BEDROCK`, `ANTHROPIC_BEDROCK_BASE_URL`, `AWS_REGION`, `AWS_PROFILE`, `AWS_BEARER_TOKEN_BEDROCK`, and `CLAUDE_CODE_SKIP_BEDROCK_AUTH`.
- Google Cloud's Agent Platform: `CLAUDE_CODE_USE_VERTEX`, `ANTHROPIC_VERTEX_BASE_URL`, `ANTHROPIC_VERTEX_PROJECT_ID`, `CLOUD_ML_REGION`, and `CLAUDE_CODE_SKIP_VERTEX_AUTH`.
- Microsoft Foundry: `CLAUDE_CODE_USE_FOUNDRY`, `ANTHROPIC_FOUNDRY_RESOURCE`, `ANTHROPIC_FOUNDRY_BASE_URL`, `ANTHROPIC_FOUNDRY_API_KEY`, `ANTHROPIC_FOUNDRY_AUTH_TOKEN`, and `CLAUDE_CODE_SKIP_FOUNDRY_AUTH`.

Foundry should not set or remove `forceLoginMethod` or `forceLoginOrgUUID` as part of Provider application/reset; those are account or organization login policy, not Provider connection fields. [Anthropic Bedrock setup](https://code.claude.com/docs/en/amazon-bedrock#set-up-manually) [Anthropic Vertex setup](https://code.claude.com/docs/en/google-vertex-ai#configure-claude-code) [Anthropic Microsoft Foundry setup](https://code.claude.com/docs/en/microsoft-foundry#configure-claude-code) [Anthropic login policy settings](https://code.claude.com/docs/en/settings-reference#forceloginmethod)

After deleting Foundry-owned entries, preserve every remaining `env` key. Remove the `env` object only when Foundry created it and it is now empty; never replace the entire object.

### Credential and state Foundry must not touch

- The macOS Keychain entry used by Claude Code.
- `$CLAUDE_CONFIG_DIR/.credentials.json` or `~/.claude/.credentials.json` on Linux/Windows and as the macOS fallback.
- `~/.claude.json`, which Claude Code owns and uses for the sign-in session, MCP configuration, trust decisions, and global state.
- `CLAUDE_CODE_OAUTH_TOKEN`, Anthropic profiles/federation configuration, and the default `~/.config/anthropic` profile directory.
- AWS, Google Cloud, or Azure CLI/SDK credential caches and shell profiles.

Claude Code explicitly manages `.credentials.json` through `/login` and `/logout`; custom endpoints are configured separately through settings/environment variables. [Anthropic credential management](https://code.claude.com/docs/en/authentication#credential-management) [Anthropic internal state file](https://code.claude.com/docs/en/settings#find-or-create-your-settings-files)

### Next-launch behavior

- If a valid Claude.ai or Claude Console `/login` credential exists, it becomes eligible again after higher-precedence Foundry gateway/cloud credentials are removed and Claude Code reuses it.
- If no stored login exists, starting `claude` presents the official browser login flow.
- If the stored login is expired and cannot refresh, Claude Code asks the user to run `/login`; Foundry should not delete or replace the credential.

[Anthropic quickstart login behavior](https://code.claude.com/docs/en/quickstart#step-2-log-in-to-your-account) [Anthropic authentication and renewal](https://code.claude.com/docs/en/authentication#renew-an-expiring-login)

## Implementation Boundary

The reset preview should enumerate only the Foundry-owned fields that will be removed, mask secrets, preserve all unrelated content, and create the agreed secure backup before writing. If a shell variable, command-line flag, project setting, managed setting, or organization policy still selects a custom provider/model after reset, report that as an external override rather than editing it.
