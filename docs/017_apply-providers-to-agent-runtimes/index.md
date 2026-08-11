# Apply Providers to Agent Runtimes

## Status

`completed`

## Goal

Enable macOS users to select one runtime-scoped Provider or the official default for each fixed Agent Runtime, review the resulting configuration changes, and safely apply them to Codex Desktop and CLI or Claude Code CLI with a clear Foundry-owned In-use lifecycle.

## Detail

Add a `Runtimes` destination under Agent Runtime that presents fixed Codex and Claude Code entries. Each Runtime shows the last configuration state successfully managed by Foundry, a Provider selector limited to that Runtime, and a separate Apply command. A Runtime with no successful Foundry operation starts as `Not managed by Foundry`; Foundry will not infer a Provider association from existing third-party configuration. Codex configuration planning may still preserve the currently active custom Codex Provider key as the stable configuration slot that Foundry updates, so adopting Foundry does not unnecessarily change the Provider identity stored in existing Codex conversations.

The selector offers matching Providers and `Official Default`. Selecting an option only prepares a target. Apply opens a confirmation dialog that identifies the Runtime, target Provider or official default, affected user configuration, and the fields Foundry will manage. Provider credentials remain masked by default and may be revealed only through an explicit icon action. The selected Provider's persisted connection-test status is visible context but never gates Apply.

A successful custom-Provider application records that Provider as In use for its Runtime and shows an inline `In use` status Token in the Provider card's leading content area. In-use Providers remain editable and testable but cannot be deleted. Display-only edits save normally. When an edit changes Runtime-effective Provider data, the form first saves the Provider and then invokes Apply as a distinct second operation. A save failure prevents Apply. If saving succeeds but Apply fails, the Provider remains saved, the external configuration remains at its previous valid content, the interface identifies the failed stage, and a failure-only Retry Apply action can repeat the second operation.

Applying `Official Default` resets or removes only the configuration fields Foundry owns so the Runtime returns to its official behavior. It does not restore a pre-Foundry snapshot and does not change unrelated fields. Foundry records only its last successful application state and does not continuously monitor, infer, or reconcile changes made by users or third-party tools. A normal-state Re-apply command is intentionally deferred.

Runtime application state and Provider association are persisted in Foundry's existing SQLite database through a dedicated Runtime-owned model rather than a Provider-owned boolean. This represents `Not managed by Foundry`, official default, and one In-use Provider per Runtime without creating synthetic Provider rows. Main-process ownership remains explicit for persistence, configuration inspection, credential access, and native file writes, with only purpose-specific typed capabilities exposed through preload.

The final application step safely updates macOS user configuration for Codex Desktop and CLI, which share Codex configuration layers, and for Claude Code CLI. Every external write preserves unowned fields, creates recoverable backup material, validates generated content before replacement, uses an atomic replacement strategy, and restores the previous valid external content if the file operation fails. Foundry does not terminate or restart either Runtime; success feedback tells the user to reopen the affected Runtime so it loads the new configuration.

## Scope

- Add a `Runtimes` navigation destination and page under Agent Runtime.
- Present fixed Codex and Claude Code Runtime entries.
- Persist Runtime application state and Provider association in the existing Foundry SQLite database.
- Represent `Not managed by Foundry`, official default, and one In-use Provider per Runtime.
- Limit every Runtime selector to Providers belonging to that Runtime and include `Official Default` as a target.
- Separate target selection from the Apply command and require a review-and-confirm step before external changes.
- Preview the affected user configuration and Foundry-managed fields before Apply.
- Detect and reuse an active custom Codex Provider key before falling back to the Foundry-owned `foundry_managed` key.
- Keep API keys masked by default and support explicit, temporary Reveal in the confirmation flow.
- Display Provider connection-test status without making it an Apply prerequisite.
- Mark the successfully applied custom Provider with an inline `In use` status Token.
- Allow Edit and Test Connection for an In-use Provider while preventing its deletion through an authoritative backend rule.
- Save display-only Provider edits without applying Runtime configuration.
- Execute Runtime-effective In-use Provider edits as sequential Save and Apply operations with stage-specific feedback.
- Provide Retry Apply only after a save or selection has reached an Apply failure.
- Restore official Runtime behavior by resetting only Foundry-owned configuration fields.
- Preserve unrelated user configuration during custom Provider application and official-default restoration.
- Back up, validate, atomically replace, and recover external Runtime configuration during Apply.
- Prompt users to reopen affected Runtimes after success without restarting them automatically.
- Verify persistence, configuration planning, lifecycle safeguards, failure behavior, type safety, linting, tests, and the production build.

