# Task 006: Add Manual Update Checks and Explicit Application

## Status

`completed`

## Goal

Compare Tracked Sources on demand and apply a selected immutable remote revision to Store only after explicit confirmation.

## Dependencies

Tasks 001 through 005.

## Work

Implement provider-neutral Update Check orchestration. Resolve current upstream metadata for one source or all Tracked Sources of a package, compare the immutable revision and known content facts, record Update Candidates or no-update observations, and represent source unavailability without downloading package bytes.

Fixed Sources return a stable not-tracked result. Concurrent checks for the same source coalesce or serialize. Candidate records retain the source revision found at check time and become stale when a later check proves a different upstream revision.

Apply requires an explicit candidate ID, re-resolves its source, rejects unexpected revision movement, acquires the exact immutable revision under normal limits, and atomically replaces the Store Working Copy through existing compensation primitives. Create or reuse a `remote-update` Skill Revision, update provenance in the same lifecycle boundary, and leave installations unchanged so their derived state becomes Outdated when appropriate. Equal content refreshes source facts without manufacturing a redundant revision.

Extend package Sources with per-source state, canonical links, last checked/imported facts, Check for Updates, and Apply Update. Never label an unavailable source as a missing Store package and never imply an update was installed into a runtime.

## Acceptance Criteria

- [x] Update Check performs metadata resolution only and never downloads or distributes content.
- [x] Fixed Sources are excluded and unavailable sources preserve local content and provenance.
- [x] Apply consumes an explicit immutable candidate or fails stale; it never follows an unexpectedly changed moving ref.
- [x] Successful changed content creates a `remote-update` revision and leaves existing installations intentionally Outdated.
- [x] Equal content does not create a redundant Skill Revision.

## Out of Scope

- Scheduled checks, automatic application, automatic target updates, source removal, and rollback.

## Handoff

Task 007 validates recovery, security boundaries, provider failures, and the complete remote lifecycle.

## Verification

- Per-Source checks coalesce, Fixed Sources return without resolution, provider failures record Unavailable, and package checks remain metadata-only.
- Apply re-resolves the selected candidate, rejects moving revisions, materializes the exact revision, promotes through Store compensation, and advances Source facts only after Store commit.
- A Store commit followed by Source metadata failure is retryable and reuses the committed revision without manufacturing a duplicate.
- Package Sources presents Fixed, Current, Update Available, Unavailable, and Not Checked states, canonical opening, per-Source and package checks, imported facts, and an explicit Apply Store Update dialog.
- Apply invalidates Store, package, file, Source, revision, and installation queries. Existing target observations and distribution baselines remain unchanged, so changed Store content derives as Outdated.
- Focused main-process and pure renderer model tests, type checking, and linting passed.
