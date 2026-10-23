# Capture and Scrape Job boundaries

Foundry separates a user's saved link (a Capture) from each attempt to retrieve it (a Scrape Job). A Capture owns the original URL, optional note, current display title, and the ID of its latest successful Scrape Job; it has no fetch or organization status. A Scrape Job owns its status, fetcher configuration snapshot, raw provider response, final error, and history. A successful job updates the Capture title and latest-successful pointer; a failed job leaves both untouched. Raw responses are never copied onto the Capture.

A Capture may have many historical Scrape Jobs but at most one pending or running job. Capture creation and its first job are committed together. Re-capture always creates a new job, subject to the active-job constraint. User actions are not pre-disabled from potentially stale job state; the backend enforces the constraint transactionally and reports a conflict.

The exact trimmed URL is unique among non-deleted Captures. Foundry does not canonicalize URLs or merge them by content. All deletions are logical.

Fetchers are configured under Settings > Features > Library > Captures and are distinct from model Providers. Job retry policy belongs to Foundry rather than a provider SDK: SDK retries are disabled, each job performs up to the configured number of attempts with backoff, intermediate attempts are logged, and only the final failure is persisted on the job.

## Consequences

- Re-capturing preserves every earlier raw response and never overwrites history.
- Capture lists have no status column. The "No successful capture" view is derived from the latest-successful-job pointer being empty.
- Jobs pages are scoped to one Capture and are the place to inspect detailed status, timing, and final errors.
- The Capture page reflects only successful captured content; Capture-page re-capture gives immediate feedback without a list refresh, while Jobs-page re-capture refreshes to show the pending job.
- Page refresh combines explicit refresh controls with terminal job events carrying a Capture ID.
- Firecrawl and DeepSeek differ in their transport APIs but share the same job-level success, retry, and persistence rules.
