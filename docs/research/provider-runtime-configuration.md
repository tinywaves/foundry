# Provider Runtime Configuration

Date: 2026-09-04

## Scope

This note covers only fields needed by the Foundry **Add Provider** flow for custom model endpoints used by Codex and Claude Code. It excludes unrelated runtime settings such as sandboxing, permissions, history, MCP, notifications, and UI preferences.

Sources are restricted to OpenAI and Anthropic first-party documentation and repositories. The Codex repository findings are pinned to OpenAI's latest commit available on 2026-09-04, [`47b0f7d`](https://github.com/openai/codex/tree/47b0f7d540e9abf932e9b518ab306e389744998e). Claude Code documentation links are the official pages available on 2026-09-04; the latest public Claude Code repository commit available by the cutoff was [`b3f0e50`](https://github.com/anthropics/claude-code/tree/b3f0e501b79fe5cfc8c10d18cf3b0b6715c5c2fb).

## Recommendation

Model a Provider as a user-named, runtime-specific connection configuration with a generated immutable ID. Names may repeat and must never be used as configuration keys or database identity.

- A Provider belongs to exactly one agent runtime: `codex` or `claude-code`.
- Keep shared presentation metadata on every Provider: name, website, notes, and avatar.
- Store the endpoint, authentication method, request customization, and model mappings required to make that runtime usable.
- Do not model a vendor catalog. Claude Code's backend discriminator is a protocol/SDK routing requirement imposed by Claude Code, not a predefined list of commercial Provider records.
- Treat every key, bearer token, command argument, static authorization header, and potentially secret query parameter as sensitive.

## Shared Add Form Fields

| Field | Requirement | Notes |
| --- | --- | --- |
| `name` | Required | User-facing name; duplicates allowed. |
| `runtime` | Required | Exactly `codex` or `claude-code`; immutable after creation is preferable. |
| `websiteUrl` | Optional | Presentation metadata only. |
| `notes` | Optional | Presentation metadata only. |
| `avatar` | Optional | Presentation metadata only; store a Foundry-owned avatar reference or uploaded asset reference. |
| `id` | Generated | UUID or another opaque generated identifier; never derive it from `name`. |

## Codex

### Where Codex Reads Provider Configuration

Codex reads `model`, `review_model`, `model_provider`, and `[model_providers.<id>]` from TOML configuration. Its configuration stack includes user `config.toml`, project `.codex/config.toml`, optional profile configuration, system configuration, and managed configuration; project configuration overrides user configuration. For a normal Foundry user-level application, the primary target is `$CODEX_HOME/config.toml`, where `CODEX_HOME` defaults to `~/.codex`. [OpenAI config basics](https://developers.openai.com/codex/config-basic/#codex-user-settings) [OpenAI configuration loader](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/config/src/loader/README.md#L24-L46)

Provider authentication can read arbitrary environment variables named by `env_key` and `env_http_headers`. OpenAI API-key login also recognizes `OPENAI_API_KEY`, while OpenAI login credentials may be stored in `auth.json` or the OS credential store. Those OpenAI account credentials should remain Runtime/account state rather than Foundry Provider data. [OpenAI authentication](https://developers.openai.com/codex/auth/#sign-in-with-an-api-key) [Codex provider key resolution](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L337-L355)

### Codex Add Form Fields

The following requirements distinguish what Codex accepts from what Foundry should require for a reliably usable custom endpoint.

| Field | Foundry requirement | Runtime behavior and source |
| --- | --- | --- |
| `baseUrl` | Required | Codex technically defaults an omitted URL to an OpenAI endpoint. Foundry should require it for a custom Provider to prevent accidental traffic to OpenAI. The URL is the OpenAI-compatible API base, normally ending in `/v1`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L101-L104) [Default behavior](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L293-L311) |
| `primaryModel` | Required | Serialized as top-level `model`; model selection is separate from the provider table. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/config/src/config_toml.rs#L152-L162) |
| `reviewModel` | Optional | Serialized as top-level `review_model` for `/review`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/config/src/config_toml.rs#L156-L162) |
| `auth` | Required choice | Require the user to choose `none`, environment-backed bearer token, command-backed bearer token, OpenAI account auth, or AWS SigV4. The last two are conditional specialist modes. Codex rejects conflicting auth mechanisms. [Fields](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L103-L116) [Conflicts](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L193-L261) |
| `headers` | Optional | Static request headers. Header values may contain credentials and must be treated as sensitive. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L120-L129) |
| `environmentHeaders` | Optional | Maps each header name to an environment-variable name; missing or empty variables omit the header. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L125-L129) [Resolution](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L264-L290) |
| `queryParams` | Optional | Appended to the base URL. Values are redacted by Codex and may be sensitive. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L117-L124) |
| `requestMaxRetries` | Optional advanced | Default `4`; capped at `100`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L27-L35) [Resolution](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L358-L369) |
| `streamMaxRetries` | Optional advanced | Default `5`; capped at `100`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L27-L35) [Resolution](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L365-L369) |
| `streamIdleTimeoutMs` | Optional advanced | Default `300000`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L27-L31) [Resolution](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L372-L377) |
| `supportsWebSockets` | Optional advanced | Default `false`. Do not allow it with AWS SigV4 because Codex rejects that combination. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L137-L151) [Constraint](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L193-L201) |
| `supportsStandaloneWebSearch` | Optional advanced | Capability flag; default `false`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L146-L151) |

