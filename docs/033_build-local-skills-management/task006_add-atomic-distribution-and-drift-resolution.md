# Task 006: Add Atomic Distribution and Drift Resolution

## Status

`completed`

> Superseded by [Plan 036](../036_simplify-skill-distribution-and-installation-state/index.md) for destination overwrite policy and current Installation Status. Atomic staging, replacement, compensation, recovery, and per-Target result requirements remain in force.

## Goal

Distribute exact Store content to selected Targets, maintain append-only baselines, and provide explicit actions for every changed or missing installation.

## Dependencies

Tasks 001 through 005.

## Work

Add a target mutation coordinator that serializes operations by resolved physical target path and Skill ID. Every command must re-resolve target identity, observe current Store and target content, and repeat conflict and containment checks immediately before mutation. Stale renderer data never authorizes a write.

Implement distribution preflight for one package and multiple selected targets. Detect unreadable or missing Store content, unavailable or non-writable roots, duplicate physical targets, unsafe Distribution Names, existing untracked directories, and different packages occupying the same normalized target name. Return structured per-target conflicts before apply. A same-package Outdated, Drifted, Diverged, Missing, or Synced installation is not a name conflict; the user command determines whether replacing it is allowed.

At apply time, create or reuse an immutable revision matching the current Store fingerprint. For each target independently:

1. Recheck preconditions and current observations.
2. Copy the selected revision to a sibling operation-owned temporary directory without following symbolic links.
3. Verify the temporary copy against the revision fingerprint.
4. Preserve a recoverable operation-owned backup when replacing an existing installation.
5. Atomically rename the verified copy to the final Distribution Name.
6. Append the Distribution Record and update installation observation facts in one SQLite transaction.
7. Remove the temporary backup only after metadata commit; compensate or record recovery work after failure.

Return one result per target so mixed success is explicit. Never report an installation as Synced unless both the final target observation and committed Distribution Record match the exact revision. Never update other installations when Store content changes.

Add constrained API and renderer commands for new distribution, updating an Outdated installation, and these state actions:

- Restore from Store replaces the target with current Store content and records the new baseline.
- Promote to Store snapshots the changed target, atomically replaces the Store Working Copy, updates its current fingerprint, and creates a promotion revision without changing other installations.
- Import as New Skill copies the changed target into a new Skill ID and initial revision while leaving the original installation association unchanged.
- Uninstall removes only the target copy through an operation-owned backup and marks the installation inactive; it retains Distribution Records and never trashes or deletes the Store package.

There is no Detach. Missing installations may be restored from Store or uninstalled. An unreadable target must be re-observed or fail explicitly rather than being mislabeled. External target changes discovered during a Watch Session update facts only and never trigger automatic restoration, promotion, import, or update.

Extend Store and Target views with target selection, conflict presentation, per-target progress, partial results, derived state, and allowed actions. Use a segmented or menu control for option sets, familiar Lucide icons for commands, and confirmation for destructive replacement or uninstall. Keep old installations intentionally Outdated until the user acts.

Test conflict normalization, TOCTOU rechecks, revision reuse, verified staging, atomic replace, compensation, interrupted-operation recovery, partial multi-target success, every `S/D/T` transition, concurrent mutations, and each drift action. Pure renderer tests cover action availability and result aggregation only.

## Deliverables

- Distribution preflight and independently atomic per-target apply.
- Append-only Distribution Records and exact revision baselines.
- Derived installation-state refresh.
- Restore, Promote, Import as New, and Uninstall workflows.
- Conflict, partial-result, failure-recovery, and transition tests.

## Acceptance Criteria

- [x] Every successful target contains bytes matching the recorded revision and has a committed Distribution Record.
- [x] One target failure does not roll back successful independent targets or appear as whole-operation success.
- [x] Existing installations remain Outdated until an explicit user command updates them.
- [x] Known external target edits become Drifted or Diverged without automatic content mutation or new-package creation.
- [x] Same-name different-package conflicts block only the affected physical target and are rechecked immediately before apply.
- [x] Restore, Promote, Import as New, and Uninstall preserve their distinct identities and revision effects; Uninstall retains historical Distribution Records and Detach is absent.
- [x] Interrupted replacements retain enough operation-owned state for bounded startup recovery.
- [x] Renderer access remains ID-based and purpose-specific.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out of Scope

- Automatic distribution, automatic Store updates, remote checks, and remote downloads.
- Store Deletion and Trash.

## Handoff

Task 007 completes package inspection, revision visibility, and the Store-only deletion lifecycle.
