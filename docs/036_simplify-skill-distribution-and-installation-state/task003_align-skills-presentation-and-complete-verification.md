# Task 003: Align Skills Presentation and Complete Verification

## Status

`completed`

## Goal

Present the simplified synchronization model consistently and verify the completed workflow across process boundaries.

## Work

Replace old state labels and counts with `Synced`, `Different`, `Missing`, and `Unreadable` presentations derived from current observations. Derive management actions from Store readability, Target readability, and synchronization rather than change-origin categories. A readable different Target can synchronize from Store, promote to Store, import as new, or uninstall; missing and unreadable targets can synchronize when Store content is available.

Update Distribution preflight feedback for install, already-current, and replacement outcomes. Keep selection status and operational feedback behavior established by Plan 035.

Synchronize completed Skills documentation with the superseding Plan 036 decision, then run the complete automated test suite, type checking, linting, production build, and diff validation. Do not launch the application or perform visual automation; hand final visual acceptance to the user.

## Acceptance Criteria

- [x] Renderer labels contain no Outdated, Drifted, Diverged, or baseline-unavailable state.
- [x] Management actions follow current content capabilities.
- [x] Preflight distinguishes install, no-file-change, replace, and blocked Targets.
- [x] Superseded completed plan language points to Plan 036 without rewriting historical implementation records as if they never existed.
- [x] All required non-visual checks pass.

## Verification

- `pnpm test` passed with 60 test files and 304 tests.
- `pnpm typecheck` passed for the Node and renderer projects.
- `pnpm lint` passed.
- `pnpm build` passed.
- `git diff --check` passed.
