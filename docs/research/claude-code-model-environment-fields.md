# Claude Code Model Environment Fields

Date: 2026-09-07

## Scope and source policy

This note investigates Claude Code environment variables that directly select a model, remap a model-family alias, add model-picker metadata, or choose a subagent model. It intentionally does not attempt to catalog every adjacent behavior flag for context windows, effort, fallback, prompt caching, or provider routing.

Only Anthropic first-party sources are used:

- [Claude Code model configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code environment variables](https://code.claude.com/docs/en/env-vars)
- [Claude Code subagent model selection](https://code.claude.com/docs/en/sub-agents#choose-a-model)
- [Claude Code forced subagent model](https://code.claude.com/docs/en/sub-agents#run-every-subagent-on-one-model)
- [Anthropic Claude Code release v2.1.78](https://github.com/anthropics/claude-code/releases/tag/v2.1.78)
- [Anthropic Claude Code release v2.1.236](https://github.com/anthropics/claude-code/releases/tag/v2.1.236)
- [Anthropic Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)

The conclusions below describe the official documentation available on 2026-09-07. This area is version-sensitive: `ANTHROPIC_DEFAULT_MODEL` requires Claude Code v2.1.236 or later, Fable itself requires v2.1.170 or later, and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` requires v2.1.257 or later.

## Executive conclusion

The ccSwitch list in the question contains valid current Claude Code fields, but it is not the complete official model-configuration surface.

- `ANTHROPIC_MODEL` selects the active model for the launched main session. It is not the same thing as `ANTHROPIC_DEFAULT_MODEL`.
- `ANTHROPIC_DEFAULT_MODEL` is only a low-priority default for new sessions. It is ignored whenever `--model`, `ANTHROPIC_MODEL`, any settings-file `model`, or an organization default selects a model.
- `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, and `ANTHROPIC_DEFAULT_FABLE_MODEL` remap family aliases; they do not independently choose the startup model.
- Only the four family variables and `ANTHROPIC_CUSTOM_MODEL_OPTION` officially support all three metadata suffixes: `_NAME`, `_DESCRIPTION`, and `_SUPPORTED_CAPABILITIES`.
- `CLAUDE_CODE_SUBAGENT_MODEL` is a default in current releases, not an unconditional override. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` is required to force it over per-invocation and agent-definition model choices.
- `ANTHROPIC_CUSTOM_MODEL_OPTION` is an official way to append one arbitrary model ID to `/model`; it does not replace built-in aliases and does not select that model automatically.

Sources: [model selection precedence](https://code.claude.com/docs/en/model-config#setting-your-model), [default model behavior](https://code.claude.com/docs/en/model-config#set-a-default-model-for-new-sessions), [alias environment variables](https://code.claude.com/docs/en/model-config#environment-variables), [display and capability suffixes](https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities), and [subagent model order](https://code.claude.com/docs/en/sub-agents#choose-a-model).

## Official field matrix

### Main-session selection

| Field | Official meaning | Priority and constraints | Metadata suffixes | Source |
| --- | --- | --- | --- | --- |
| `ANTHROPIC_MODEL` | Selects the model used by the Claude Code session launched with the variable. Accepts an alias or model/provider ID. | Below in-session `/model` and startup `--model`; above the settings-file `model` and `ANTHROPIC_DEFAULT_MODEL`. It applies to the launch rather than becoming a persisted user default. | None documented. No official `ANTHROPIC_MODEL_NAME`, `_DESCRIPTION`, or `_SUPPORTED_CAPABILITIES`. | [Setting your model](https://code.claude.com/docs/en/model-config#setting-your-model), [environment-variable index](https://code.claude.com/docs/en/env-vars) |
| `ANTHROPIC_DEFAULT_MODEL` | Supplies the default model for a new session when nothing more specific selects one. | Requires v2.1.236+. It loses to `--model`, `ANTHROPIC_MODEL`, every settings-file `model`, and an organization default. Claude Code also ignores values `default`, `inherit`, `opusplan`, and `haiku`, plus unavailable or disallowed models. | None documented. No official `ANTHROPIC_DEFAULT_MODEL_NAME`, `_DESCRIPTION`, or `_SUPPORTED_CAPABILITIES`. | [Set a default model for new sessions](https://code.claude.com/docs/en/model-config#set-a-default-model-for-new-sessions), [v2.1.236 release](https://github.com/anthropics/claude-code/releases/tag/v2.1.236) |

The distinction is therefore semantic, not merely naming:

```text
ANTHROPIC_MODEL         = force this launch's main session to start on X
ANTHROPIC_DEFAULT_MODEL = use X only if no higher-priority source chose a model
```

When ccSwitch always writes `ANTHROPIC_MODEL`, adding `ANTHROPIC_DEFAULT_MODEL` with the same value would normally be redundant because the former outranks the latter. A switcher should use `ANTHROPIC_DEFAULT_MODEL` instead only when it intentionally wants user/project/managed `model` settings to remain able to override the provider's default.

### Family alias mappings

| Base field | Official role | Important behavior | Source |
| --- | --- | --- | --- |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Model ID to which `opus` resolves. | Also used by `opusplan` while Plan Mode is active. | [Environment variables](https://code.claude.com/docs/en/model-config#environment-variables) |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Model ID to which `sonnet` resolves. | Also used by `opusplan` after Plan Mode. | [Environment variables](https://code.claude.com/docs/en/model-config#environment-variables) |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Model ID to which `haiku` resolves. | Also supplies the Haiku-class/background-functionality model role. It replaces the deprecated `ANTHROPIC_SMALL_FAST_MODEL`. | [Environment variables](https://code.claude.com/docs/en/model-config#environment-variables), [environment-variable index](https://code.claude.com/docs/en/env-vars) |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | Model ID to which `fable` resolves. | On third-party providers, Claude Code also recognizes this ID as a Fable model for automatic fallback behavior. | [Environment variables](https://code.claude.com/docs/en/model-config#environment-variables), [Fable documentation](https://code.claude.com/docs/en/model-config#work-with-fable) |

These variables are alias mappings, not four independent startup defaults. For example:

- If `ANTHROPIC_MODEL=sonnet`, `ANTHROPIC_DEFAULT_SONNET_MODEL=gateway/model-a` determines the actual ID selected through the `sonnet` alias.
- If `ANTHROPIC_MODEL=gateway/model-a`, the main session already selects that provider ID directly; the family variables still matter when the user, Plan Mode, background functionality, or another configuration later asks for `opus`, `sonnet`, `haiku`, or `fable`.
- Pointing all four family variables to one ID is valid for a gateway that intentionally collapses every Claude family onto one backend model, but it removes the normal semantic and cost/performance distinctions among the aliases.

Anthropic specifically recommends pinning these family variables for Bedrock, Google Cloud's Agent Platform, Microsoft Foundry, and Claude Platform on AWS because provider defaults can lag or be unavailable. Source: [Pin models for third-party deployments](https://code.claude.com/docs/en/model-config#pin-models-for-third-party-deployments).

### Subagent selection

| Field | Official meaning | Current precedence | Source |
| --- | --- | --- | --- |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Default model for subagents, agent-team teammates, and workflow agents that have not been assigned a model another way. Accepts an alias or full model name. | Current order is: per-invocation model, agent definition `model`, `CLAUDE_CODE_SUBAGENT_MODEL`, then the main conversation's model. `inherit` is equivalent to leaving it unset. Before v2.1.251, this variable had stronger override behavior. | [Choose a model](https://code.claude.com/docs/en/sub-agents#choose-a-model), [environment-variable index](https://code.claude.com/docs/en/env-vars) |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | Boolean force switch, not a model ID. Set to `1` to override per-invocation and agent-definition model choices. | With both fields set, every covered agent uses `CLAUDE_CODE_SUBAGENT_MODEL`. With only `..._FORCE=1`, agents use the main conversation's model. Requires v2.1.257+. Documented exceptions include forks and skills running in a subagent with `model: inherit`. | [Run every subagent on one model](https://code.claude.com/docs/en/sub-agents#run-every-subagent-on-one-model), [environment-variable index](https://code.claude.com/docs/en/env-vars) |

Neither subagent field has official `_NAME`, `_DESCRIPTION`, or `_SUPPORTED_CAPABILITIES` companions. Capability metadata belongs to the model entry or pinned family ID, not to the subagent-selection variable.

## Which fields support metadata suffixes

The current official documentation defines the same three suffixes for exactly these five base fields:

| Base field | `_NAME` | `_DESCRIPTION` | `_SUPPORTED_CAPABILITIES` |
| --- | --- | --- | --- |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Yes | Yes | Yes |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Yes | Yes | Yes |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Yes | Yes | Yes |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | Yes | Yes | Yes |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` | Yes | Yes | Yes |
| `ANTHROPIC_MODEL` | No documented suffix | No documented suffix | No documented suffix |
| `ANTHROPIC_DEFAULT_MODEL` | No documented suffix | No documented suffix | No documented suffix |
| `CLAUDE_CODE_SUBAGENT_MODEL` | No documented suffix | No documented suffix | No documented suffix |

Source: [Customize pinned model display and capabilities](https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities) and the individual entries in the [official environment-variable index](https://code.claude.com/docs/en/env-vars).

For each supported base field:

- `_NAME` changes the display name shown in `/model`; if omitted, the pinned/custom model ID is used.
- `_DESCRIPTION` changes the description shown in `/model`; if omitted, Claude Code generates a `Custom ... model` description.
- `_SUPPORTED_CAPABILITIES` is a comma-separated allowlist describing features Claude Code cannot reliably infer from a provider-specific ID. Once set, listed capabilities are enabled and unlisted capabilities are disabled for that model entry.

The documented capability values are:

| Value | Enables |
| --- | --- |
| `effort` | Effort levels and `/effort` |
| `xhigh_effort` | The `xhigh` effort level |
| `max_effort` | The `max` effort level |
| `thinking` | Extended thinking |
| `adaptive_thinking` | Adaptive allocation of thinking |
| `interleaved_thinking` | Thinking between tool calls |

Do not blindly declare every capability. The value is authoritative: setting it incorrectly can make Claude Code send parameters that the gateway/model does not support, while omitting a genuinely supported capability from an explicitly set list disables that feature in Claude Code. Source: [Capability declarations](https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities).

Provider scope also matters:

- The official documentation says the companion variables take effect for pinned models on third-party providers such as Bedrock, Google Cloud's Agent Platform, and Microsoft Foundry.
- `_NAME` and `_DESCRIPTION` also take effect behind an `ANTHROPIC_BASE_URL` LLM gateway.
- `_NAME` and `_DESCRIPTION` have no effect when Claude Code connects directly to `api.anthropic.com`.

### Exact current field names in scope

Within this note's scope—model selection, alias mapping, model-picker metadata/capabilities, and subagent selection—the current official environment variables are:

```text
ANTHROPIC_MODEL
ANTHROPIC_DEFAULT_MODEL

ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_DEFAULT_OPUS_MODEL_NAME
ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION
ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES

ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL_NAME
ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION
ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES

ANTHROPIC_DEFAULT_HAIKU_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME
ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION
ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES

ANTHROPIC_DEFAULT_FABLE_MODEL
ANTHROPIC_DEFAULT_FABLE_MODEL_NAME
ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION
ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES

ANTHROPIC_CUSTOM_MODEL_OPTION
ANTHROPIC_CUSTOM_MODEL_OPTION_NAME
ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION
ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES

CLAUDE_CODE_SUBAGENT_MODEL
CLAUDE_CODE_SUBAGENT_MODEL_FORCE
```

`ANTHROPIC_SMALL_FAST_MODEL` is still recognized but officially deprecated in favor of `ANTHROPIC_DEFAULT_HAIKU_MODEL`; it should be treated as a legacy migration input rather than a field to emit in new configuration. Source: [official environment-variable index](https://code.claude.com/docs/en/env-vars).

## `ANTHROPIC_CUSTOM_MODEL_OPTION`

`ANTHROPIC_CUSTOM_MODEL_OPTION` and its companions are officially supported:

```json
{
  "env": {
    "ANTHROPIC_CUSTOM_MODEL_OPTION": "gateway/model-a",
    "ANTHROPIC_CUSTOM_MODEL_OPTION_NAME": "Model A via Gateway",
    "ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION": "Internal gateway deployment",
    "ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES": "effort,thinking"
  }
}
```

Its purpose is narrowly defined:

- Append one arbitrary model ID to the `/model` picker.
- Keep all built-in aliases and their entries intact.
- Skip model-ID validation so a gateway-specific string can be used.
- Provide optional display metadata and capability declarations.
- Make a non-standard model selectable; it does not automatically make that model active.

Claude Code introduced the base field with optional `_NAME` and `_DESCRIPTION` in [release v2.1.78](https://github.com/anthropics/claude-code/releases/tag/v2.1.78). The current docs additionally list `_SUPPORTED_CAPABILITIES` as an official companion. For multiple custom picker entries, Anthropic directs users to the `modelPicker` settings key instead of repeating this environment variable. When gateway model discovery is enabled with `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`, the custom option is needed only if discovery is disabled or does not return the desired model. Source: [Add a custom model option](https://code.claude.com/docs/en/model-config#add-a-custom-model-option).

This field is not a replacement for either:

- `ANTHROPIC_MODEL`, which selects the launched main session's active model; or
- `ANTHROPIC_DEFAULT_*_MODEL`, which changes what the built-in family aliases resolve to.

## Assessment of the ccSwitch field list

The list supplied in the question is:

```text
ANTHROPIC_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL_NAME
ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_OPUS_MODEL_NAME
ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_DEFAULT_FABLE_MODEL_NAME
ANTHROPIC_DEFAULT_FABLE_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME
ANTHROPIC_DEFAULT_HAIKU_MODEL
CLAUDE_CODE_SUBAGENT_MODEL
```

### What is correct

- Every listed field is a current official Claude Code field.
- `ANTHROPIC_MODEL` is the correct field when the switcher's intent is to select the main model for every Claude Code launch using that generated configuration.
- Setting all four family base fields is a reasonable compatibility strategy when a provider exposes one gateway model and the switcher wants every built-in alias, Plan Mode role, Haiku/background role, and Fable fallback recognition to resolve to it.
- Setting `CLAUDE_CODE_SUBAGENT_MODEL` is reasonable as a default for otherwise-unassigned subagents.

### What is incomplete or potentially misleading

1. **It omits all four `_DESCRIPTION` fields.** These are official, but optional and cosmetic.
2. **It omits all four `_SUPPORTED_CAPABILITIES` fields.** This is the most important functional omission for opaque gateway IDs because Claude Code may otherwise fail to recognize supported effort/thinking features.
3. **It omits `ANTHROPIC_CUSTOM_MODEL_OPTION` and its three companions.** That omission is reasonable if ccSwitch's design is to replace/pin the built-in aliases rather than add an extra picker row. It is incomplete if ccSwitch claims to expose the full official custom-model configuration surface.
4. **It omits `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`.** On current Claude Code versions, `CLAUDE_CODE_SUBAGENT_MODEL` alone is only a default. If ccSwitch intends every subagent to use the configured model even when a definition or invocation asks for another model, it must also set the force flag.
5. **It omits `ANTHROPIC_DEFAULT_MODEL`.** This is not necessarily a defect because `ANTHROPIC_MODEL` already outranks it. The two fields represent alternative policy choices, not a pair that normally needs the same value.
6. **Using a raw model ID as every `_NAME` value is valid but adds little value.** When `_NAME` is absent, Claude Code already displays the model ID. A switcher should set `_NAME` only when it has a friendlier human-readable label.
7. **Mapping Opus, Sonnet, Haiku, and Fable to the same ID is a policy choice, not a neutral provider configuration.** It deliberately collapses model tiers and can change cost, latency, fallback, Plan Mode, and background-task behavior.

### Completeness comparison

| Official area | ccSwitch list coverage | Assessment |
| --- | --- | --- |
| Main launched session | `ANTHROPIC_MODEL` | Complete for a hard per-launch selection |
| Low-priority new-session default | Missing `ANTHROPIC_DEFAULT_MODEL` | Optional alternative; redundant while `ANTHROPIC_MODEL` is always set |
| Family alias mappings | All four base fields | Complete |
| Family picker names | All four `_NAME` fields | Complete but often redundant when equal to the ID |
| Family picker descriptions | Missing all four `_DESCRIPTION` fields | Optional cosmetic omission |
| Family capabilities | Missing all four `_SUPPORTED_CAPABILITIES` fields | Functional omission for unrecognized provider IDs |
| One extra custom picker model | Missing `ANTHROPIC_CUSTOM_MODEL_OPTION` plus companions | Optional unless the switcher wants an additional picker row |
| Subagent default | `CLAUDE_CODE_SUBAGENT_MODEL` | Present |
| Forced subagent override | Missing `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | Required only if “all subagents must use this model” is the intended policy |

## Recommended field sets by intent

### Hard-switch every normal model role to one gateway ID

Use:

```text
ANTHROPIC_MODEL
ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL
ANTHROPIC_DEFAULT_FABLE_MODEL
CLAUDE_CODE_SUBAGENT_MODEL
```

Add as appropriate:

```text
ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL_NAME
ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL_DESCRIPTION
ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL_SUPPORTED_CAPABILITIES
CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1
```

The force flag should be added only if the switcher intentionally wants to defeat model choices in agent definitions and per-invocation requests.

### Supply a default but preserve user/settings overrides

Use `ANTHROPIC_DEFAULT_MODEL` instead of `ANTHROPIC_MODEL`. Keep family mappings only if the provider needs aliases pinned to provider-specific IDs.

### Add one gateway model without replacing built-ins

Use:

```text
ANTHROPIC_CUSTOM_MODEL_OPTION
ANTHROPIC_CUSTOM_MODEL_OPTION_NAME
ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION
ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES
```

Then select it separately through `/model`, `--model`, `ANTHROPIC_MODEL`, or the settings-file `model` field.

## Final answer

ccSwitch's list is **valid but intentionally partial**. It is reasonable for a “route all common Claude Code roles to this provider model” profile, especially when `ANTHROPIC_MODEL` is always present. It is not a complete representation of Claude Code's official model environment fields because it omits descriptions, declared capabilities, the one-off custom picker option, the low-priority default model, and the current subagent force switch.

For a provider switcher, the highest-value correction is not automatically adding `ANTHROPIC_DEFAULT_MODEL`; it is distinguishing three separate policies in the UI/data model:

1. active model for this launch: `ANTHROPIC_MODEL`;
2. family alias mappings and their metadata/capabilities: `ANTHROPIC_DEFAULT_*_MODEL{,_NAME,_DESCRIPTION,_SUPPORTED_CAPABILITIES}`;
3. subagent default versus forced override: `CLAUDE_CODE_SUBAGENT_MODEL` plus optional `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`.

`ANTHROPIC_CUSTOM_MODEL_OPTION{,_NAME,_DESCRIPTION,_SUPPORTED_CAPABILITIES}` should be exposed separately as “add one model to the picker,” because it solves a different problem from selecting or remapping the active model.
