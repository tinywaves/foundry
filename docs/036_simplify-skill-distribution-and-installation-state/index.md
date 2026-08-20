# Simplify Skill Distribution and Installation State

## Status

`completed`

## Superseded Decisions

[Plan 037](../037_replace-skill-store-with-sqlite-blobs/index.md) replaces current Store-to-Target observation, Distribution Records, verified atomic replacement with compensation, startup recovery, and Installation status presentation. This plan remains the historical record of the previous synchronization model.

## Goal

Make Skill Distribution a predictable desired-state synchronization command and reduce Installation state to the current relationship between Store and Target content.

## Context

Use the repository-level [Skills domain language](../../CONTEXT.md) and these decisions:

- [ADR 0001: Use a Canonical Skill Store](../adr/0001-use-a-canonical-skill-store.md)
- [ADR 0003: Separate Skill Content from Metadata](../adr/0003-separate-skill-content-from-metadata.md)
- [ADR 0004: Treat Distribution as Target Synchronization](../adr/0004-treat-distribution-as-target-synchronization.md)

Plan 033 established atomic distribution, append-only Distribution Records, and three-way `Store / Distribution Record / Target` state derivation. The resulting `Outdated`, `Drifted`, and `Diverged` labels explain which copy changed after the last Distribution, but Distribution itself treats all three as replacement candidates. Ownership and readability checks also block an explicit Distribution even though its user-facing purpose is to synchronize the selected Store content to the selected Target.

This plan separates current state, historical facts, and command policy. Store and Target observations remain explicit. Current synchronization compares Store directly with Target and reports `Synced`, `Different`, `Missing`, or `Unreadable` without using a Distribution Record as a third state input. Distribution Records remain append-only history linked to exact Skill Revisions.

Distribution resolves the destination owned by the selected Skill's Distribution Name or existing Installation location. An absent destination is installed, an available destination with the same fingerprint requires no file replacement, and every other existing destination is atomically replaced. Existing Installation identity, unmanaged content, and unreadable destination bytes do not block the command. When another active Installation occupies the destination, its history remains retained while its active lifecycle ends in the same metadata transaction that creates the replacement Installation.

## Delivery Rules

- Preserve Store readability, Target resolution and writability, path containment, duplicate physical Target detection, verified staging, atomic rename, compensation, and startup recovery.
- Treat file replacement and Installation metadata reconciliation as one recoverable operation boundary.
- Recheck destination operation and active occupant immediately before applying a synchronization.
- Use current Store and Target observations for synchronization state; keep Distribution Records out of state derivation.
- Derive renderer labels and management actions from current observations and synchronization state without restoring old change-origin categories.
- Preserve main, preload, renderer, and shared-contract boundaries.
- Follow the repository verification policy and leave visual acceptance to the user.

## Scope

- Shared Installation synchronization contract and pure derivation.
- Distribution preflight and apply behavior for install, no-file-change, and replace outcomes.
- Transactional retirement of a displaced Installation while retaining its Distribution Records.
- Restore behavior for unreadable or different target content.
- Renderer status, action availability, preflight feedback, and pure model tests.
- Skills glossary, ADR, completed plan history corrections, and Plan 036 task documents.

## Out of Scope

- Automatic or background Distribution.
- Removing Distribution Records or Skill Revisions.
- Changing Store import identity, source acquisition, update checks, Trash, or Discovery Scan policy.
- Removing path containment, target writability, staging verification, compensation, or recovery.
- Automatically deleting displaced content outside the synchronized destination.
- Renderer component, DOM, screenshot, accessibility-tree, or visual automation tests.

## Tasks

- [x] [Task 001: Simplify Installation Synchronization State](./task001_simplify-installation-synchronization-state.md)
- [x] [Task 002: Make Distribution Converge Target Content](./task002_make-distribution-converge-target-content.md)
- [x] [Task 003: Align Skills Presentation and Complete Verification](./task003_align-skills-presentation-and-complete-verification.md)
