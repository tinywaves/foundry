# Build Local Skills Management

## Status

`completed`

## Superseded Decisions

[Plan 037](../037_replace-skill-store-with-sqlite-blobs/index.md) replaces this plan's filesystem Store, Skill Revisions, observations, Distribution Records, Watch Sessions, drift workflows, physical Trash, and recoverable Target replacement. The task records below remain the historical account of the original implementation; current Store and Distribution semantics come from Plan 037 and [ADR 0005](../adr/0005-store-current-skill-content-in-sqlite.md).

## Goal

Replace the Skills placeholder with a local-first control plane that imports recognized Skill Packages into one canonical Foundry Skill Store, distributes explicit package revisions to local Distribution Targets, and derives installation state from observed filesystem facts.

## Context

Use the repository-level [Skills domain language](../../CONTEXT.md) for names and state definitions. The following decisions are already final and should not be reopened during implementation:

- [ADR 0001: Use a Canonical Skill Store](../adr/0001-use-a-canonical-skill-store.md)
- [ADR 0002: Separate Skill Identity from Sources](../adr/0002-separate-skill-identity-from-sources.md)
- [ADR 0003: Separate Skill Content from Metadata](../adr/0003-separate-skill-content-from-metadata.md)

Use [Agent Runtime Skill Support](../research/agent-runtime-skill-support.md) when implementing built-in target adapters and reserved-path exclusions. Remote discovery belongs to a later plan; its adapter evidence is recorded in [Remote Skill Sources](../research/remote-skill-sources.md).

## Detail

Create the canonical content root at `~/.foundry/skills-store/`. Store current working copies under `packages/<skill-id>/`, immutable snapshots under `revisions/<skill-id>/<revision-id>/`, recoverable deletions under `trash/<skill-id>/`, and incomplete filesystem operations under a private staging directory. Keep Skill files out of SQLite. Use the existing Foundry database for stable identities, Distribution Names, observed fingerprints, revision metadata, target configuration, installation identity, and append-only Distribution Records.

Recognize a Skill Package only by finding an entry named exactly `SKILL.md` at a candidate directory root. Recognition must not parse the manifest as an admission gate and must not produce validity, portability, compatibility, trust, audit, or safety claims. A readable manifest name may initialize the Distribution Name; otherwise use the imported directory name. Later external edits never rename the Distribution Name automatically.

Compute a deterministic SHA-256 Content Fingerprint over the complete package tree. Frame every relative path, entry kind, regular-file byte sequence, and symbolic-link target in sorted order. Include empty directories, ignore timestamps and other incidental filesystem metadata, and never follow a symbolic link while fingerprinting. Use the same implementation for Store working copies, revisions, imports, and target observations.

Persist observations and distribution facts, then derive presentation states. Let `S` be the latest readable Store Working Copy fingerprint, `D` the fingerprint recorded by the latest successful Distribution Record, and `T` the latest readable target copy fingerprint.

| Observed facts | Derived installation state |
| --- | --- |
| `S = D = T` | Synced |
| `T = D` and `S != D` | Outdated |
| `S = D` and `T != D` | Drifted |
| `S != D` and `T != D`, including `S = T` | Diverged |
| Expected target directory is absent | Missing |

An unreadable Store or target copy is an observation failure, not one of these five derived states. Return it explicitly so the interface does not mislabel unknown content. Do not persist `Synced`, `Outdated`, `Drifted`, `Diverged`, or `Missing` as mutable status columns.

Entering any Skills route starts a full Discovery Scan and a temporary Watch Session. Leaving the Skills area ends that renderer-owned session. Watch events are hints that trigger debounced, bounded reconciliation; a full scan remains authoritative. Manual `Import Existing` performs a one-shot scan even when no Watch Session is active. There is no application-start scan, timer, login item, helper process, or background daemon.

Automatically import newly discovered packages without confirmation. When discovery occurs inside a Distribution Target, also adopt that physical copy as a Skill Installation and establish its initial revision as the distribution baseline. If its fingerprint already belongs to an active package, reuse that Skill ID instead of creating duplicate canonical content. A known installation whose target bytes later change remains the same installation and becomes Drifted or Diverged; it is not silently imported as another package.

Distribute physical copies only from the Store. Before mutating a target, re-observe the Store and target, reject name conflicts and unsafe paths, create or reuse the exact immutable revision being distributed, copy to a sibling temporary directory, verify its fingerprint, atomically replace the final directory, and only then append the Distribution Record. Handle each selected target independently so one failure does not roll back successful targets or create a false all-target success.

Never update an existing installation merely because the Store changed. Outdated is informational until the user explicitly distributes the newer Store content. Changed target copies expose Restore from Store, Promote to Store, Import as New Skill, and Uninstall. There is no Detach action. Store Deletion is permitted only when no active installations remain and moves the package plus revision history to non-expiring Foundry Trash.

Build the renderer around Store and Targets views. Store is package-centric and searchable. Targets represent de-duplicated physical roots, not runtime consumption graphs. Package detail exposes Overview, Files, Revisions, Installations, and Sources; Files is read-only and supports `SKILL.md` preview plus Reveal in Finder. Sources may show the package as local in this plan but remote source management remains deferred.

