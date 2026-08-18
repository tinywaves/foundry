# Task 004: Integrate ClawHub and skills.sh Discovery

## Status

`completed`

## Goal

Provide provider adapters for a real Skill Registry and a replaceable Skill Directory without conflating either with Store identity.

## Dependencies

Tasks 001 through 003.

## Work

Implement a constrained HTTP client and provider adapter interface for browse/search/detail/version resolution. Normalize provider results into renderer-safe summaries with opaque result IDs, source-native identity, canonical web URL, description, publisher, and version facts.

Add ClawHub browse, search, detail, version listing, and exact-version acquisition. Preserve owner-qualified identity, resolve redirects and mutable tags before import, verify a supplied digest, and support a documented GitHub handoff through the Git adapter. Cache public reads for a bounded TTL and honor `429` plus `Retry-After`.

Add `skills.sh` search as an explicitly replaceable Directory adapter. Treat undocumented endpoints as advisory, preserve the canonical listing link, and require a selected result to resolve to upstream Git coordinates before Add to Store. A Directory failure must not affect Git URL import or ClawHub.

## Acceptance Criteria

- [x] ClawHub exact versions are immutable Source revisions and owner-qualified identities do not collide.
- [x] Mutable tags are resolved to an exact version before bytes enter Store staging.
- [x] `skills.sh` never becomes the revision authority or bypasses Git acquisition.
- [x] Provider payloads, redirects, limits, error bodies, and retry hints are bounded and normalized in the main process.
- [x] Provider failures remain isolated and yield actionable, non-sensitive results.

## Out of Scope

- Authenticated publishing, ratings, review, trust labels, and unsupported marketplaces.

## Handoff

Task 005 exposes the implemented source capabilities through Discover Skills.

## Verification

- The provider HTTP client enforces HTTPS host allowlists, manual bounded redirects, request timeouts, bounded JSON bodies, bounded TTL caches, normalized authentication failures, and `429` retry hints.
- ClawHub preserves `ownerHandle/slug` identity, resolves Latest to an exact immutable version, verifies supplied artifact digests, and supports documented GitHub handoff.
- `skills.sh` records directory provenance only and delegates revision resolution and acquisition to the Git Source coordinator.
- Focused provider and HTTP client tests cover owner collisions, mutable-version races, schema drift, response limits, redirects, rate limits, and directory-to-Git handoff.
- Type checking and linting passed.
