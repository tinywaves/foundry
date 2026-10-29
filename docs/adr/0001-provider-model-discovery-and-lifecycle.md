# Provider model discovery and lifecycle

Foundry treats a Provider as a named protocol connection rather than a vendor account. Remote models are fetched for the current form session and are not persisted because availability changes; only user-entered custom models (with an optional display name) are persisted. Provider deletion and disabling are logical state changes, and both are blocked while any application setting references the Provider ID; no default Provider is maintained.

## Consequences

- Provider persistence must distinguish transient fetched models from persisted custom models.
- The form re-fetches models when connection fields change; saving is disabled while the fetch is loading and requires at least one currently available remote or custom model.
- Model discovery failure does not prevent saving a Provider when a custom model is present; a custom model provides the offline fallback.
- Future settings must reference Providers by stable ID so lifecycle checks can prevent dangling usage.
