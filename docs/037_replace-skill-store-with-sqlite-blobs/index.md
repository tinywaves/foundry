# Replace the Skill Store with SQLite BLOBs

## Status

`completed`

## Goal

Replace filesystem-backed Store working copies, Revisions, observations, and Distribution history with one current encoded content payload per Skill Package and one current Distributed Fingerprint per Skill Installation.

## Context

Use the repository-level [Skills domain language](../../CONTEXT.md) and these current decisions:

- [ADR 0002: Separate Skill Identity from Sources](../adr/0002-separate-skill-identity-from-sources.md)
- [ADR 0005: Store Current Skill Content in SQLite](../adr/0005-store-current-skill-content-in-sqlite.md)

Plans 033, 034, 035, and 036 remain historical implementation records. This plan supersedes their filesystem Store, Revision, content-observation, Watch Session, persistent Update Candidate, Distribution Record, drift-resolution, Store repair, and Target recovery decisions.

## Model

Each Skill Package owns one current versioned ZIP BLOB and one logical Content Fingerprint in SQLite. Package metadata remains queryable without selecting the BLOB. Local Package content is an import snapshot. A Remote Update replaces the BLOB and current Source facts atomically, leaves Installations untouched, and uses last-write-wins semantics.

Each active Skill Installation owns one Distributed Fingerprint. Equality with its Package's current fingerprint means no Distribution is needed; inequality means the Store content has not yet been distributed. This relationship trusts Foundry's previous write and never inspects Target bytes. `Import Existing` is the only Target discovery scan and runs only after its existing user action.

Content is encoded as a deterministic standard ZIP with normalized timestamps and sorted paths. The logical fingerprint covers relative paths, entry kinds, regular-file bytes, symbolic-link targets, and executable bits rather than ZIP container bytes. Package roots that are symbolic links are resolved and materialized; symbolic links inside the resolved tree remain link entries. Decoding rejects unsafe paths, duplicate paths, unsupported entry kinds, malformed Unix modes, CRC or size mismatches, more than 20,000 entries, or more than 64 MiB of uncompressed content.

## Migration Evidence

The live version-7 Store contains 214 active Packages, 214 Revisions, 503 active Installations, and 506 Distribution Records. Every Package has exactly one Revision, every Working Copy and Revision is present, and all recorded and physical fingerprints agree. There are no trashed or removed Packages, orphaned Store paths, or incomplete operation directories. Every Package therefore has one unambiguous current tree, and every Installation has a latest Distribution Record that can initialize its Distributed Fingerprint.

## Delivery Rules

- Keep BLOB encoding, decoding, filesystem traversal, and SQLite access in the main process. Renderer and preload contracts use Skill IDs, Target IDs, validated relative paths, metadata, and bounded file content only.
- Keep list and navigation queries metadata-only. Reading a file, exporting, updating, or distributing one Package may decode only that Package.
- Treat Store Corruption as an operation error. Return one stable error code and let the renderer offer Delete or Dismiss without persisting a health state.
- Prepare and verify complete BLOB or Target staging before replacing current state. Commit Store metadata and content in one SQLite transaction.
- Treat Target projections as disposable. Update an Installation's Distributed Fingerprint only after its Target write succeeds; a failed write remains retryable without compensation or a startup recovery journal.
- Delete a Package by preflighting and presenting every associated Target, removing all Target paths, and committing Installation uninstall plus Store Trash metadata only after every removal succeeds. Missing paths are successful on retry.
- Keep remote acquisition containment, network, subprocess, archive, and source-validation protections. Source-specific limits may remain stricter than the Store codec limits.
- Preserve main, preload, renderer, and shared-contract boundaries. Follow `AGENTS.md` verification and visual-acceptance rules.

## Scope

- Versioned deterministic Skill Package ZIP codec and logical fingerprint v2.
- SQLite schema and one-time filesystem-to-BLOB migration with a pre-migration database backup.
- Current-content Store import, remote update, file read, export, logical Trash, and removal workflows.
- Distributed Fingerprint persistence, manual Import Existing, simplified Distribution and Uninstall, and delete-all-target preflight.
- Shared contracts, IPC/preload methods, renderer queries, Store/detail/Target views, update flow, and Store Corruption dialog.
- Removal of obsolete coordinators, tables, filesystem roots, contracts, UI states, tests, and documentation pointers.

## Out of Scope

- CLI behavior or interaction design.
- Store content encryption, signing, confidentiality, or defense against malicious same-user tampering.
- Skill Revision history, rollback, local editing, local refresh, checkout, Promote to Store, Store repair, Store audit, or physical BLOB deletion.
- Target drift, Target content observation, page-scoped Watch Sessions, automatic discovery, scheduled update checks, automatic updates, or automatic Distribution.
- Persistent Target replacement rollback, compensation, operation journals, or startup recovery.
- Renderer component tests, DOM assertions, visual automation, screenshots, accessibility-tree inspection, or desktop automation.

## Tasks

- [x] [Task 001: Build the Versioned Skill Package Codec](./task001_build-the-versioned-skill-package-codec.md)
- [x] [Task 002: Migrate Skill Content and Persistence](./task002_migrate-skill-content-and-persistence.md)
- [x] [Task 003: Simplify Store Import and Remote Update](./task003_simplify-store-import-and-remote-update.md)
- [x] [Task 004: Simplify Installation and Deletion Workflows](./task004_simplify-installation-and-deletion-workflows.md)
- [x] [Task 005: Align the Skills UI and Complete Verification](./task005_align-the-skills-ui-and-complete-verification.md)

## Verification Results

Completed on 2026-08-20:

- `pnpm test`: 58 test files and 254 tests passed.
- `pnpm typecheck`: passed for main/preload and renderer projects.
- `pnpm lint`: passed with configuration deprecation notices only.
- `pnpm build`: passed for main, preload, and renderer bundles.
- `git diff --check`: passed.
- Static searches found no obsolete Store or Target state-machine surface outside the intentional version-7 migration schema. Remote acquisition recovery and Source revision fields remain because they model bounded staging cleanup and upstream identity, not Store or Target observation.
- Visual verification remains user-owned under the repository workflow; no Electron instance or visual automation was launched.
