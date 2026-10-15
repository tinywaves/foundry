# CCSwitch Provider Connectivity Check

Research date: 2026-09-08

Canonical source: [`farion1231/cc-switch`](https://github.com/farion1231/cc-switch), inspected at commit [`f3b18df`](https://github.com/farion1231/cc-switch/commit/f3b18df12007d0fd79fd8ad8d310880664015197) (CCSwitch 3.20.2).

## Conclusion

CCSwitch's current Provider check is intentionally a **reachability check**, not a validation that the Provider URL, credentials, or API protocol are correct. It sends a `GET` request to the saved `base_url` and treats **every HTTP response status**, including `401`, `403`, `404`, `429`, and `5xx`, as success. Only failures that prevent an HTTP response, such as DNS, connection, TLS, and timeout failures, are reported as failed.

Consequently, copying CCSwitch's algorithm would not fix Foundry's reported false positive. A wrong path hosted by a reachable gateway is expected to pass CCSwitch's check.

## Exact implementation

The backend entry point is the Tauri command [`stream_check_provider`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/commands/stream_check.rs#L16-L45). It loads the saved Provider and the global connectivity configuration, resolves the Provider base URL, calls `StreamCheckService::check_with_retry`, and persists a check log.

The core request is [`StreamCheckService::probe_reachability`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L200-L230):

- Method: `GET`.
- Target: the resolved Provider `base_url` exactly; it does not append `/models` or a Runtime-specific inference endpoint.
- Request headers: `Accept: */*`, `Accept-Encoding: identity`, and the Provider's optional custom `User-Agent`.
- Authentication: none. It does not send the Provider API key or an authorization header.
- Body: it does not consume the response body. Completion is measured when response headers arrive, so latency is TTFB.

The source explicitly explains why it does not derive `/v1/messages`, `/chat/completions`, or another API path in [`resolve_base_url`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L159-L198): any HTTP response is considered enough to prove that the host and gateway are reachable.

### Runtime/provider URL resolution

There is no different probe endpoint for Claude versus Codex. Both use the base URL extracted by their Provider adapter. The same rule applies to Gemini and other adapter-backed applications. OpenCode, OpenClaw, Hermes, Pi, and Claude Desktop have format-specific **base URL extraction**, but the eventual probe remains `GET <base_url>`; see the match in [`resolve_base_url`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L168-L197).

Official-category Providers are excluded because their URL may be intentionally empty or OAuth-derived. Individual resolution returns an error, and batch checks skip them; see [`resolve_base_url`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L165-L173) and [`stream_check_all_providers`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/commands/stream_check.rs#L73-L80). Copilot is the exception to static extraction: its dynamically resolved OAuth API endpoint is passed as a base URL override, but it is still probed with the same unauthenticated `GET`; see [`resolve_copilot_base_url_override`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/commands/stream_check.rs#L129-L158).

## Success and failure classification

[`build_result`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L232-L263) maps every response returned by `reqwest` to `success: true`. The repository has an explicit regression test covering `200`, `401`, `403`, `404`, `429`, `500`, and `503`, all of which must be reachable/successful: [`test_build_result_any_http_status_is_reachable`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L432-L442).

Failure is limited to request errors without an HTTP response. [`map_request_error`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L273-L285) gives special messages to timeouts and connection errors and otherwise forwards the `reqwest` error string. It does not classify authentication, rate limiting, bad paths, or upstream server errors as failures.

There is no fallback probe. CCSwitch performs the same base URL probe on each attempt. It retries only when the error message contains `timeout`, `timed out`, or `abort`; DNS and connection-refused errors return immediately. The default configuration is an 8-second per-attempt timeout with one retry and a 6-second degraded-latency threshold; see [`StreamCheckConfig::default`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L38-L60) and [`check_with_retry`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/services/stream_check.rs#L84-L118). These values are globally configurable in the current UI: [`ConnectivityCheckConfigPanel`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src/components/usage/ConnectivityCheckConfigPanel.tsx#L15-L61).

## Redirect behavior

CCSwitch uses its shared `reqwest::Client` and does not set a redirect policy in [`build_client`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src-tauri/src/proxy/http_client.rs#L215-L227). The pinned backend dependency is `reqwest` 0.12.28. Its first-party source documents that the default policy follows up to 10 redirects: [`ClientBuilder::redirect`](https://github.com/seanmonstar/reqwest/blob/v0.12.28/src/async_impl/client.rs#L1380-L1389).

This makes redirects part of the reachability result. A redirect to an SSO/login page can finish as `200`, while an unfollowed redirect would also count as success because `3xx` is still an HTTP response. CCSwitch neither verifies that the final URL remains on the Provider origin nor checks the response media type or body shape.

## Reproduction for the reported URL

At research time, requesting `https://zode.qa.qima-inc.com/api/proxy/forwar` returned an initial `302` to the Qima CAS login flow. Following redirects produced a final `200` after two redirects. Under CCSwitch's implementation this URL is necessarily reported as reachable:

1. With its default client, redirects are followed and the final `200` is success.
2. Even with redirects disabled, the initial `302` would still be success because all HTTP statuses are accepted.

This behavior is deliberate. The backend module states “reachable does not mean correctly configured” at its top-level documentation, and the settings UI repeats that any response counts as reachable and does not guarantee authentication or model configuration: [`ConnectivityCheckConfigPanel`](https://github.com/farion1231/cc-switch/blob/f3b18df12007d0fd79fd8ad8d310880664015197/src/components/usage/ConnectivityCheckConfigPanel.tsx#L88-L97).

## Implication for Foundry

CCSwitch provides useful precedent for a narrowly named host/gateway reachability indicator, but it is not precedent for Foundry's current **Test connection** requirement. Foundry's requirement is stronger: a wrong saved path and invalid credentials must fail. Satisfying that requirement requires validating a Provider API endpoint and controlling redirects; falling back to “any response from the saved Base URL means success” recreates the exact false positive observed here.
