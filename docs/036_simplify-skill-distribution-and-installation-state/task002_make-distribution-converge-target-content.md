# Task 002: Make Distribution Converge Target Content

## Status

`completed`

## Goal

Make explicit Distribution converge each selected destination to current Store content without ownership or readability conflicts.

## Work

Change preflight to classify each usable Target destination as `install`, `none`, or `replace`. `none` means the current readable destination already has the Store fingerprint and therefore needs no file replacement. Every other existing destination uses the verified atomic replacement path, including unmanaged content, content associated with another Skill Installation, and content whose fingerprint cannot be read.

Retain only environmental and safety conflicts: disabled, read-only, unavailable, or duplicate physical Targets. Recheck the selected destination and active occupant after staging. A changed destination remains replaceable because the Distribution command owns its desired state, while a changed Target identity or Store fingerprint still aborts.

Extend Installation persistence so a successful synchronization can retire another active Installation at the destination and create the selected Skill's Installation in one SQLite transaction. Preserve the displaced Installation row and Distribution Records as inactive history. A no-file-change synchronization still reconciles metadata and records the exact Revision confirmed by the command.

## Acceptance Criteria

- [x] Missing destinations install current Store content.
- [x] Equal destinations skip file replacement.
- [x] Different, unmanaged, differently associated, and unreadable destinations are replaceable.
- [x] Displaced Installation history remains retained and inactive.
- [x] Store, Target, containment, staging, compensation, recovery, and partial-result protections remain intact.
- [x] Focused tests cover equal, unmanaged, differently associated, unreadable, changed-during-apply, rollback, and concurrency cases.

## Verification

- `pnpm test` passed with 60 test files and 304 tests.
- `pnpm typecheck` passed for the Node and renderer projects.
