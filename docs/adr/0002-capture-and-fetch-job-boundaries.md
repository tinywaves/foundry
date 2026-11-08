# Capture and Fetch Job boundaries

Foundry separates a user's saved link (a Capture) from each attempt to discover context around it (a Fetch Job). A Capture is an agent-facing bookmark, not a page copy: it owns the original URL, optional note, current display title, and the ID of its latest successful Fetch Job. A Fetch Job owns its status, fetcher configuration snapshot, raw Firecrawl Search response, final error, and history. A successful job updates the Capture title and latest-successful pointer; a failed job leaves both untouched. Raw responses are never copied onto the Capture.

A Capture may have many historical Fetch Jobs but at most one pending or running job. Capture creation and its first job are committed together. Re-capture always creates a new job, subject to the active-job constraint. User actions are not pre-disabled from potentially stale job state; the backend enforces the constraint transactionally and reports a conflict.

The exact trimmed URL is unique among non-deleted Captures. Foundry does not canonicalize URLs or merge them by content. All deletions are logical.

The only fetcher is Firecrawl Search, configured under Settings > Features > Library > Captures and distinct from model Providers. Foundry derives a focused `site:<host> <URL-context-term>` query, requests five web results with `formats: ["summary"]`, and stores the untouched API response in `raw_response_json`. Job retry policy belongs to Foundry rather than a provider SDK: SDK retries are disabled, each job performs up to the configured number of attempts with backoff, intermediate attempts are logged, and only the final failure is persisted on the job.

## Consequences

- Re-capturing preserves every earlier raw Firecrawl Search response and never overwrites history.
- Capture lists have no status column. The "No successful capture" view is derived from the latest-successful-job pointer being empty.
- Jobs pages are scoped to one Capture and are the place to inspect detailed status, timing, and final errors.
- The Capture detail page renders the latest successful raw Firecrawl Search response as JSON; Capture-page re-capture gives immediate feedback without a list refresh, while Jobs-page re-capture refreshes to show the pending job.
- Page refresh combines explicit refresh controls with terminal job events carrying a Capture ID.
- Firecrawl Search is the only capture transport. Search succeeds only when at least one result belongs to the submitted site; exact URL matches are preferred, then the same-site homepage, then the first same-site result.
