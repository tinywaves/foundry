# Provider model discovery and lifecycle

Status: retained backend decision. The current Web UI and CLI implement Settings;
provider forms described by the earlier UI design are legacy reference, not
current product surfaces.

## Decision

A Provider is a named protocol connection, identified by a stable ID. It stores
the protocol, connection details, credentials, optional avatar, custom models,
and lifecycle metadata. Remote model discovery is a separate request; its results
are not persisted in the Provider record. Only user-entered custom models are
stored. No default Provider is maintained.

Disabling and deleting are logical state changes. The backend prevents these
transitions when retained feature settings reference the Provider ID. The usage
scan currently reads top-level `provider` references in entries under
`settings.features`; it is not a recursive scan of arbitrary settings fields.

## Current backend behavior

- Provider records live in the `providers.json` collection through FoundryStorage.
- Connection and model-discovery APIs remain mounted under `/api/providers`.
- Saving a Provider does not depend on a successful remote model-discovery call.
  The input contract permits an empty custom-model list.
- Stored API keys are returned by the local API. Preserve that contract and keep
  credentials out of logs.

## Historical UI policy

The legacy form fetched models as connection fields changed, disabled saving
while discovery was pending, and required an available remote or custom model.
Custom models provided an offline fallback when discovery failed. These form
constraints are not server validation rules and do not imply that the current
Web UI contains a Provider editor.

See `src/features/providers/contracts.ts`, `service.ts`, `repository.ts`, and
`usage.ts` for the retained implementation.
