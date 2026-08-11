# Task 002: Build Runtime Selection and In-use Experience

## Status

`completed`

## Goal

Build the macOS Runtimes destination so users can inspect the last successfully managed state of Codex and Claude Code, choose a draft target for each Runtime, and recognize and safely interact with In-use Providers without exposing an incomplete Apply workflow.

## Detail

Add an `/agent-runtime/runtimes` route and a `Runtimes` SideNav item before `Providers` in the existing Agent Runtime section. Change the `/agent-runtime` redirect to Runtimes while preserving direct access to Providers. The Runtimes page header will contain one page-level `Manage Providers` action that navigates to the Providers destination; it will not be tied to an individual Runtime or preselect a Runtime tab.

Build the page as a quiet settings surface using Astryx `List` and `Item` rows rather than nested cards. The list contains exactly two fixed rows in the shared Runtime order: Codex and Claude Code. Each row presents the existing Runtime icon and label, the last successful state reported by `runtimes.listRuntimes()`, and a `Target Provider` Selector. The persisted state remains visually distinct from the draft selection and is presented as `Not managed by Foundry`, the associated Provider identity, or `Official Default`.

Initialize each Selector from the persisted Runtime state. A `not-managed` Runtime has no selected value and shows a `Choose a Provider` placeholder; a managed Runtime selects its associated Provider or `Official Default`. Place `Official Default` first, followed only by active Providers that belong to that Runtime. Use Astryx custom option rendering to show each Provider's icon, name, Base URL, and persisted connection status. Enable the Selector's built-in client-side search unconditionally; do not add a backend search API. A Runtime with no custom Providers still offers `Official Default`.

Keep user selections as page-local draft overrides. Derive the displayed target from the draft override when present and otherwise from the persisted Runtime summary, instead of mirroring server state into Effect-managed component state. Selecting a target must not alter the persisted current-state presentation, Provider `isInUse` projection, or SQLite state. Draft overrides are intentionally discarded when the page unmounts or the application reloads. This stable draft model is the handoff for the Preview task.

Add Runtime query keys, a typed request adapter, query options, and a small state hook following the existing Provider query conventions. Start the Runtime query and both Runtime-scoped Provider queries without sequential dependencies so TanStack Query can load them in parallel. Validate data crossing the renderer boundary before using it. A Runtime-state request failure replaces the list with a page-level error Banner and Retry action. A failure to load Providers for only one Runtime preserves the other row, disables the affected Selector with an explanatory state, and provides a scoped Retry. Loading placeholders must preserve row and control dimensions.

Add a green `In use` Token inline with the Provider name on Provider cards when `ProviderSummary.isInUse` is true. Keep Edit and Test Connection available. Disable Delete and change its tooltip to explain that an In-use Provider cannot be deleted; the page-level delete callback must also refuse an In-use Provider so the visual state is not the only guard. If stale renderer data permits a delete request and the authoritative backend returns `conflict`, show the returned error and refresh the Runtime summary plus the affected Provider list so the UI converges on the current association.

Do not render Apply, Preview, confirmation, Restore, or Retry Apply controls in this task. Adding a visibly actionable control without its real read-only preview or application behavior would create a misleading workflow. Task 003 will add the preview entry point and confirmation context, and Task 004 will add external side effects. Design and acceptance are macOS-only; no platform branch or non-macOS fallback is added.

Follow the existing renderer boundaries and the applicable React guidance: import Astryx components directly, keep static option metadata and presentation helpers outside render where practical, store only user-owned draft overrides, derive simple view state during render, avoid unnecessary Effects, and use Map or Set lookups for repeated Provider association checks. Use existing Astryx, StyleX, Lucide, TanStack Query, React Router, Provider runtime assets, and design tokens without a new dependency.

## Findings

None.

## Dependencies

None.

## Deliverables

- A Runtimes route, Agent Runtime navigation entry, and default Agent Runtime redirect.
- A macOS Runtimes page with two fixed settings rows and a page-level Manage Providers action.
- Runtime query keys, request adaptation, loading, error, and retry state.
- Runtime-scoped, always-searchable Target Provider Selectors with rich Provider options and Official Default.
- A page-local draft target model that remains separate from persisted Runtime state.
- An inline Provider-card `In use` Token and disabled Delete interaction.
- Cache refresh behavior for authoritative In-use deletion conflicts.
- Focused query, draft-state, routing, and Provider guardrail coverage.

## Acceptance Criteria

- [x] The Agent Runtime default route opens Runtimes, and Providers remains directly accessible from navigation and its route.
- [x] The Runtimes page always presents Codex and Claude Code in the fixed shared order.
- [x] Each row accurately distinguishes persisted `not-managed`, Provider, and `official-default` state from its draft target.
- [x] A not-managed Runtime shows the `Choose a Provider` placeholder instead of preselecting Official Default.
- [x] Each Selector always lists Official Default first, lists only Providers for its Runtime, and enables client-side search without a backend request.
- [x] Provider options expose icon, name, Base URL, and informational connection status without exposing an API key.
- [x] Selecting a draft target changes no Runtime association, In-use marker, or external configuration, and the draft is discarded after leaving or reloading the page.
- [x] Manage Providers appears once as a page-level action and navigates to the Providers destination without binding to one Runtime.
- [x] An In-use Provider displays a green inline Token, remains editable and testable, and cannot initiate deletion from the UI.
- [x] A backend `conflict` from a stale delete attempt produces clear feedback and refreshes the Runtime and affected Provider caches.
- [x] Runtime loading, page-level Runtime failure, one-Runtime Provider failure, and an empty Provider inventory have stable and recoverable presentations.
- [x] Runtime and Provider reads begin without an avoidable request waterfall.
- [x] The renderer exposes no Runtime-state mutation and the page contains no Apply, Preview, confirmation, Restore, or Retry Apply control.
- [x] The page remains usable at supported app window sizes with coherent focus order, labels, tooltips, and non-overlapping text and controls.
- [x] Existing Provider workflows and automated coverage remain passing.

## Out of Scope

- Runtime configuration preview, API key Reveal, and the confirmation dialog.
- Apply, Restore Official Default, Retry Apply, or any Runtime-state mutation.
- Provider Save-then-Apply orchestration.
- Reading, writing, backing up, validating, or restoring Agent configuration files.
- Non-macOS UI, behavior, or acceptance coverage.
- Browser, screenshot, accessibility-tree, or desktop-automation visual verification.

## Handoff

Task 003 will consume the Runtime query state, Runtime-scoped Provider options, page-local draft target, and established page layout to add the read-only configuration-preview entry point and confirmation context. Task 004 will later connect the confirmed target to external configuration writes and successful Runtime-state recording.

## Verification

- `pnpm test` - Passed as part of the final Plan 017 verification: 13 test files and 68 tests.
- `pnpm typecheck` - Passed for the main/preload and renderer TypeScript projects.
- `pnpm lint` - Passed with only existing ESLint configuration deprecation notices.
- `pnpm build` - Passed for the Electron main process, preload, and renderer production bundles.
- `git diff --check` - Passed.
- User visual inspection in the Electron application - Accepted by proceeding to Task 003.