Do not present `wireApi` as an editable field. As of the cutoff, Codex supports only `responses`; `chat` is explicitly rejected. Foundry may persist the literal for schema clarity or omit it and serialize the default. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L58-L90)

### Codex Authentication Variants

| Variant | Fields | Conditions and sensitivity |
| --- | --- | --- |
| `none` | None | For an endpoint that does not require authentication. |
| `env-bearer` | `environmentVariable`, `secret` | Codex stores only the variable name in `env_key` and sends its value as bearer authentication. The secret is sensitive. Foundry must have a separate mechanism to expose the stored value to the Codex process; writing only `config.toml` is insufficient. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L103-L112) [Resolution](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L337-L355) |
| `command-bearer` | `command`, `args?`, `timeoutMs?`, `refreshIntervalMs?`, `cwd?` | Command output supplies the token. Default timeout is `5000 ms`, refresh interval `300000 ms`, and `0` refresh interval means refresh only after the 401 retry path. Arguments may be sensitive. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/protocol/src/config_types.rs#L563-L589) |
| `openai-account` | None | Sets `requires_openai_auth`; credentials live in Codex account storage, not the Provider record. This is relevant only when intentionally using OpenAI's login/API-key flow. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L140-L145) |
| `aws-sigv4` | `profile?`, `region?`, `authRefresh?` | Uses the AWS default credential chain when profile is absent. It cannot be combined with the other auth variants or WebSockets. `authRefresh.command` must be `aws`. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L154-L177) [Constraints](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L193-L230) |

Do not use `experimental_bearer_token` for the normal form. OpenAI documents it as discouraged in favor of `env_key`; supporting it would duplicate a plaintext secret into Codex configuration. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/model-provider-info/src/lib.rs#L106-L114)

