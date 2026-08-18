# Task 007: Harden Remote Boundaries and Complete Verification

## Status

`completed`

## Goal

Complete adversarial coverage, recovery, diagnostics, lifecycle polish, and repository-wide verification for remote Skills.

## Dependencies

Tasks 001 through 006.

## Work

Exercise remote URL parsing, redirects, DNS and connection failures, authentication failures, provider schema drift, rate limits, Git timeouts, cancellation, oversized repositories and archives, archive traversal, symbolic-link containment, digest mismatch, moving-ref races, duplicate content, concurrent imports, update candidate staleness, database failures, and interrupted Store replacement.

Ensure diagnostics contain stable source, package, candidate, and operation IDs plus normalized outcomes, never credentials, credential-bearing URLs, local repository paths, remote response bodies, package contents, or command environment values.

Complete route/query invalidation, package Sources cache lifecycle, provider-isolated retries, operation cancellation, and navigation after package disappearance. Perform a final static inspection for renderer trust-boundary leakage, shell command construction, unsupported providers, background polling, automatic updates, direct remote-to-target distribution, audit language, and visual test imports.

Run focused tests and the complete `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` suite. Per `AGENTS.md`, do not launch Electron or use browser, screenshot, accessibility-tree, or desktop automation.

## Acceptance Criteria

- [x] Adversarial fixtures prove acquisition containment and deterministic resource limits.
- [x] Interrupted acquisition and update operations recover without false source or revision records.
- [x] Provider failures and rate limits are isolated, bounded, and actionable.
- [x] No background, scheduled, automatic download, automatic apply, automatic distribution, audit, or unsupported marketplace behavior exists.
- [x] All focused and repository-wide checks pass without visual automation.

## Out of Scope

- Any provider or workflow excluded by the parent plan.

## Verification

- ZIP fixtures cover redirect validation, digest mismatch, traversal, escaping symbolic links, bounded download and extraction bytes, individual file size, entry count, timeouts, cleanup, and restart recovery.
- Git fixtures cover normalized URL/ref resolution, bounded tree and blob materialization, escaping links, moving-ref races, staging cleanup, and Fixed versus Tracked classification.
- Provider fixtures cover owner-qualified ClawHub identity, exact-version selection, schema drift, mutable Latest races, bounded JSON responses, authentication and rate-limit normalization, retry hints, and `skills.sh` handoff to Git.
- Failed HTTP responses cancel their bodies without exposing provider payloads. Update retries recover when Store promotion committed before Source metadata and reuse the committed revision without creating a duplicate.
- Static inspection found no renderer network, Node, Electron, Git, credential, filesystem-path, or arbitrary URL boundary. Git uses a fixed executable, argument arrays, a constrained environment, and `shell: false`.
- Static inspection found no scheduled or background remote checks, automatic download/apply/distribution, direct remote-to-target path, audit feature, or unsupported provider. Existing timers are limited to Git resource enforcement and page-scoped local filesystem observation.
- Renderer tests remain pure logic tests and do not import React components, routes that load UI, StyleX, Astryx UI modules, DOM helpers, screenshots, or visual automation.
- `pnpm test` passed 59 files and 300 tests.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
