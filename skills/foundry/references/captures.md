# Captures

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
  "url": "https://example.com/article",
  "title": "Article title",
  "userNote": "Read later",
  "latestSuccessfulJobId": "<job-id>",
  "createdAt": "<iso>",
  "updatedAt": "<iso>"
}
```

## Capture Detail

`captures get` returns:

```json
{
  "capture": {
    "id": "<capture-id>",
    "url": "https://example.com/article",
    "title": "Article title",
    "userNote": "Read later",
    "latestSuccessfulJobId": "<job-id>",
    "createdAt": "<iso>",
    "updatedAt": "<iso>"
  },
  "content": {
    "jobId": "<job-id>",
    "markdown": "# Article"
  }
}
```

`content` is the latest successful scrape content. It is `null` when no job has
succeeded yet or the stored response has no usable Markdown/content string.

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
  "errorCode": null,
  "errorMessage": null,
  "createdAt": "<iso>",
  "updatedAt": "<iso>"
}
```

Statuses:

- `pending`: queued, not started.
- `running`: scrape request in progress.
- `succeeded`: scrape completed and latest successful job pointer may be set.
- `failed`: scrape exhausted its attempt or failed non-retryably.

The job response does not include captured Markdown. Use
`foundry captures get <capture-id>` for the latest successful content.

`jobs list` returns the capture's non-deleted jobs, newest first. This matches
the Web UI Jobs page. An existing capture with no jobs returns `[]`.

`jobs recapture` creates a new job with the current fetcher configuration, waits
for it to reach `succeeded` or `failed`, and returns the final job summary.
Preconditions are the same as capture recapture: the capture exists, no active
job already exists, and the current fetcher/API key are configured.

The Web UI Jobs page supports listing status, fetcher, created/updated time,
and error details; refresh by rerunning `jobs list`; and recapture. It does not
expose cancel, delete, retry-in-place, or a global job list. The CLI deliberately
matches those capabilities.

## List And Counts

```bash
foundry captures list
foundry captures list --filter no-successful
foundry captures counts
```

Filters:

- `all`: every non-deleted capture.
- `no-successful`: captures with no latest successful job.

Counts shape:

```json
{
  "all": 6,
  "noSuccessful": 1
}
```

## Create

```bash
foundry captures create https://example.com/article --note "Read later"
```

Preconditions:

- `settings.features.library.captures.fetcher` must be `firecrawl` or `deepseek`.
- The selected fetcher's API key must be non-empty.
- URL must be HTTP or HTTPS after trimming whitespace.
- The same normalized URL cannot already have an active capture.

The command creates the capture, queues its first scrape job, waits until that
job reaches `succeeded` or `failed`, and returns:

```json
{
  "capture": {
    "id": "<capture-id>",
    "url": "https://example.com/article",
    "title": "Article title",
    "userNote": "Read later",
    "latestSuccessfulJobId": "<job-id>",
    "createdAt": "<iso>",
    "updatedAt": "<iso>"
  },
  "content": {
    "jobId": "<job-id>",
    "markdown": "# Article"
  },
  "job": {
    "id": "<job-id>",
    "captureId": "<capture-id>",
    "status": "succeeded",
    "fetcher": "firecrawl",
    "errorCode": null,
    "errorMessage": null,
    "createdAt": "<iso>",
    "updatedAt": "<iso>"
  }
}
```

Important: a completed create command can return `job.status: "failed"` and
`content: null`. That is a scrape failure, not a capture-create failure. Read
`errorCode` and `errorMessage`.

## Recapture

```bash
foundry captures recapture <capture-id>
```

This creates a new child job, waits for completion, and returns the same
`capture`, `content`, and `job` structure as `captures create`.

Preconditions:

- The capture must exist.
- No pending or running job may already exist for it.
- The current capture fetcher and key must be configured.

This is the capture-level equivalent of `captures jobs recapture`; it returns
the capture detail along with the final job, while the nested jobs command
returns only the final job.

## Update Note

```bash
foundry captures note <capture-id> "New note"
foundry captures note <capture-id> ""
```

Notes are trimmed. An empty string stores `null` and clears the note.

## Delete

```bash
foundry captures delete <capture-id>
```

Deletion is soft deletion of the capture and its jobs. It is blocked while a
pending or running job exists. Response:

```json
{
  "deleted": true,
  "id": "<capture-id>"
}
```

Deleting the capture also removes its job history from normal queries.

## Errors

- `INVALID_URL`: URL is not HTTP or HTTPS.
- `CAPTURE_ALREADY_EXISTS`: active capture with the same URL exists.
- `FETCHER_NOT_CONFIGURED`: no capture fetcher/key configured.
- `ACTIVE_JOB_EXISTS`: capture already has pending/running work.
- `CAPTURE_NOT_FOUND`: unknown or deleted capture.
- `JOB_NOT_FOUND`: unknown job or a job owned by another capture.

Job failures are returned as a valid final job with `status: "failed"`; do not
assume a successful command means a successful scrape.
