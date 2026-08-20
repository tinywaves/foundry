# Task 004: Simplify Installation and Deletion Workflows

## Status

`completed`

## Goal

Treat Targets as stable, disposable projections and make Distribution, Uninstall, Import Existing, and Store Deletion depend only on explicit user operations.

## Dependencies

Tasks 001 through 003.

## Work

Reduce Installation persistence and shared views to active location identity plus Distributed Fingerprint. Compare that stored fingerprint with current Store content to derive whether Distribution is needed. Remove Target observations, sync-status derivation, Distribution history, missing or unreadable state, drift actions, and filesystem re-observation from list and detail queries.

Keep the existing `Import Existing` action as the only Discovery Scan trigger. Scan all enabled Targets only after that action, resolve allowed root symbolic links, encode newly discovered entity trees through the Store service, and create Installations whose Distributed Fingerprint equals the imported BLOB. Ignore already known Installations rather than observing their content. Remove page-scoped Watch Session IPC, filesystem watchers, watch-path resolution, and associated startup or disposal work.

Distribution reads and verifies only the selected Store BLOB. Prepare a complete sibling staging directory, enforce Target resolution, writability, containment, duplicate-physical-target, and destination-path safety, then replace the destination. Do not fingerprint the existing destination, create a backup, compensate a failed replacement, write an operation marker, or recover it at startup. Update Installation metadata only after the final path is ready. A failure after destination removal may leave the projection missing; a repeated Distribution recreates it.

Uninstall removes one Target path and then marks its Installation inactive. Store Deletion first returns a preflight containing every active Installation's Target name, path, and removable or already-missing result for renderer confirmation. Apply removes every listed Target; missing paths count as success. If any removal fails, commit no Installation or Package lifecycle metadata and return per-Target failures. A retry naturally skips paths already absent. When all removals succeed, one SQLite transaction marks every Installation inactive and moves the Package to Foundry Trash.

Delete physical target paths without decoding Store content so Store Corruption never prevents deletion. Restore from Trash reactivates only the Package. Remove from Foundry remains logical and has no Target work because Store Deletion already removed every active Installation.

## Acceptance Criteria

- [x] Installation currentness is a database fingerprint comparison and performs no Target I/O.
- [x] Page entry starts no discovery, observation, hashing, or filesystem watcher work.
- [x] `Import Existing` remains user-triggered, imports root-link entity content, and does not reconcile known Installation bytes.
- [x] Distribution uses verified staging and environmental path checks but has no content preflight, backup, compensation, operation marker, or startup recovery.
- [x] Remote Update changes Installation currentness without touching any Target.
- [x] Delete preflight lists every affected Target; partial removal preserves Store metadata and is idempotently retryable.
- [x] Successful Store Deletion removes every active Target before atomically updating Installation and Trash metadata.
- [x] Focused tests cover install, already-distributed, redistribution, replacement failure, retry, standalone Uninstall, manual import, root symlink import, and multi-Target partial deletion.

## Verification

- Focused Installation repository, Discovery, Distribution, Uninstall, and Store Deletion tests.
- `pnpm test`
- `pnpm typecheck:node`
- `pnpm lint`
