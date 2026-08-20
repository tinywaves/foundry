# Task 003: Simplify Store Import and Remote Update

## Status

`completed`

## Goal

Make current SQLite content the only Store authority for import, read, export, remote update, Trash, and removal.

## Dependencies

Tasks 001 and 002.

## Work

Replace filesystem-oriented Store and metadata coordination with a current-content repository and narrowly owned application services. Package list and detail metadata queries must select no BLOB bytes. Add and Automatic Import resolve the selected package root, encode and validate it before opening a transaction, and insert identity, metadata, current content, and Source facts atomically. Preserve existing identical-content identity and multi-Source behavior unless a focused test proves the old result depended on a removed Revision or observation concept.

Read-only Files views inspect the selected BLOB and return bounded entry metadata or one bounded file body through the existing constrained IPC boundary. Export decodes into a user-selected destination through verified staging. Remove Reveal in Finder for Store content because no stable Store directory exists. Local Packages remain import snapshots with no Edit, Refresh, replacement, or Promote workflow.

Keep Update Check user-initiated and metadata-only, but return its Update Candidate directly to the current renderer request instead of storing it. Apply Update receives the selected Source and exact resolved remote revision, re-resolves that immutable content, encodes it, and atomically replaces Package BLOB, fingerprint, manifest-derived metadata, and current Source facts. It does not create history or touch Installations. Store writes use last-write-wins semantics.

Decode and fingerprint every selected BLOB before file read, export, and Distribution handoff. Map malformed ZIP or fingerprint mismatch to one `store-corrupt` error without writing a health status. Remote Update may replace corrupt current content because it does not need to decode the old BLOB.

Reduce Trash to Package lifecycle metadata. Store Deletion and Restore from Trash change timestamps after Task 004 has satisfied Target preconditions; Restore never recreates Installations. Remove from Foundry sets `removed_at` and retains metadata, Sources, and BLOB indefinitely. Remove old Store path ownership, Revision creation, Store reconcile, promotion, repair, content-operation markers, and physical Trash movement.

## Acceptance Criteria

- [x] Store list and metadata detail queries do not select, decode, fingerprint, or scan content.
- [x] Local, discovered, Git, ClawHub, and directory-mediated imports commit one validated current BLOB with existing identity semantics.
- [x] Files and Export read only the selected BLOB and expose no arbitrary SQLite or filesystem access to the renderer.
- [x] Update Candidates disappear on reload, and Apply Update commits current BLOB and Source facts without creating a Revision or Installation mutation.
- [x] Every BLOB consumer reports the same `store-corrupt` error for malformed or mismatched content.
- [x] Trash, Restore, and Remove from Foundry are metadata-only after Target preconditions and never delete a BLOB.
- [x] Obsolete Store filesystem, Revision, promotion, repair, observation, and recovery code and tests are removed.

## Verification

- Focused tests for Store repository, import coordinators, file access, export, remote providers, Update Check, Apply Update, Trash, and corruption mapping.
- `pnpm test`
- `pnpm typecheck:node`
- `pnpm lint`
