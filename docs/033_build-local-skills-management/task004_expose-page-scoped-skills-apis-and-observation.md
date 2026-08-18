# Task 004: Expose Page-Scoped Skills APIs and Observation

## Status

`completed`

## Goal

Integrate the Skills subsystem with Foundry lifecycle and expose only purpose-specific list, scan, session, file-read, and reveal capabilities to trusted renderer frames.

## Findings

- `SkillSubsystem` initializes independently after the shared database is available, maps storage or filesystem initialization failures to the Skills API, and does not start a watcher during application startup.
- The preload exposes one typed `skills` object. Every command uses a purpose-specific channel and stable IDs or validated relative paths; it exposes no Electron object, arbitrary IPC method, absolute-path mutation, or generic shell capability.
- A renderer-owned Watch Session performs Store reconciliation and a full Discovery Scan before returning. One shared `chokidar` watcher is reference-counted across windows, and owner destruction, final-session end, or subsystem disposal closes it.
- Watch events are debounced and coalesced into bounded authoritative observations. Renderer notifications contain only a reason and monotonic sequence number.
- Package file listing never follows symbolic links. Text reads reject unsafe paths, symbolic-link traversal, non-regular files, invalid UTF-8, oversized content, and Store package roots replaced by links.
- Custom directory selection produces an opaque, window-owned, single-use candidate. Creation revalidates the selected directory's physical identity and never accepts a renderer-supplied absolute path.
- Inventory DTOs expose current Store and target observations plus installation states derived from the latest Distribution Record instead of persisting mutable state labels.

## Dependencies

Tasks 001 through 003.

## Work

Add `SkillSubsystem` beside the existing Prompt, Provider, Runtime, and Settings subsystems. Initialize it with the shared database or mapped storage error plus the user home directory. Register trusted windows, clean window-owned sessions when their `webContents` is destroyed, dispose handlers and filesystem watchers during shutdown, and leave unrelated subsystems available when Skills initialization fails.

Add a `SkillIpcController` using the established trusted-main-frame checks and discriminated result mapping. Extend `FoundryApi`, preload implementation, and preload declarations with a narrow `skills` surface. The initial surface must support:

- List and get active Store packages.
- List targets and installations with derived observation state.
- Run `Import Existing` as a one-shot Discovery Scan.
- Begin and end a renderer-owned Watch Session.
- Subscribe and unsubscribe to a payload-minimal `skills:changed` notification.
- List a package's relative file tree and read one validated regular text file within bounded size limits.
- Reveal a package or target selected by stable ID through the main process.
- Add, update, and remove custom target configuration through a controlled directory-picker workflow.

Do not accept arbitrary absolute paths from renderer calls. The directory picker returns an opaque candidate to the main process for validation and persistence. File reads accept a Skill ID plus normalized relative path, re-resolve containment, reject symbolic-link traversal and non-regular files, and apply content-size bounds. Reveal commands resolve IDs to known paths and use Electron `shell.showItemInFolder`; they never expose a generic shell method.

Implement one shared watcher coordinator backed by per-renderer session tokens. The first active session starts root and Store observation; the last ending session stops it. Watch only resolved Store and enabled target boundaries or the nearest safe parent needed for a currently absent root. Debounce bursts, coalesce overlapping paths, and invoke the same authoritative reconciliation used by one-shot scans. A watch error emits a bounded change notification and remains recoverable through the next full scan.

Make session begin perform a full scan before returning its initial result. Handle renderer mount/unmount races: a session token belongs to the requesting main frame, ending is idempotent, and a late begin result can immediately be ended without leaking a watcher. No watch starts at application initialization.

Add static and focused tests for trust checks, storage-failure mapping, session ownership, multi-window reference counting, destroyed-window cleanup, debounce/coalescing, watch shutdown, path containment, read-size limits, and ID-based reveal routing.

## Deliverables

- Skills subsystem lifecycle integration.
- Constrained IPC and preload Skills API.
- Page-owned Watch Sessions and change notifications.
- Safe package-file reads, Finder reveal, and custom target selection.
- Security-boundary and lifecycle tests.

## Acceptance Criteria

- [x] No filesystem watcher exists before a Skills page session begins or after the final session ends.
- [x] Beginning a session performs one authoritative scan, and manual `Import Existing` works without an active session.
- [x] Watch events trigger bounded reconciliation and renderer invalidation without carrying file contents.
- [x] Untrusted frames, foreign session tokens, arbitrary paths, link escapes, oversized reads, and unknown IDs are rejected.
- [x] Skills initialization failure does not prevent unrelated Foundry routes and APIs from starting.
- [x] The renderer receives no Electron object, Node API, raw IPC access, database handle, or generic filesystem/shell capability.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out of Scope

- Distribution and mutation APIs introduced by Task 006.
- Renderer pages and visual presentation.
- Remote source network access.

## Handoff

Task 005 consumes this read and observation surface to build Store and Targets inventory views.

## Verification

- `pnpm test` passed 44 test files and 227 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and all main, preload, and renderer production builds.
- Focused file-boundary, Watch Session, service, installation baseline, discovery, and IPC trust tests passed 6 test files and 11 tests.
- `git diff --check` passed before the final documentation-only update.
- The application was not launched and no visual automation was performed.
