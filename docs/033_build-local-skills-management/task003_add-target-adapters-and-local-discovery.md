# Task 003: Add Target Adapters and Local Discovery

## Status

`completed`

## Goal

Resolve supported global Distribution Targets, scan them within adapter-owned boundaries, and automatically adopt newly discovered Skill Packages.

## Findings

- Built-in target adapters resolve the approved global roots in stable order, honor Hermes and OpenClaw runtime configuration, prune runtime-owned subtrees, and keep Codex Legacy last with its official documentation hint.
- Configured targets are keyed by resolved physical path. Built-in aliases are collapsed before persistence, and custom aliases reuse the existing target so one physical directory owns one installation namespace.
- Discovery is breadth-first and bounded by both depth and directory-count limits. It recognizes exact root `SKILL.md`, prevents unapproved symbolic-link escapes, avoids link loops, and reports partial or inaccessible observations without treating them as complete scans.
- Newly observed content is imported through the canonical Store coordinator and adopted with an exact immutable revision baseline. Known installation paths keep their identity when their bytes change.
- Complete root observations may mark absent installations Missing; truncated, missing, unreadable, or partially unreadable observations leave previous installation facts intact.
- Schema version 6 adds persisted installation relative paths while migrating version 5 rows to their existing Distribution Names.

## Dependencies

Tasks 001 and 002.

## Work

Add a target adapter interface that resolves configured and physical paths, writable capability, branding key, ordering, reserved subtrees, default scan depth, and documentation hint. Implement the built-in target set from the parent plan and [runtime research](../research/agent-runtime-skill-support.md). Keep `.agents/skills` as one Generic Target, exclude Claude `synced`, exclude Codex `.system` case-sensitively and defensively, resolve Hermes profiles and OpenClaw state instead of assuming one hard-coded home, and place Codex Legacy last with its official documentation URL. Do not add goose or project roots.

Persist user scan-policy overrides for built-in targets and custom targets selected through an Electron directory picker. Store enabled state, maximum depth, and whether traversal may cross symbolic-link boundaries; custom targets additionally own configured and resolved paths. Let users reset a built-in target to its adapter defaults. Clamp depth and traversal counts to shared limits. Re-resolve physical paths before every scan or mutation and merge duplicate built-in/custom presentations so one physical root owns one installation namespace.

Implement a bounded Discovery Scan that walks only enabled adapter roots, prunes adapter exclusions before descent, never follows a symbolic link outside the configured access boundary, and recognizes exact root `SKILL.md`. Report inaccessible roots and packages without aborting independent roots. Avoid unrestricted home-directory recursion.

Reconcile each observed candidate as follows:

- A recorded installation at that target path keeps its identity; update only its current target observation.
- An unrecorded candidate matching an active Store fingerprint adopts the existing Skill ID.
- An unrecorded candidate with new content imports one package and initial revision, then adopts the candidate as an installation whose initial Distribution Record references that revision.
- Multiple concurrent observations of identical content serialize into one package.
- A recorded installation missing from the scan becomes Missing only after its expected parent root was successfully observed; an inaccessible root leaves its previous fact stale and reports observation failure.

Keep the scan result structured: roots inspected, packages found, packages imported, installations adopted, observations updated, warnings, and per-root failures. The operation requires no confirmation and must not distribute or rewrite any target content.

Add adapter, de-duplication, scanner, and reconciliation tests using temporary roots. Cover reserved directories, exact filename matching, depth limits, link boundaries, missing roots, path aliases, identical content across targets, same-name different content, changed known installations, and partial root failure.

## Deliverables

- Built-in global target adapters, persistent policy overrides, and custom targets.
- Resolved-path target de-duplication and collision namespaces.
- Bounded one-shot Discovery Scan.
- Automatic import and installation adoption.
- Structured scan results and focused tests.

## Acceptance Criteria

- [x] Every approved global target is resolved through its adapter, while runtime-managed exclusions, goose, and project roots are absent.
- [x] Codex Legacy is last, visibly marked Legacy through metadata, links official documentation, and never scans `.system`.
- [x] Physical path aliases produce one Target and one occupied-name namespace.
- [x] A new runtime-installed Skill is automatically imported and adopted; a known modified installation remains the same installation.
- [x] Identical content discovered in multiple roots reuses one Skill ID while each physical target receives its own installation record.
- [x] Root failures are isolated and never turn unobserved installations into false Missing states.
- [x] No scan follows an unapproved symbolic-link escape or performs an unrestricted home crawl.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out of Scope

- Page lifecycle, filesystem watches, and renderer change notifications.
- Distribution, drift actions, project roots, remote sources, and UI.

## Handoff

Task 004 exposes scanning and temporary observation through the trusted application boundary.

## Verification

- `pnpm test` passed 40 test files and 220 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and all main, preload, and renderer production builds.
- Focused adapter, target repository, scanner, discovery, installation, and migration tests passed 7 test files and 26 tests.
- `git diff --check` passed.
- The application was not launched and no visual automation was performed.