## Built-In Target Set

Implement only global/user targets in this plan. Use adapter-owned resolution and scan boundaries rather than one unrestricted recursive scanner.

- Generic Agent Skills: `~/.agents/skills`, neutral branding.
- Claude Code: `~/.claude/skills`, excluding the runtime-managed `synced` subtree.
- Gemini CLI: `~/.gemini/skills`.
- OpenCode: `~/.config/opencode/skills`.
- Cursor: `~/.cursor/skills`.
- GitHub Copilot: `~/.copilot/skills`.
- Hermes Agent: every resolvable active profile Skill root, preserving runtime metadata exclusions.
- OpenClaw: the active state-directory Skill root, honoring a configured non-default state directory.
- Codex Legacy: `$CODEX_HOME/skills` or its documented default, always excluding `.system`, ordered last, and labeled with an official Legacy hint that links to Codex Skills documentation.
- Custom Target: a user-selected directory with explicit scan depth and access boundary settings.

De-duplicate adapters and custom configuration by resolved physical path. A single physical directory appears once even when more than one runtime can consume it. Do not include goose. Do not scan project-local roots in this plan.

## Scope

- Shared Skill contracts, pure state derivation, validation, and stable error results.
- SQLite schema migration for packages, revisions, targets, installations, distribution records, and custom target configuration.
- Canonical Store filesystem ownership, deterministic fingerprints, immutable revisions, staging, compensation, and startup recovery.
- Built-in global target adapters, custom targets, bounded Discovery Scans, automatic import, and page-scoped Watch Sessions.
- Constrained main-process IPC, preload methods, and change notifications.
- Store search, target inventory, package detail, read-only files, revisions, installations, and Finder reveal commands.
- Atomic multi-target distribution, conflict preflight, state observation, explicit drift resolution, and direct uninstall.
- Recoverable Store Trash with explicit restore and permanent removal.
- Focused main-process and pure renderer tests, type checking, linting, production builds, and static boundary inspection.

## Out of Scope

- Git, GitHub, ClawHub, `skills.sh`, remote update checks, and the Discover Skills page.
- Claude, OpenAI, Cursor, Gemini, or other plugin marketplaces.
- Project-local Skill roots, workspace trust flows, enterprise/admin roots, bundled Skills, plugin-managed Skills, or account-synced Skills.
- A background daemon, application-start scanning, scheduled scans, automatic remote checks, or automatic installation updates.
- Editing Skill files inside Foundry, manifest authoring, compatibility validation, linting, review, audit, trust, signing, or malware analysis.
- Using a package-level symlink or hard link as the installation mechanism, Store-to-target live synchronization, or a Detach lifecycle. Symbolic links contained inside a package remain package content.
- Runtime-consumer graphs for the Generic Target.
- Automatic Trash expiration or automatic permanent deletion.
- New styling systems, renderer filesystem access, arbitrary IPC, visual automation, screenshots, or renderer component tests.

## Delivery Rules

- Preserve the main, preload, and renderer trust boundaries. The renderer may request actions by Skill ID, Target ID, revision ID, and validated relative file path; it never receives an arbitrary filesystem operation.
- Treat filesystem scans as observations that can be stale immediately. Re-observe every mutation precondition in the main process.
- Serialize mutations that touch the same Skill ID or resolved target path. Scans may run concurrently only when they cannot race a mutation against the same content.
- Use operation-specific staging paths and compensating cleanup because SQLite and filesystem renames cannot share one atomic transaction. Startup reconciliation must make interrupted operations observable and recoverable.
- Preserve unknown manifest fields, package resources, scripts, and symbolic links as package content without executing them.
- Follow the Astryx discovery workflow before renderer implementation. Use rows for dense package and installation data, StatusDot or Token for state, Lucide for application-authored icons, StyleX tokens for owned styling, and no visible unfinished controls.
- Follow `AGENTS.md` verification policy. Renderer tests cover only pure models and query behavior; the user owns visual acceptance.

## Tasks

- [x] [Task 001: Establish the Skills Domain and Persistence Foundation](./task001_establish-the-skills-domain-and-persistence-foundation.md)
- [x] [Task 002: Build the Canonical Store and Import Lifecycle](./task002_build-the-canonical-store-and-import-lifecycle.md)
- [x] [Task 003: Add Target Adapters and Local Discovery](./task003_add-target-adapters-and-local-discovery.md)
- [x] [Task 004: Expose Page-Scoped Skills APIs and Observation](./task004_expose-page-scoped-skills-apis-and-observation.md)
- [x] [Task 005: Build the Store and Targets Inventory Experience](./task005_build-the-store-and-targets-inventory-experience.md)
- [x] [Task 006: Add Atomic Distribution and Drift Resolution](./task006_add-atomic-distribution-and-drift-resolution.md)
- [x] [Task 007: Complete Package Detail, Revisions, and Store Trash](./task007_complete-package-detail-revisions-and-store-trash.md)
