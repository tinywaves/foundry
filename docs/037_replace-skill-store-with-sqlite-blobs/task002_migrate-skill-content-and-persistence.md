# Task 002: Migrate Skill Content and Persistence

## Status

`completed`

## Goal

Move canonical Skill content into SQLite and reduce Package and Installation persistence to current BLOB and Distributed Fingerprint state.

## Dependencies

Task 001.

## Work

Refactor database initialization so the one filesystem-aware Skills migration can run asynchronously before the Skill subsystem is constructed. Keep ordinary SQL migrations transactional. For a version-7 database with Skill data, create a one-time SQLite online backup beside the live database before changing schema or Store files; abort without modifying either authority when backup or preflight fails.

Preflight every active and trashed Package from its old authoritative tree. Verify its recorded v1 fingerprint, encode the tree with the v2 codec, and retain the prepared BLOB and mapping before opening the final metadata transaction. Treat already removed legacy Packages according to their prior irreversible semantics rather than manufacturing unavailable content. The current audited dataset has no such rows.

Rebuild the Skills schema so each retained `skill_packages` row owns a non-null content-format identifier, versioned Content Fingerprint, and BLOB. Remove Store observation columns and `skill_revisions`. Replace Installation observation columns and append-only `skill_distribution_records` with one versioned `distributed_fingerprint` on each active Installation. Initialize it from the latest Distribution Record: map an old fingerprint equal to the Package's pre-migration current fingerprint to the new v2 fingerprint; retain a non-current legacy fingerprint as versioned v1 so it remains unequal until Distribution. Migrate Source observed fingerprints with the same version-aware rule, and remove `skill_update_candidates`.

Commit all new rows, foreign keys, indexes, and the schema version in one immediate SQLite transaction. A failed transaction leaves the old database and filesystem Store authoritative. After commit, remove the obsolete `packages`, `revisions`, Trash content, and Store-operation trees. Cleanup failure does not invalidate committed BLOBs; retry cleanup on a later startup by checking only the known legacy roots, without adding a runtime migration-status state machine.

Update schema tests for fresh databases and migration fixtures. Cover backup failure, corrupt or changed legacy content, absent legacy paths, a non-current Installation baseline, transaction rollback, post-commit cleanup failure, and idempotent restart. Include an audited-shape fixture with one current Revision per Package and multiple historical Distribution Records per Installation.

## Acceptance Criteria

- [x] A fresh database contains the final current-content schema and none of the removed tables or observation columns.
- [x] Existing active and trashed content is encoded and verified before any authoritative metadata changes.
- [x] Migration creates a recoverable database backup and leaves the old Store untouched on every pre-commit failure.
- [x] The final transaction preserves Skill IDs, Source IDs, Target IDs, Installation IDs, lifecycle timestamps, and current Source facts.
- [x] Latest Distribution facts become version-aware Distributed Fingerprints without retaining history.
- [x] Committed BLOBs remain usable when legacy-directory cleanup is interrupted, and restart cleanup is idempotent.
- [x] Migration tests account for every retained or deliberately discarded legacy field and table.

## Verification

- `pnpm test -- src/main/storage/foundry-database.test.ts src/main/storage/skill-schema.test.ts`
- Focused migration integration tests using temporary databases and Store roots.
- `pnpm typecheck:node`
- `pnpm lint`
