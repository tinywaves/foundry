# Task 001: Establish Remote Source Contracts and Persistence

## Status

`completed`

## Goal

Create the provider-neutral domain contracts and transactional metadata foundation required by every remote Skills workflow.

## Dependencies

Local Skills management and its canonical Store, identity, fingerprint, and revision model.

## Work

Extend the shared Skills contract with source providers, source tracking mode, immutable imported revision descriptors, remote result summaries, package candidates, Update Check outcomes, and Update Candidate state. Keep provider payloads and credentials out of renderer-safe contracts.

Add authoritative validators for Git locators, repository-relative package paths, refs, registry coordinates, result IDs, and source/update commands. Remote URLs must use explicitly supported schemes and contain no embedded credentials. Reuse existing safe relative-path and ID rules where semantics align.

Add a transactional SQLite migration for Skill Sources and Update Candidates. Source rows belong to a Skill Package but have their own stable ID and provider-native uniqueness. Persist the last imported immutable revision and content fingerprint separately from a nullable latest checked candidate. Retain source and imported revision facts when a later check becomes unavailable. Use foreign keys and indexes for package Sources tabs, provider lookup, and pending update counts.

Implement a source repository that maps malformed stored rows to stable storage errors, supports atomic attach-or-refresh after import, lists sources by package, records successful and unavailable checks, and clears a candidate only when an explicit application proves which immutable revision was consumed.

## Acceptance Criteria

- [x] Skill ID, source identity, remote revision identity, and Content Fingerprint remain independent.
- [x] Fixed and Tracked Sources are explicit and provider-neutral.
- [x] A source failure cannot remove or corrupt Store content, revisions, installations, or prior provenance.
- [x] Existing schema data migrates transactionally and all new constraints and indexes have focused tests.
- [x] Shared contracts contain no credentials, arbitrary filesystem paths, provider response bodies, or executable commands.

## Out of Scope

- Network access, Git commands, downloads, extraction, IPC, and renderer UI.

## Handoff

Task 002 consumes these contracts to create a bounded acquisition boundary.

## Verification

- Schema version 7 adds normalized Skill Sources and one active Update Candidate per Source while preserving schema version 6 data.
- Source repository tests cover identity reuse, cross-package conflicts, Fixed Source rejection, unavailable checks, stale candidates, explicit application, and corrupt stored metadata.
- Focused tests passed 4 files and 27 tests.
- `pnpm typecheck` and `pnpm lint` passed.