## Out of Scope

- Linux or Windows Runtime configuration.
- Claude Desktop or Claude Code IDE-specific configuration.
- Separate Codex IDE extension configuration or dedicated IDE acceptance coverage.
- Agent Runtimes other than Codex and Claude Code.
- User-created Agents, profiles, per-project associations, or multiple active Providers per Runtime.
- Detecting whether Codex or Claude Code is installed.
- Inferring a Provider association from configuration that Foundry did not apply.
- Continuous monitoring, drift detection, or reconciliation of third-party configuration changes.
- A normal-state Re-apply command.
- A Provider-card `Use` shortcut.
- Automatically applying Provider edits that affect only display metadata.
- Requiring a successful connection test before Apply.
- Restoring a complete pre-Foundry configuration snapshot.
- Backup history browsing or a manual backup-restoration interface.
- Automatically terminating, restarting, or launching Codex or Claude Code.
- New Runtime discovery, remote model discovery, or remote model validation.

## Decisions

- `Runtimes` is the user-facing destination for applying Providers; Providers remains the configuration inventory surface.
- Codex and Claude Code are the only Runtime entries in this plan and remain aligned with the existing Provider runtime types.
- macOS is the only supported platform for live configuration application in this plan.
- Codex Desktop and CLI are supported through their shared user configuration layers; Claude Code support is limited to its CLI user configuration.
- A Runtime starts as `Not managed by Foundry` until a Foundry Apply or Restore Official Default operation succeeds.
- Runtime application state owns the Provider association; Provider records do not carry an independent `in_use` boolean.
- Foundry reuses its existing SQLite database and does not add another persistence system.
- The selector represents a proposed target, while the separate Apply command owns confirmation and side effects.
- `Official Default` is the selector label, while restoration is expressed as an action in the confirmation flow.
- Cancel and Apply failure preserve the last successfully applied Runtime selection.
- API keys are masked by default, revealed only on explicit request, and re-masked when the confirmation context closes or changes.
- Provider connection-test state is informational and never blocks Save, Apply, or Restore Official Default.
- `In use` is an inline status Token near the Provider identity rather than an overlapping corner decoration.
- An In-use Provider may be edited or connection-tested but may not be deleted.
- Display-only Provider changes use Save; Runtime-effective changes use Save and Apply.
- Save and Apply are intentionally sequential rather than one cross-storage transaction.
- A failed Save stops the workflow before Apply and leaves external configuration unchanged.
- A successful Save followed by a failed Apply keeps the Provider update, preserves the previous valid external configuration, and exposes a failure-only Retry Apply action.
- Retry Apply repeats only the failed application step and is not a general Re-apply feature.
- Restore Official Default resets or removes Foundry-owned fields instead of restoring the configuration captured before Foundry management.
- Codex reuses the current non-built-in `model_provider` key when that key resolves to an explicit custom Provider table; otherwise it uses `foundry_managed`.
- The resolved Codex Provider key comes from each fresh configuration plan rather than SQLite. Foundry does not treat that key as a Provider association or continuously reconcile later third-party changes.
- User and third-party edits to Foundry-owned fields may be replaced by a later explicit Apply or Restore Official Default operation.
- Foundry does not treat the current external file content as the authority for its persisted application status.
- External configuration writes remain main-process capabilities with constrained typed renderer access and no arbitrary path or filesystem exposure.
- Generated configuration must preserve unowned fields and pass validation before atomic replacement.
- Apply failures must leave or restore the previous valid external configuration even when a preceding Provider save remains committed.
- Foundry never logs, reports, or includes plaintext API keys in configuration previews or errors.
- Foundry does not restart Runtime processes; success feedback instructs the user to reopen them.
- Existing Astryx, StyleX, Lucide, React, TanStack Query, SQLite, Electron isolation, and Provider foundations are reused without a new dependency unless a later approved task design establishes a concrete need.

## Tasks

- [x] [Task 001: Establish SQLite Runtime Application State and Provider Guardrails](./task001_establish-sqlite-runtime-application-state-and-provider-guardrails.md)
- [x] [Task 002: Build Runtime Selection and In-use Experience](./task002_build-runtime-selection-and-in-use-experience.md)
- [x] [Task 003: Add Read-only Runtime Configuration Preview](./task003_add-read-only-runtime-configuration-preview.md)
- [x] [Task 004: Enable Safe Runtime Apply and Restore](./task004_enable-safe-runtime-apply-and-restore.md)
