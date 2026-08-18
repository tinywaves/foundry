# Task 003: Add Git Source Resolution and Import

## Status

`completed`

## Goal

Resolve Git and GitHub coordinates to immutable commits, discover recognized package paths, and add selected content to the canonical Store with exact provenance.

## Dependencies

Tasks 001 and 002.

## Work

Parse HTTPS, SSH, GitHub repository, and GitHub tree URLs into a normalized remote, optional package path, and optional requested ref without embedding credentials. Resolve a requested branch, tag, or commit to an immutable commit. Treat an immutable SHA as Fixed and a moving branch or tag as Tracked according to explicit user intent.

Acquire with a fixed Git executable, argument arrays, constrained environment, disabled hooks, filters, credential prompting, submodules, and LFS smudge. Bound execution and repository size. Inspect the resolved tree for root `SKILL.md` entries within the configured depth, return stable opaque candidate IDs, and require selection when more than one package exists.

On Add to Store, revalidate the candidate, stage only the selected subtree, compute its Foundry Content Fingerprint, import through the existing Store coordinator, and attach or refresh the Git Source transactionally. Equal fingerprints reuse an existing package while retaining the new provenance.

Expose purpose-specific main-process service operations only after focused resolver, timeout, containment, de-duplication, and compensation tests pass.

## Acceptance Criteria

- [x] A repository/tree URL resolves to one immutable commit before import.
- [x] Multiple recognized package roots require explicit package selection.
- [x] Add to Store creates or reuses canonical content and records exact Git provenance without distributing it.
- [x] Private repositories may use the user's existing Git credential mechanisms without sending secrets through preload.
- [x] Failed resolution or import leaves no source row claiming content that was not committed.

## Out of Scope

- GitHub code search, automatic updates, and target distribution.

## Handoff

Task 004 routes Directory results through this Git foundation and adds the first Registry.

## Verification

- GitHub repository and tree URLs, slash-containing refs, generic HTTPS/SSH remotes, default refs, and immutable SHA pins resolve separately from Store identity.
- Git content is fetched without checkout and materialized from bounded tree/blob plumbing, with hooks, submodules, and LFS smudge disabled.
- Focused tests cover exact provenance, root and nested packages, safe and escaping links, moving-ref races, Fixed/Tracked classification, and staging cleanup.
- Purpose-specific IPC and preload APIs expose only URL/ref input and opaque candidate IDs.
- Focused tests, type checking, and linting passed.
