# Task 002: Build Bounded Remote Acquisition and Recovery

## Status

`completed`

## Goal

Acquire untrusted remote content into private staging with deterministic limits, containment, verification, cleanup, and restart recovery.

## Dependencies

Task 001.

## Work

Create a main-process acquisition coordinator with explicit policies for redirects, request and subprocess timeouts, response bytes, extracted bytes, entry count, file size, Git transfer, and recognized-package traversal. Treat all remote content and provider metadata as untrusted.

Implement URL download to operation-owned files, optional source digest verification, ZIP extraction with traversal and special-entry rejection, and staging-tree inspection without following symbolic links. Do not execute package content. Preserve package-internal symbolic links only when they remain representable under existing copy/fingerprint rules; never use them to escape acquisition containment.

Use operation markers compatible with the existing Store recovery model. Cleanup uncommitted staging, preserve ambiguous state, and never delete a path that is not both under the remote staging root and owned by the recorded operation.

## Acceptance Criteria

- [x] Oversized, timed-out, redirected-to-unsupported, traversal, special-entry, and digest-mismatch acquisitions fail with stable errors.
- [x] Acquisition never writes directly to active Store, revision, or Distribution Target paths.
- [x] No repository hook, filter, submodule, LFS smudge command, package script, or imported executable runs.
- [x] Interrupted staging is recoverable without deleting user-authored or active package content.
- [x] Focused filesystem and archive fixtures cover adversarial entry names and limits.

## Out of Scope

- Provider-specific search and renderer UI.

## Handoff

Task 003 uses the bounded staging boundary for Git sources.

## Verification

- Remote staging lives under `.remote-operations` and is cleaned only through validated operation markers.
- Streaming fetch and ZIP extraction enforce timeout, redirect, byte, file, entry, path, digest, and special-entry limits.
- Contained symbolic links are preserved; escaping links are rejected without following them.
- Focused acquisition and Store-path tests passed, and type checking and linting passed.
