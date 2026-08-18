# Build Remote Skill Discovery

## Status

`completed`

## Goal

Add remote discovery and acquisition to Skills without weakening the canonical Store boundary: users can find or resolve remote Skill Packages, add an exact remote revision to the Store, check tracked sources for updates on demand, and explicitly apply an Update Candidate.

## Context

Use the repository-level [Skills domain language](../../CONTEXT.md), [ADR 0001: Use a Canonical Skill Store](../adr/0001-use-a-canonical-skill-store.md), and [ADR 0002: Separate Skill Identity from Sources](../adr/0002-separate-skill-identity-from-sources.md). The source evidence and v1 boundary are recorded in [Remote Skill Sources](../research/remote-skill-sources.md).

The following decisions are final:

- A remote provider is a Skill Source, never a Distribution Target or Store identity.
- Every remote result uses `Add to Store` before it can be distributed.
- Git is the provenance and acquisition foundation. Normalize repository, package path, requested ref, and immutable resolved commit separately.
- ClawHub is the first Skill Registry. Preserve its owner-qualified identity and exact immutable version.
- `skills.sh` is a replaceable Skill Directory. It locates Git content but does not become the update authority.
- Update Checks are user-initiated, resolve metadata only, and never download or distribute content.
- Applying an Update Candidate is explicit, re-resolves and downloads the selected revision, replaces the Store Working Copy, and creates a `remote-update` Skill Revision. Existing target copies then become Outdated until separately distributed.
- Fixed Sources never produce Update Candidates. Source failures produce an Unavailable Source presentation without affecting local content.
- No background polling, scheduled checks, publisher audit, trust label, compatibility judgment, or automatic update exists.

## Detail

Persist source identity independently from Skill ID and content identity. A source records its provider, native coordinate, canonical web link, normalized acquisition locator, package path, requested moving or fixed reference, latest imported immutable revision, optional artifact digest, observed Foundry Content Fingerprint, and fetch time. Equal imported fingerprints associate provenance with an existing package rather than manufacturing a second package.

Remote network, credentials, Git execution, archive handling, redirects, extraction, and filesystem staging remain in the main process. Acquisition uses bounded private staging, rejects unsafe archive paths and escaping links, never executes package content, requires an exact root `SKILL.md`, computes the normal Foundry fingerprint, and imports through the existing Store coordinator. Renderer APIs accept typed source coordinates and stable result IDs only.

The Discover Skills page provides three concrete entry paths:

1. Paste a Git or GitHub repository/tree URL, optionally select a ref, resolve the repository, and choose among recognized package paths.
2. Search or browse ClawHub, inspect package details and versions, and add one exact version to Store.
3. Search `skills.sh`, open its canonical listing, resolve the selected result to Git coordinates, and use the Git flow for Add to Store.

Update Check compares a Tracked Source's last imported immutable revision with the currently resolved upstream revision. It records a candidate descriptor without downloading package bytes. Apply rechecks the candidate, acquires the exact revision under normal containment limits, and aborts if source identity or resolved revision changed unexpectedly. Applying equal content refreshes provenance facts without creating a redundant revision.

## Scope

- Shared source, discovery result, acquisition, update-check, and update-candidate contracts.
- SQLite migration for remote sources, imported source revisions, and update candidates.
- Bounded acquisition staging, safe Git subprocess orchestration, archive download/extraction, and recovery.
- Git/GitHub URL parsing, immutable revision resolution, recognized package discovery, and Add to Store.
- ClawHub public browse/search/detail/version integration with cache and rate-limit handling.
- Replaceable `skills.sh` search adapter that hands acquisition to Git.
- Discover Skills route, source search, result details, version/ref selection, and Add to Store feedback.
- Package Sources presentation, manual Update Check, explicit candidate application, and source-unavailable states.
- Focused main-process and pure renderer tests plus type checking, linting, production build, and static boundary inspection.

## Out of Scope

- Automatic, scheduled, startup, or background update checks.
- Automatic remote download, Store replacement, or target distribution.
- Publishing, ratings, ownership verification, signing, trust, malware review, audit, compatibility, or execution.
- Well-known discovery, Hermes Hub, Goose, LobeHub, browse.sh, Anthropic Skills API, or authenticated registry accounts.
- Claude, OpenAI, Cursor, Gemini, or other plugin and extension marketplaces.
- Project-local Skills, Store editing, source removal, source reassignment, rollback, or merging different-content packages.
- Renderer network, Git, filesystem, credentials, arbitrary URL fetch, arbitrary command execution, visual automation, or component tests.

## Delivery Rules

- Validate and canonicalize every remote coordinate in the main process. Do not trust provider-returned paths, redirects, filenames, content lengths, media types, or archive metadata.
- Bound request time, redirects, response bytes, extracted bytes, entry count, individual file size, Git object transfer, traversal depth, and subprocess duration. Preserve readable failures without leaking credentials or local paths.
- Use argument arrays with a fixed Git executable and constrained environment; never invoke a shell or execute repository hooks, filters, submodules, LFS smudge commands, package scripts, or imported binaries.
- Stage outside active package and revision paths, verify source digest when supplied, then use existing Store identity, fingerprint, revision, and compensation rules.
- Cache remote browse/search responses only for the interactive session or a bounded TTL. Honor ClawHub `429` and `Retry-After`; surface `skills.sh` instability as an adapter failure with a canonical-link fallback.
- Follow the Astryx discovery workflow before renderer implementation. Use dense rows for discovery results, Tabs or segmented controls for source selection, Lucide icons for commands, and StyleX tokens for owned styling.
- Follow `AGENTS.md` verification policy. Renderer tests cover pure models, validation, routing, query keys, and state transitions only; the user owns visual acceptance.

## Tasks

- [x] [Task 001: Establish Remote Source Contracts and Persistence](./task001_establish-remote-source-contracts-and-persistence.md)
- [x] [Task 002: Build Bounded Remote Acquisition and Recovery](./task002_build-bounded-remote-acquisition-and-recovery.md)
- [x] [Task 003: Add Git Source Resolution and Import](./task003_add-git-source-resolution-and-import.md)
- [x] [Task 004: Integrate ClawHub and skills.sh Discovery](./task004_integrate-clawhub-and-skills-sh-discovery.md)
- [x] [Task 005: Build the Discover Skills Experience](./task005_build-the-discover-skills-experience.md)
- [x] [Task 006: Add Manual Update Checks and Explicit Application](./task006_add-manual-update-checks-and-explicit-application.md)
- [x] [Task 007: Harden Remote Boundaries and Complete Verification](./task007_harden-remote-boundaries-and-complete-verification.md)
