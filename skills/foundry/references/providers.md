# Providers

## Commands

```bash
foundry providers list
foundry providers get <provider-id>
foundry providers create --input '<json>'
foundry providers update <provider-id> --input '<json>'
foundry providers set-status <provider-id> --status active|disabled|deleted
foundry providers models <provider-id>
foundry providers models-for-connection --input '<connection-json>'
```

Aliases: `foundry provider ...`; `list` also supports `ls`; `create` also
supports `add`.

## Provider Input

```json
{
  "name": "Local OpenAI",
  "protocol": "openai-compatible-chat-completions",
  "baseURL": "http://127.0.0.1:11434/v1",
  "apiKey": "",
  "customModels": [
    {
      "id": "local-model",
      "displayName": "Local model"
    }
  ]
}
```

Rules:

- `name`: required, trimmed, non-empty.
- `protocol`: required; one of `openai-responses`,
  `anthropic-messages`, `openai-compatible-chat-completions`.
- `baseURL`: required HTTP or HTTPS URL.
- `apiKey`: optional string; missing input is treated as an empty string.
- `customModels`: optional array on create; each entry requires non-empty `id`.
  `displayName` can be a non-empty string or `null`.

## Provider Object

```json
{
  "id": "<provider-id>",
  "name": "Local OpenAI",
  "protocol": "openai-compatible-chat-completions",
  "baseURL": "http://127.0.0.1:11434/v1",
  "apiKey": "<stored-key>",
  "customModels": [],
  "status": "active",
  "createdAt": "<iso>",
  "updatedAt": "<iso>",
  "deletedAt": null
}
```

`providers list` additionally returns `isInUse`, indicating that a feature
settings record currently references the provider.

## Create

```bash
foundry providers create --input '{
  "name": "Local OpenAI",
  "protocol": "openai-compatible-chat-completions",
  "baseURL": "http://127.0.0.1:11434/v1",
  "apiKey": "",
  "customModels": []
}'
```

The response is the complete provider object. Reuse its top-level `id`.

## Update

Provider update is a **full replacement**.

1. Read the current provider with `providers get`.
2. Modify only the requested fields.
3. Preserve the existing `apiKey`, `customModels`, `protocol`, and `baseURL`
   unless the user intends to replace them.
4. Submit the complete provider input.

Omitting `apiKey` writes an empty key. Omitting `customModels` replaces the
custom list with `[]`. Never construct an update from only the user's changed
fields.

## Status

- `active`: selectable and usable.
- `disabled`: retained but not active.
- `deleted`: soft-deleted and excluded from `providers list`.

Disabling or deleting a provider referenced by feature settings returns
`PROVIDER_IN_USE`. Clear the referencing feature/provider selection first.

## Model Discovery

Saved provider:

```bash
foundry providers models <provider-id>
```

Unsaved connection:

```bash
foundry providers models-for-connection --input '{
  "protocol": "openai-compatible-chat-completions",
  "baseURL": "http://127.0.0.1:11434/v1",
  "apiKey": ""
}'
```

Discovery resolves `models/` relative to `baseURL` with a 15-second timeout.
When `baseURL` includes a path such as `/v1`, include a trailing slash
(`http://host/v1/`) so the path prefix is preserved during URL resolution.

- Anthropic uses `x-api-key` and `anthropic-version: 2023-06-01`.
- Other protocols use bearer authorization. An empty key uses the local
  placeholder `local-provider`.
- The response must contain an array under `data`, and every entry must have a
  non-empty string `id`.
- Returned models include optional `displayName` derived from `display_name`
  or `name`.

## Errors

- `INVALID_PROVIDER_INPUT`: invalid input shape, enum, URL, or custom model.
- `PROVIDER_NOT_FOUND`: unknown saved provider.
- `PROVIDER_IN_USE`: attempted disable/delete while referenced.
- `PROVIDER_MODELS_FAILED`: network failure, non-2xx response, invalid JSON, or
  invalid model payload.

Provider responses include stored credentials. Do not expose them unnecessarily.
