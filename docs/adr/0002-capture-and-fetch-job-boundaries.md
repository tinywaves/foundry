# Capture and Fetch Job boundaries

Status: retained backend decision. Capture and job APIs remain available, while
the current Web UI and CLI implement Settings. Capture lists, detail views, and
job pages belong to legacy reference code.

## Decision

A Capture is a saved link with its original URL, optional note, display title,
and latest-successful-job ID. A Fetch Job owns execution status, fetcher
configuration snapshot, raw response, credit usage, and final error. Successful
execution updates the Capture title and latest-successful pointer; failure leaves
those fields untouched. Raw responses live on the job as `rawResponse`, not on
the Capture or in a SQL `raw_response_json` column.

A Capture can have many historical jobs and at most one pending or running job.
Creating a Capture and its first job is transactional. Re-capture creates a new
job, preserving earlier responses. The trimmed URL is unique among non-deleted
Captures; storage does not canonicalize URLs or merge by page content. Deletions
are logical. Backend repositories enforce these constraints regardless of client
state.

## Execution and configuration

`FetchJobRunner` owns queueing, concurrency, status transitions, recovery, and
terminal events. Settings retain the capture fetcher configuration under
`features.library.captures`; these fields are supported by the existing Settings
API but are not current Settings Web controls or CLI get/set keys.

Firecrawl Search is the only fetcher and is independent of model Providers. It
builds a focused `site:<host> <context-term>` query, requests five web results with
summary scraping, and preserves the raw response envelope. Result selection
prefers an exact URL, then a same-site homepage, then another same-site result.
An absent match yields no selected title; an unmatched search is not itself a
job failure when the response otherwise satisfies fetcher validation.

The current transport passes the stored attempt setting to Firecrawl's SDK
retry configuration. The runner records the final fetcher outcome; there is no
separate persisted record for each transport retry. The earlier statement that
SDK retries were disabled does not describe the current implementation.

## Historical UI policy

The legacy capture list derived its "No successful capture" filter from the
latest-successful-job pointer. Job pages were scoped to one Capture, and details
rendered the latest successful raw response. Refresh controls and events updated
those views. These are reference behaviors for future UI work, not instructions
to restore those pages as part of Settings changes.

See `src/features/captures/repository.ts`, `runner.ts`, `fetchers/firecrawl.ts`,
and `src/storage/models.ts` for the retained implementation.
