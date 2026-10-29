# Settings

## Commands

```bash
foundry settings get
foundry settings update --input '<json>'
foundry settings open
```

`settings open` asks the operating system to open the Foundry configuration
folder and returns its path.

## Read Shape

`settings get` returns:

```json
{
  "workspace": {
    "appearance": {
      "color-theme": "system"
    },
    "language-region": {
      "language": "system",
      "time-format": "YYYY-MM-DD HH:mm:ss",
      "time-zone": "America/Los_Angeles"
    }
  },
  "features": {
    "library": {
      "captures": {
        "fetcher": null,
        "maxAttempts": 1,
        "scrapeConcurrency": 2,
        "firecrawl": { "apiKey": "" },
        "deepseek": { "apiKey": "" }
      }
    }
  },
  "configFolder": "<home>/.foundry"
}
```

Stored API keys are returned because Foundry is local-only.

## Update Patch

`settings update` is a partial top-level patch. Omitted fields are preserved.

Allowed fields:

| Field | Values |
| --- | --- |
| `theme` | `system`, `light`, `dark` |
| `language` | `system`, `en-US`, `zh-CN`, `zh-TW`, `ja-JP` |
| `timeFormat` | `YYYY-MM-DD HH:mm:ss`, `YYYY-MM-DD`, `YYYY/MM/DD HH:mm:ss`, `DD/MM/YYYY HH:mm:ss`, `MM/DD/YYYY hh:mm:ss A`, `HH:mm:ss` |
| `timezone` | `America/Los_Angeles`, `America/New_York`, `Asia/Shanghai`, `Asia/Taipei`, `Asia/Tokyo`, `UTC` |
| `captures.fetcher` | `firecrawl`, `deepseek`, or `null` |
| `captures.maxAttempts` | integer `1..10` |
| `captures.scrapeConcurrency` | integer `1..5` |
| `captures.firecrawlApiKey` | string, trimmed |
| `captures.deepseekApiKey` | string, trimmed |

The nested patch object is:

```json
{
  "captures": {
    "fetcher": "firecrawl",
    "maxAttempts": 2,
    "scrapeConcurrency": 2,
    "firecrawlApiKey": "<key>",
    "deepseekApiKey": "<key>"
  }
}
```

Setting `fetcher` to `null` disables capture fetching. Clear a stored key by
setting its API-key field to an empty string.

Only the documented patch fields are interpreted. Misspelled or unknown fields
may be ignored, so verify the returned settings after a mutation.

## Mutation Semantics

- This is a partial settings patch; unlike provider update, omitted settings
  remain unchanged.
- API-key values are trimmed.
- The update response contains the complete resulting settings plus
  `configFolder`.
- Appearance, language, and display-time settings affect the Web UI rendering.
- Capture fetcher, retry count, and concurrency affect newly scheduled scrape
  jobs.

## Examples

Set appearance and language:

```bash
foundry settings update --input '{
  "theme": "dark",
  "language": "zh-CN",
  "timezone": "Asia/Shanghai"
}'
```

Configure Firecrawl:

```bash
foundry settings update --input '{
  "captures": {
    "fetcher": "firecrawl",
    "firecrawlApiKey": "<key>",
    "maxAttempts": 2,
    "scrapeConcurrency": 2
  }
}'
```

Disable capture fetching:

```bash
foundry settings update --input '{"captures":{"fetcher":null}}'
```

## Errors

- `INVALID_SETTINGS_INPUT`: invalid patch type, enum value, field type, or
  integer range.
- `INPUT_REQUIRED`, `CONFLICTING_INPUT`, `INVALID_JSON`: JSON input transport
  errors described in `cli-conventions.md`.

Do not edit `settings.json` directly. Read current settings and issue a patch.