The key under `[model_providers.<id>]` must be generated independently from the display name. Codex reserves built-in IDs and rejects attempts to override them. [Source](https://github.com/openai/codex/blob/47b0f7d540e9abf932e9b518ab306e389744998e/codex-rs/config/src/config_toml.rs#L900-L920)

## Claude Code

### Where Claude Code Reads Provider Configuration

Claude Code reads settings from user `~/.claude/settings.json`, shared project `.claude/settings.json`, project-local `.claude/settings.local.json`, and managed settings. `CLAUDE_CONFIG_DIR` relocates the user configuration directory, but project/local settings cannot set that variable. Foundry should normally apply a Provider to the selected Runtime's user settings file, not a repository-owned project file. [Anthropic settings locations](https://code.claude.com/docs/en/settings#settings-files-and-who-they-affect) [Anthropic `CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars#variables)

Provider values are primarily written into the settings file's `env` object. Values there are plaintext, override the same shell variables, and are inherited by subprocesses. Anthropic recommends `apiKeyHelper` for rotating API credentials. [Anthropic `env` setting](https://code.claude.com/docs/en/settings-reference#env) [Anthropic `apiKeyHelper`](https://code.claude.com/docs/en/settings-reference#apikeyhelper)

### Generic Anthropic-Compatible Endpoint

Use this route for a custom service or gateway that implements the Anthropic Messages API.

| Field | Foundry requirement | Runtime behavior and source |
| --- | --- | --- |
| `baseUrl` | Required | Maps to `ANTHROPIC_BASE_URL`. The gateway must expose the Messages API below it, including `/v1/messages`. [Source](https://code.claude.com/docs/en/llm-gateway-connect#set-the-base-url-and-credential) [Verification request](https://code.claude.com/docs/en/llm-gateway-connect#verify-the-connection) |
| `auth` | Required choice | Choose bearer token, API key, or credential helper. Anthropic calls the base URL and credential the two required pieces of a gateway connection. [Source](https://code.claude.com/docs/en/llm-gateway-connect#set-the-credential-variable) |
| `primaryModel` | Required | Any string is accepted for a custom `ANTHROPIC_BASE_URL`; Claude Code passes provider-defined model names through. Serialize deterministically as the `model` setting or `ANTHROPIC_MODEL`, not both. [Source](https://code.claude.com/docs/en/model-config#how-model-selection-works) [Custom endpoint behavior](https://code.claude.com/docs/en/model-config#model-availability) |
| `customHeaders` | Optional | Maps to `ANTHROPIC_CUSTOM_HEADERS` using newline-separated `Name: Value` entries. Header values may be sensitive. Requires Claude Code `2.1.227+`. [Source](https://code.claude.com/docs/en/env-vars#variables) |
| `models` role mappings | Optional | Pin aliases and background roles when the gateway uses custom names; see the model mapping table below. [Source](https://code.claude.com/docs/en/model-config#pin-models-for-third-party-deployments) |
| `modelOverrides` | Optional advanced | Maps Anthropic model IDs to provider-specific IDs for multiple versions within the same family. [Source](https://code.claude.com/docs/en/settings-reference#modeloverrides) |

Claude Code does not expose a selectable API protocol field for this route. The protocol is the Anthropic Messages API. Do not add a generic `protocol: "openai" | "anthropic"` selector to a Claude Code Provider form. [Anthropic gateway protocol](https://code.claude.com/docs/en/llm-gateway-protocol)

### Claude Code Authentication Variants

| Variant | Fields | Conditions and sensitivity |
| --- | --- | --- |
| `bearer` | `token` | Writes `ANTHROPIC_AUTH_TOKEN`; Claude Code sends `Authorization: Bearer`. Sensitive. This takes precedence over `ANTHROPIC_API_KEY` and `apiKeyHelper`. [Source](https://code.claude.com/docs/en/authentication#authentication-precedence) |
| `api-key` | `apiKey` | Writes `ANTHROPIC_API_KEY`; Claude Code sends `X-Api-Key`. Sensitive. [Source](https://code.claude.com/docs/en/authentication#authentication-precedence) |
| `helper` | `command`, `ttlMs?` | Writes `apiKeyHelper`; output is sent in both `X-Api-Key` and `Authorization: Bearer`. Default cache lifetime is five minutes; `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` overrides it. The command may reveal or contain sensitive material. [Source](https://code.claude.com/docs/en/settings-reference#apikeyhelper) |

Do not allow more than one of these in the form. Claude Code's precedence would otherwise silently ignore lower-ranked credentials. [Source](https://code.claude.com/docs/en/authentication#authentication-precedence)

### Claude Code Native Backends

Claude Code also has explicit routing modes for Amazon Bedrock, Google Cloud's Agent Platform, and Microsoft Foundry. Supporting these does not require preset Provider names, but it does require a backend discriminator because each mode reads different variables and uses a different credential SDK.

| Backend | Required fields | Optional or conditional fields | Source |
| --- | --- | --- | --- |
| `bedrock` | `region` unless resolved by the AWS profile/environment; one usable AWS credential source | `baseUrl`, `profile`, `bedrockBearerToken`, `skipAuth`, `authRefresh`, `credentialExport`, model mappings | Set `CLAUDE_CODE_USE_BEDROCK=1`; region maps to `AWS_REGION`; override endpoint with `ANTHROPIC_BEDROCK_BASE_URL`. Claude Code otherwise uses the AWS default credential chain, `AWS_PROFILE`, or `AWS_BEARER_TOKEN_BEDROCK`. [Source](https://code.claude.com/docs/en/amazon-bedrock#set-up-manually) |
| `vertex` | Resolvable GCP project and region | `baseUrl`, `credentialsFile`, `skipAuth`, `authRefresh`, per-model region overrides, model mappings | Set `CLAUDE_CODE_USE_VERTEX=1`; use `CLOUD_ML_REGION` and `ANTHROPIC_VERTEX_PROJECT_ID`; `GOOGLE_APPLICATION_CREDENTIALS`, `GCLOUD_PROJECT`, or `GOOGLE_CLOUD_PROJECT` can take precedence for project/credentials. [Source](https://code.claude.com/docs/en/google-vertex-ai#configure-gcp-credentials) [Runtime variables](https://code.claude.com/docs/en/google-vertex-ai#configure-claude-code) |
| `foundry` | `resource` or `baseUrl`; one of API key, bearer token, or usable Azure default credential chain | Model mappings | Set `CLAUDE_CODE_USE_FOUNDRY=1`; `ANTHROPIC_FOUNDRY_AUTH_TOKEN` takes precedence over `ANTHROPIC_FOUNDRY_API_KEY`, which takes precedence over the Azure default credential chain. [Source](https://code.claude.com/docs/en/microsoft-foundry#configure-azure-credentials) [Runtime variables](https://code.claude.com/docs/en/microsoft-foundry#configure-claude-code) |

For Bedrock and Vertex gateways, `skipAuth` is only conditionally valid when the gateway performs the cloud-provider authentication. It maps to `CLAUDE_CODE_SKIP_BEDROCK_AUTH` or `CLAUDE_CODE_SKIP_VERTEX_AUTH`. [Source](https://code.claude.com/docs/en/llm-gateway-connect#route-to-a-cloud-provider-through-a-gateway)

Avoid making long-lived AWS access keys, AWS session tokens, GCP service-account JSON, or Azure identity tokens ordinary Provider fields when an ambient SDK credential chain can supply them. If Foundry does accept them, mark and handle them as sensitive secrets, never presentation metadata.

### Claude Code Model Mappings

| Field | Requirement | Maps to |
| --- | --- | --- |
| `primaryModel` | Required | Prefer settings key `model`; it is the deterministic model for new sessions and outranks `ANTHROPIC_DEFAULT_MODEL`. [Source](https://code.claude.com/docs/en/settings-reference#model) |
| `defaultModel` | Optional advanced | `ANTHROPIC_DEFAULT_MODEL`; used only when no higher-priority source selects a model. [Source](https://code.claude.com/docs/en/model-config#set-a-default-model-for-new-sessions) |
| `opusModel` | Optional | `ANTHROPIC_DEFAULT_OPUS_MODEL`. |
| `sonnetModel` | Optional | `ANTHROPIC_DEFAULT_SONNET_MODEL`. |
| `haikuModel` | Optional | `ANTHROPIC_DEFAULT_HAIKU_MODEL`; also controls the usual small/background model role. |
| `fableModel` | Optional | `ANTHROPIC_DEFAULT_FABLE_MODEL`. |
| `subagentModel` | Optional | `CLAUDE_CODE_SUBAGENT_MODEL`. |
| `modelOverrides` | Optional advanced | Settings key `modelOverrides`, mapping Anthropic model IDs to backend-native IDs or deployment names. |

The family mappings and backend-native IDs are especially important for third-party deployments because aliases may resolve to built-in defaults that are unavailable in the user's account. Anthropic recommends pinning model versions for Bedrock, Vertex, and Microsoft Foundry. [Source](https://code.claude.com/docs/en/model-config#pin-models-for-third-party-deployments)

Model display names, descriptions, and declared capability lists are available through companion variables such as `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME`, `_DESCRIPTION`, and `_SUPPORTED_CAPABILITIES`. They are optional advanced model metadata; they may be added later without changing the core Provider connection model. [Source](https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities)

Do not include `modelPicker`, `availableModels`, or organization model policy in the initial Provider record. They control picker presentation or administrative allowlists rather than whether the saved endpoint can make requests. `modelOverrides`, by contrast, belongs to the Provider because it translates canonical model IDs into endpoint-specific IDs. [Sources](https://code.claude.com/docs/en/settings-reference#modelpicker) [Source](https://code.claude.com/docs/en/settings-reference#availablemodels) [Source](https://code.claude.com/docs/en/settings-reference#modeloverrides)

## Key Runtime Differences

| Concern | Codex | Claude Code |
| --- | --- | --- |
| Configuration shape | TOML `[model_providers.<generated-id>]` plus top-level model selection | JSON settings, mainly an `env` map plus `model` and `modelOverrides` keys |
| Custom endpoint protocol | OpenAI Responses API only | Anthropic Messages API for generic gateways; native SDK protocols for Bedrock and Vertex |
| Base URL | Runtime-optional, but Foundry should require it for custom endpoints | Required for generic gateways; backend-specific alternatives exist for cloud routes |
| Static API key | Preferred runtime shape references an environment variable; direct bearer config is discouraged | Official settings can contain `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY` as plaintext `env` values |
| Dynamic credentials | Structured executable, args, cwd, timeout, and refresh interval | Shell command string through `apiKeyHelper`, with cache TTL |
| Additional headers | Static map or header-to-environment-variable map | One newline-separated `ANTHROPIC_CUSTOM_HEADERS` string |
| Query parameters | Supported directly | No equivalent generic Provider field documented |
| Model roles | Primary and review | Primary/default, Opus, Sonnet, Haiku/background, Fable, subagent, and per-version overrides |

## Recommended TypeScript Discriminated Union

This shape represents Foundry's stored Provider domain model. Serialization into `config.toml` or `settings.json` should be handled separately.

```ts
type SensitiveString = string

type ProviderBase = {
  id: string
  name: string
  websiteUrl?: string
  notes?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

type CodexAuth =
  | { type: 'none' }
  | {
      type: 'env-bearer'
      environmentVariable: string
      secret: SensitiveString
    }
  | {
      type: 'command-bearer'
      command: string
      args?: SensitiveString[]
      cwd?: string
      timeoutMs?: number
      refreshIntervalMs?: number
    }
  | { type: 'openai-account' }
  | {
      type: 'aws-sigv4'
      profile?: string
      region?: string
      authRefresh?: {
        args?: SensitiveString[]
        timeoutMs?: number
      }
    }

type CodexProvider = ProviderBase & {
  runtime: 'codex'
  baseUrl: string
  primaryModel: string
  reviewModel?: string
  auth: CodexAuth
  headers?: Record<string, SensitiveString>
  environmentHeaders?: Record<string, string>
  queryParams?: Record<string, SensitiveString>
  advanced?: {
    requestMaxRetries?: number
    streamMaxRetries?: number
    streamIdleTimeoutMs?: number
    supportsWebSockets?: boolean
    supportsStandaloneWebSearch?: boolean
  }
}

type ClaudeModelMappings = {
  defaultModel?: string
  opusModel?: string
  sonnetModel?: string
  haikuModel?: string
  fableModel?: string
  subagentModel?: string
  overrides?: Record<string, string>
}

type ClaudeGatewayAuth =
  | { type: 'bearer'; token: SensitiveString }
  | { type: 'api-key'; apiKey: SensitiveString }
  | { type: 'helper'; command: string; ttlMs?: number }

type ClaudeBackend =
  | {
      type: 'anthropic-compatible'
      baseUrl: string
      auth: ClaudeGatewayAuth
      customHeaders?: Record<string, SensitiveString>
    }
  | {
      type: 'bedrock'
      region?: string
      baseUrl?: string
      profile?: string
      bedrockBearerToken?: SensitiveString
      skipAuth?: boolean
      authRefresh?: string
      credentialExport?: string
    }
  | {
      type: 'vertex'
      projectId?: string
      region?: string
      baseUrl?: string
      credentialsFile?: string
      skipAuth?: boolean
      authRefresh?: string
    }
  | {
      type: 'foundry'
      endpoint: { type: 'resource'; resource: string } | { type: 'url'; baseUrl: string }
      auth:
        | { type: 'api-key'; apiKey: SensitiveString }
        | { type: 'bearer'; token: SensitiveString }
        | { type: 'azure-default-credentials' }
    }

type ClaudeCodeProvider = ProviderBase & {
  runtime: 'claude-code'
  primaryModel: string
  backend: ClaudeBackend
  models?: ClaudeModelMappings
}

type Provider = CodexProvider | ClaudeCodeProvider
```

## Validation Rules for the Add Flow

- Require non-empty `name`, `baseUrl` where applicable, and `primaryModel`.
- Generate Provider IDs and Codex provider configuration keys independently from names.
- Validate URLs but do not bind them to known vendors or domains.
- Enforce exactly one authentication variant.
- Reject Codex `aws-sigv4` with WebSockets or any other authentication variant.
- Restrict Codex protocol to Responses API; do not offer Chat Completions.
- Require either Microsoft Foundry `resource` or `baseUrl`, never both.
- Require a usable project and region for Vertex after considering ambient credential/config resolution.
- Require a usable region and credential path for Bedrock after considering the AWS default chain.
- Treat secrets, static header values, query values, and potentially secret command arguments as sensitive in API responses and logs.
- For Codex environment-backed secrets, do not claim the Provider is applicable until Foundry has a defined way to expose the stored secret to the Codex process.

