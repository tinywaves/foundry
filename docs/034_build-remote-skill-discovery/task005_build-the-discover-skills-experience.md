# Task 005: Build the Discover Skills Experience

## Status

`completed`

## Goal

Add a focused Discover Skills route for Git resolution, ClawHub discovery, `skills.sh` discovery, source details, and Add to Store.

## Dependencies

Tasks 001 through 004.

## Work

Run the Astryx discovery workflow before renderer implementation and record the selected shell, navigation, search, list, loading, empty, failure, and dialog components in Findings.

Add Discover Skills under the existing Skills route boundary so its presence starts the normal page-scoped Watch Session but no remote work starts automatically. Provide source selection, explicit searches, Git URL/ref resolution, recognized package selection, exact registry version selection, canonical external links, and Add to Store progress and result feedback.

Use stable opaque result IDs between resolution and acquisition; provider coordinates returned for display never authorize a write. Make duplicate-content reuse explicit in the success result. After Add to Store, invalidate Store and package Source queries but never offer direct target distribution from a remote result.

Implement pure renderer models for query normalization, search state, version/ref choice, result grouping, stale result invalidation, and Add to Store outcomes. Do not import React or StyleX in tests.

## Acceptance Criteria

- [x] Discover is an implemented destination from Store and supports all three approved entry paths.
- [x] No remote query starts merely by entering Skills or Discover.
- [x] Every result requires Add to Store and no provider writes to a Distribution Target.
- [x] Loading, empty, partial, rate-limited, unavailable, stale-result, reused-package, and success states are represented.
- [x] Renderer access remains typed and purpose-specific with no network, Git, credentials, filesystem paths, or arbitrary URL opening.

## Out of Scope

- Update Checks and source editing.

## Handoff

Task 006 adds update lifecycle commands to package Sources.

## Findings

- Astryx discovery selected the existing Skills shell, a Discover navigation tab, Git/ClawHub/`skills.sh` source tabs, explicit search controls, an edge-to-edge compact Table, and a 760-pixel selection Dialog.
- The implemented composition uses `Toolbar`, `TabList`, `TextInput`, `Table`, `EmptyState`, `Dialog`, `Selector`, `Banner`, and Astryx loading primitives. Remote result rows are not wrapped in Cards.
- Entering Discover mounts no browse, search, detail, resolve, or acquisition request. Every remote operation begins from a user command.

## Verification

- Git resolution, ClawHub browse/search/details/version selection, and `skills.sh` search-to-Git resolution are reachable from the implemented route.
- Add to Store accepts opaque result IDs and invalidates the local Skills inventory without exposing direct distribution.
- Pure renderer tests cover normalized search input, search result replacement, version selection, Git ref input, stale failures, reuse outcomes, and success feedback without importing React or StyleX.
- Route tests, type checking, and linting passed.
