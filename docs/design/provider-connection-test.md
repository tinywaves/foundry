# Provider Connection Test

The Provider card tests its saved connection configuration directly. The test
does not depend on Runtime Assignment, does not apply configuration to a
Runtime, and does not persist a status.

## Probe Sequence

1. Send an authenticated `GET` to the Runtime-specific model-listing endpoint.
2. Treat any `2xx` response as a successful connection test without inspecting
   its response body.
3. Only when the model-listing route is unsupported (`404`, `405`, or `501`),
   send an authenticated `GET` to the exact saved Base URL.
4. Treat any HTTP response from the Base URL as proof that the service is
   reachable. Fail only when no HTTP response can be established.
5. Do not fall back for any other model-listing failure, including redirects,
   authentication errors, server errors, network errors, and timeouts.
6. Do not follow redirects. A redirect from the model-listing endpoint is a
   failure rather than a successful response from the configured API.

Codex appends `models` to its saved Base URL path. Claude Code appends
`v1/models`, unless the saved path already ends in `v1`. Requests use the API
key header semantics stored by the Provider.

## Feedback

The test button shows a pending spinner only for the selected Provider. A
successful test displays the global `Connection successful` toast. A failed
test opens an anchored Popover containing a short, sanitized error message.
