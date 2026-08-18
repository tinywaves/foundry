# Task 002: Build the Canonical Store and Import Lifecycle

## Status

`completed`

## Goal

Own Skill content under `~/.foundry/skills-store/` and make local import, content de-duplication, Store observation, and immutable revision creation recoverable.

## Findings

- Content Fingerprints frame entry kind, normalized relative path, regular-file bytes, symbolic-link target text, and empty directories with deterministic byte ordering; timestamps and linked target bytes are excluded.
- File content and manifest frontmatter reads use no-follow file handles. Malformed or unavailable frontmatter never changes package recognition and falls back to the source directory name.
- Import and revision mutations use private operation markers, verified staging copies, atomic renames, immediate SQLite transactions, and path-ownership-aware compensation.
- Startup recovery removes abandoned private staging, rolls back verified uncommitted content, completes committed operations, and preserves ambiguous paths for recoverable operator attention.
- External Store edits update the Store Working Copy observation but do not create revision history. Explicit revision boundaries reuse an existing snapshot when the fingerprint already exists.
- Import mutations are serialized so concurrent discovery of identical content resolves to one active Skill ID.

## Dependencies

Task 001.

## Work

Create a Skills-owned filesystem layer under `src/main/skills/` with separate responsibilities for package traversal, deterministic fingerprinting, physical copy operations, Store paths, SQLite metadata, and cross-resource coordination. Resolve the Store root from the user home passed by `FoundrySubsystem`; never depend on the process working directory.

The fingerprint implementation must traverse without executing or parsing package content. Sort normalized relative paths, frame entry kind and byte lengths, hash regular-file bytes, record symbolic-link target text without following it, and include empty directories. Reject traversal that escapes the package root and return an unreadable observation when content cannot be inspected completely. Add temporary-directory tests proving determinism across creation order, changes for path/type/bytes/link/empty-directory differences, timestamp independence, and containment.

Initialize `packages`, `revisions`, `trash`, and private staging directories with restrictive normal user permissions. Recognize an import candidate only when its root contains exact `SKILL.md`. Parse frontmatter only as a best-effort source for the initial Distribution Name; recognition and import still succeed when frontmatter is absent or malformed. Fall back to the source directory name and finally a stable safe name derived from the Skill ID when needed for path safety.

Implement import as a coordinated operation:

1. Observe and fingerprint the source.
2. Reuse an active package when the fingerprint is already present.
3. Otherwise assign a Skill ID, copy to operation staging without following links, verify the staged fingerprint, and atomically rename it into `packages/<skill-id>`.
4. Create the initial immutable revision through a second verified staging copy.
5. Commit package and revision metadata in one immediate SQLite transaction.
6. Compensate only operation-owned paths on failure and leave an interruption marker when compensation cannot finish.

On subsystem startup, reconcile private staging markers and metadata-owned paths before accepting mutations. Remove abandoned private staging data, complete or roll back unambiguous interrupted operations, and surface ambiguous content as a recoverable initialization error without deleting user-authored paths.

Implement bounded Store reconciliation for active working copies. Update their latest fingerprint and observation timestamp when readable; mark a package missing or unreadable when it cannot be observed. External edits update the Store Working Copy fact but create no revision. Create or reuse an immutable snapshot only at initial import and at later distribution, promotion, or remote-update boundaries.

Add repository and temporary-filesystem tests for import, duplicate-content reuse, malformed manifests, exact tree preservation, external Store edits, missing and unreadable working copies, revision immutability, failed copies, failed database commits, compensation, and restart recovery.

## Deliverables

- Canonical Store path and content ownership.
- Deterministic package fingerprinting.
- Recoverable local import and content de-duplication.
- Store observation and immutable revision creation primitives.
- Focused SQLite and filesystem behavior tests.

## Acceptance Criteria

- [x] Two imports with identical complete fingerprints resolve to one Skill ID and one canonical working copy.
- [x] Recognition depends only on exact root `SKILL.md`; malformed content does not become a validity failure.
- [x] Store content preserves all package entries and symbolic links without following links during fingerprint or copy.
- [x] External Store edits update the current fingerprint and do not create revision history by themselves.
- [x] Import never leaves a successful database row pointing at absent content, and interrupted operation-owned staging is recoverable on restart.
- [x] Initial import produces one immutable revision whose verified fingerprint equals the Store Working Copy at the boundary.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out of Scope

- Scanning runtime directories or recording installations.
- Distribution and drift resolution.
- IPC, preload, renderer, and remote sources.

## Handoff

Task 003 uses the import coordinator for automatic ingestion from bounded Distribution Targets.

## Verification

- `pnpm test` passed 35 test files and 205 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and all main, preload, and renderer production builds.
- Focused Store tests passed 5 test files and 26 tests.
- `git diff --check` passed.
- The application was not launched and no visual automation was performed.
