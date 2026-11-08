# Captures

A capture is an agent-facing bookmark. It records what a saved URL is about so
an agent can decide whether the URL is relevant and then visit it or run a fresh
web search for details.

Foundry does not store a page copy as the primary capture result. It sends one
capture-discovery request through the configured fetcher and stores the raw
response. The response contains result titles, descriptions, metadata, and
summaries that help identify the product, library, or resource.

## Commands

```bash
foundry captures list [--filter all|no-successful]
foundry captures counts
foundry captures get <capture-id>
foundry captures create <url> [--note <text>]
foundry captures recapture <capture-id>
foundry captures note <capture-id> <text>
foundry captures delete <capture-id>
foundry captures jobs list <capture-id>
foundry captures jobs get <capture-id> <job-id>
foundry captures jobs recapture <capture-id>
```

Aliases: `foundry capture ...`; `list` supports `ls`; `create` supports `add`;
`delete` supports `remove` and `rm`; nested job `list` supports `ls` and
nested job `get` supports `show`.

## Capture Summary

```json
{
  "id": "<capture-id>",
  "url": "https://ui.shadcn.com/",
  "title": "shadcn/ui - The Foundation for your Design System",
  "userNote": "Components for the next project",
  "latestSuccessfulJobId": "<job-id>",
  "createdAt": "<iso>",
  "updatedAt": "<iso>"
}
```

The title comes from the best matching fetcher result. Exact URL results are
preferred, then the same site's homepage, then the first result on the same
site.

## Capture Detail

`captures get` returns:

```json
{
  "capture": {
    "id": "<capture-id>",
    "url": "https://ui.shadcn.com/",
    "title": "shadcn/ui - The Foundation for your Design System",
    "userNote": "Components for the next project",
    "latestSuccessfulJobId": "<job-id>",
    "createdAt": "<iso>",
    "updatedAt": "<iso>"
  },
  "rawResponse": {
    "success": true,
    "data": {
      "web": [
        {
          "url": "https://ui.shadcn.com/",
          "title": "shadcn/ui - The Foundation for your Design System",
          "description": "Composable, accessible components...",
          "summary": "The fetcher's longer page summary...",
          "metadata": {
            "sourceURL": "https://ui.shadcn.com/",
            "statusCode": 200
          }
        }
      ]
    },
    "creditsUsed": 2
  }
}
```

`rawResponse` is the unmodified response from the configured fetcher. It is
`null` until a job succeeds. The response shape depends on that fetcher; use
result metadata and descriptions as supporting evidence rather than treating
any generated summary as the canonical product description.

## Fetcher Behavior

The current fetcher implementation uses the official Firecrawl Node SDK to call
`POST /v2/search`. A fetch job uses a query derived from the submitted URL:

- Root URL: `site:<hostname> <brand-token>`
- Path URL: `site:<hostname> <last-meaningful-path-segment>`

Examples:

| URL | Query |
| --- | --- |
| `https://ui.shadcn.com/` | `site:ui.shadcn.com shadcn` |
| `https://ui.shadcn.com/docs` | `site:ui.shadcn.com docs` |
| `https://models.dev/labs/apodex/` | `site:models.dev apodex` |
| `https://github.com/vercel/next.js` | `site:github.com next.js` |

The request uses five web results, `formats: ["summary"]`, main-content
filtering, cache reuse, ad blocking, automatic proxy selection, and a
two-day `maxAge`. `captures.maxAttempts` is passed to the SDK as its total
request-attempt limit; Foundry does not run a separate retry loop. In the
current Firecrawl SDK, automatic retries apply only to HTTP `502` responses.
Other retryable Firecrawl errors, including `408`, `429`, and other `5xx`
responses, are returned immediately.

Foundry records the final SDK response only. A job succeeds when Firecrawl
returns a valid successful response with a numeric `creditsUsed` value,
including when the search has zero results or no result on the requested site.
The job fails when the SDK request fails, Firecrawl reports an error, or the
response does not contain `creditsUsed`.

## Child Jobs

Jobs are capture-owned children. They are not a global top-level CLI resource.

```bash
foundry captures jobs list <capture-id>
foundry captures jobs get <capture-id> <job-id>
foundry captures jobs recapture <capture-id>
```

`jobs get` requires both IDs because Foundry verifies that the job belongs to
the specified capture:

- unknown capture -> `CAPTURE_NOT_FOUND`
- unknown job or job owned by another capture -> `JOB_NOT_FOUND`

Job shape:

```json
{
  "id": "<job-id>",
  "captureId": "<capture-id>",
  "status": "succeeded",
  "fetcher": "firecrawl",
  "creditsUsed": 2,
  "errorCode": null,
  "errorMessage": null,
  "createdAt": "<iso>",
  "updatedAt": "<iso>"
}
```

Statuses:

- `pending`: queued, not started.
- `running`: fetcher request in progress.
- `succeeded`: Firecrawl returned a valid response with `creditsUsed`, and the
  raw response was persisted. Zero search results still count as success.
- `failed`: the SDK request failed, Firecrawl reported an error, or the
  response did not report `creditsUsed`.

The job response does not include the raw response. Use
`foundry captures get <capture-id>` for the latest successful response.
`creditsUsed` is the authoritative per-job Firecrawl charge; `null` means no
charge was reported.

`jobs list` returns the capture's non-deleted jobs, newest first. An existing
capture with no jobs returns `[]`.

`jobs recapture` creates a new job with the current fetcher configuration, waits
for it to reach `succeeded` or `failed`, and returns the final job summary.

## Create

```bash
foundry captures create https://ui.shadcn.com/ --note "Component library"
```

Preconditions:

- `settings.features.library.captures.fetcher` must be `firecrawl` or `null`.
- The configured fetcher API key must be non-empty.
- The URL must be HTTP or HTTPS after trimming whitespace.
- The same normalized URL cannot already have an active capture.

The command creates the capture, queues its first fetch job, waits until that
job reaches `succeeded` or `failed`, and returns `capture`, `rawResponse`, and
`job`.

A completed create command can return `job.status: "failed"` and
`rawResponse: null`. That is a discovery failure, not a capture-create failure.
Read `errorCode` and `errorMessage`.

## Recapture

`foundry captures recapture <capture-id>` creates a new child job, waits for
completion, and returns the same `capture`, `rawResponse`, and `job` structure
as `captures create`.

Preconditions:

- The capture must exist.
- No pending or running job may already exist for it.
- The current fetcher and its API key must be configured.

## Update Note

```bash
foundry captures note <capture-id> "New note"
foundry captures note <capture-id> ""
```

Notes are trimmed. An empty string stores `null` and clears the note.

## Delete

Deletion is soft deletion of the capture and its jobs. It is blocked while a
pending or running job exists. Response:

```json
{
  "deleted": true,
  "id": "<capture-id>"
}
```

## Errors

- `INVALID_URL`: URL is not HTTP or HTTPS.
- `CAPTURE_ALREADY_EXISTS`: active capture with the same URL exists.
- `FETCHER_NOT_CONFIGURED`: no fetcher or fetcher API key is configured.
- `ACTIVE_JOB_EXISTS`: capture already has pending/running work.
- `CAPTURE_NOT_FOUND`: unknown or deleted capture.
- `JOB_NOT_FOUND`: unknown job or a job owned by another capture.

Job failures are returned as a valid final job with `status: "failed"`; do not
assume a successful command means a successful fetcher response.
