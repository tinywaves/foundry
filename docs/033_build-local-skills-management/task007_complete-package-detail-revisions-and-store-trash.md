# Task 007: Complete Package Detail, Revisions, and Store Trash

## Status

`completed`

## Goal

Complete local Skills management with package inspection, immutable revision visibility, installation history context, and recoverable Store Deletion.

## Dependencies

Tasks 001 through 006.

## Work

Add full-window or appropriately framed package detail routes with Overview, Files, Revisions, Installations, and Sources tabs. Overview shows stable Skill ID, Distribution Name, current Store observation, current fingerprint abbreviation, and timestamps without making quality claims. Sources identifies a package with no remote sources as Local Package and contains no remote add/update controls in this plan.

Files returns a bounded, sorted, read-only relative tree from the main process. Preview exact `SKILL.md` source text and other eligible text files only after an explicit selection. Identify binary, oversized, symbolic-link, missing, and unreadable entries without attempting to render them. Reveal in Finder resolves the active package by Skill ID in the main process. Foundry provides no editor and does not attempt to mediate changes made by an external editor.

Revisions lists immutable snapshots newest first with revision sequence, reason, fingerprint abbreviation, and timestamp. The user may inspect a revision's bounded file tree and text content through revision ID plus relative path. Distribution Records shown from Installations identify the exact revision baseline and distribution time. No revision edit, delete, retention limit, diff, branch, or rollback-to-Store command is added unless it is expressed through the already approved Promote or distribution workflows.

Implement Store Deletion only when the package has no active installations. Move its current working copy and complete revision directory into operation staging, atomically place them under `trash/<skill-id>/`, then mark package metadata trashed. If a package is already missing or unreadable, preserve metadata and require an explicit, narrowly described recovery choice instead of silently discarding history.

Add a Store Trash view with package identity, Distribution Name, deletion time, and content availability. Restore moves package content and revisions back to canonical paths and reactivates the same Skill ID without creating a revision. Remove Permanently and Empty Trash require confirmation, delete only ID-resolved Foundry Trash paths, and then make metadata inaccessible through product APIs. Trash never expires automatically.

Use operation-owned staging and recovery markers for delete, restore, and permanent removal. Reconcile interrupted actions on startup without touching active package paths or arbitrary user directories. Log stable IDs and operation outcomes only.

Complete navigation, query invalidation, empty/loading/failure states, and direct command feedback. Package disappearance during viewing returns to Store with one clear notification. Preserve cached readable metadata when a refresh fails.

Add filesystem and repository tests for detail reads, link containment, binary/size classification, revision immutability, deletion guards, complete package/history moves, restore identity, permanent removal, empty Trash, missing/unreadable packages, compensation, and restart recovery. Pure renderer tests cover tabs, route helpers, action availability, and cache lifecycle without importing UI modules.

Perform final static inspection against the parent plan and `AGENTS.md`: no background watcher, no remote adapters, no project scan, no audit labels, no Detach, no arbitrary renderer filesystem access, and no visual automation.

## Deliverables

- Package detail with Overview, Files, Revisions, Installations, and local Sources presentation.
- Read-only bounded current and revision file inspection.
- Reveal in Finder for Store content.
- Guarded Store Deletion and non-expiring Foundry Trash.
- Restore, permanent removal, Empty Trash, and recovery tests.

## Acceptance Criteria

- [x] Package detail exposes current content, immutable revision context, and installation baselines without editing or quality claims.
- [x] File reads are bounded, ID-based, relative, containment-checked, and never follow symbolic links.
- [x] Store Deletion is blocked until every installation is uninstalled and then moves both working content and revision history to Trash.
- [x] Trash restore preserves the same Skill ID and revision history without creating a revision.
- [x] Permanent removal and Empty Trash affect only explicit Foundry Trash identities after confirmation; no automatic expiry exists.
- [x] Interrupted Trash operations are recovered or surfaced without deleting arbitrary or active content.
- [x] The complete local lifecycle works without remote access, project scanning, a daemon, audit behavior, Detach, or an embedded editor.
- [x] All focused tests, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass without launching or visually automating the application.

## Out of Scope

- Remote Sources and Discover Skills.
- Revision diffing, revision deletion, Store rollback, embedded editing, export, and sharing.

## Handoff

After this task is accepted, create a separate plan for Git/GitHub, ClawHub, and `skills.sh` discovery plus manual update checks. Reuse Skill identity and revision boundaries without coupling remote retrieval to target distribution.

## Verification

- Package detail, current and revision file inspection, installation baselines, local Sources, and Store row navigation are implemented under the page-scoped Skills route.
- Store Trash supports guarded deletion, same-ID restoration, permanent removal, partial Empty Trash results, operation compensation, and startup recovery.
- Structured file reads distinguish text, binary, oversized, symbolic-link, missing, and unreadable content.
- Focused recovery tests cover metadata failures, committed cleanup failures, partial pre-commit movement, and ambiguous marker preservation.
- `pnpm test` passed 51 test files and 262 tests.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
- Per `AGENTS.md`, Electron and visual automation were not run.
