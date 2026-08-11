# Task 001: Refactor Provider List into Single-Column Cards

## Status

`completed`

## Goal

Replace the runtime-scoped Provider table with a single-column card list while preserving explicit editing, saved connection testing, confirmed deletion, connection feedback, and Provider metadata access.

## Detail

Replace the table-owned renderer module with a focused Provider card-list module. The successful list state will render one full-width Astryx `Card` per Provider inside a single vertical stack, preserving the repository-provided ordering. Use Astryx `Card`, `HStack`, `VStack`, and `StackItem` for structure, StyleX with Astryx design tokens for the few required flex constraints, and no raw renderer layout elements or standalone CSS. Rename the module and exported components so their names describe cards rather than retaining table terminology.

Each card uses a stable horizontal Avatar, Content, and Actions hierarchy. Render the Provider avatar at `md` size as a direct child of the card row and let the parent `HStack` center the Avatar's own bounds on the cross axis without a wrapper or manual optical offset. Apply the same direct flex alignment to the loading-avatar skeleton while keeping the action region on the shared center line. Let Content fill the remaining width with an explicit zero minimum width, while the action region keeps its intrinsic width and does not shrink or wrap. The card is a visual and semantic boundary only: it has no click handler, hover action, selection state, or keyboard activation behavior.

Keep Content to two compact horizontal lines. The first line renders the Provider name immediately followed by its persisted Connected, Failed, or Never tested status through the existing `StatusDot` presentation. The second renders only the Base URL as a single-line standalone Astryx `Link` with the same regular interface typography and external-link treatment used for Official website. The Base URL consumes the full available Content width, truncates when space is constrained, and opens through the application's existing external-link handling when activated. The flexible text region must not overlap or displace the fixed action region.

Preserve access to optional Provider metadata without retaining the current `Info` icon. When a Provider has a remark or a valid HTTP or HTTPS official website, make the Provider name itself the pointer-hover and keyboard-focus trigger for an Astryx `HoverCard`. Its content retains the labeled Remark text and clickable external Official website. A Provider without either valid metadata value renders a normal non-interactive name with its existing truncation affordance. The metadata interaction must not add a third visible card row.

Use a keyboard-focusable Astryx `Tooltip` on every status with persisted test metadata. The Tooltip exposes the locale-formatted last-tested time and, for Failed status, the sanitized `lastError` returned by the existing contract. Never tested remains non-interactive because it has no detail, and the existing invalid-timestamp fallback behavior remains intact.

Replace `MoreMenu` with three direct `sm` ghost Astryx `IconButton` controls. Edit uses the Lucide `Pencil` icon, Test Connection uses `PlugZap`, and Delete uses `Trash2`. Every control has a visible Tooltip and a Provider-specific accessible label. Keep their focus order as Edit, Test Connection, then Delete, while retaining the destructive treatment in the existing confirmation dialog rather than on the resting card action.

Each mounted Provider card continues to own its saved connection-test mutation and the established Provider-specific mutation key. During a test, only that card's Edit, Test Connection, and Delete actions are disabled, the Test Connection button renders its loading state, and the previously persisted status remains visible instead of changing to Testing. Other cards remain independently operable and testable. A valid completion replaces only the matching cached Provider summary. A persisted remote failure therefore updates the card to Failed and exposes its returned sanitized detail, while an internal request failure leaves the prior summary visible and uses the existing persistent error Toast. Runtime switching or row removal continues to remove the card observer and suppress obsolete observer-owned feedback.

Continue passing page-owned deletion state into the matching card. While confirmed deletion is pending, disable all three actions on that card; the existing `AlertDialog` remains the authoritative confirmation and loading surface. Preserve the current delete success Toast, runtime-list reset, revealed-detail cleanup where still applicable to the edit query, and persistent error behavior. Editing continues to open the existing Provider dialog without making the card itself interactive.

Remove API-key rendering, Copy, and Reveal from the list module. Simplify `ProvidersPage` by removing its list-only Reveal mutation, plaintext revealed-key value, expiry timer, pending Provider derivation, and reveal-specific transition cleanup. Runtime switching, retry, dialog opening, save handoff, deletion, and unmount no longer need to clear list-owned plaintext state. Do not remove or change the underlying typed Copy or Reveal APIs, main-process clipboard behavior, sensitive Provider-detail query used by Edit, API-key form behavior, storage, or IPC boundaries.

Replace the table loading state with four full-width skeleton cards in the same single-column stack. Each skeleton mirrors the adjacent Name and Status placeholders on the first line, the single Base URL placeholder on the second, the final avatar, and the three-action footprint closely enough that successful loading does not cause an avoidable structural shift. Retain the runtime-specific accessible loading label and busy state. Preserve the existing page header, Add Provider action, runtime tabs, EmptyState, load-error Banner and Retry action, Add and Edit dialogs, and Delete confirmation text.

Expected file impact is limited to the Provider list module and its direct Providers page caller. No shared contract, main-process, preload, persistence, query-key, connection-test protocol, package manifest, or build configuration change is required. The task adds no dependency and no broad reusable list abstraction.

## Findings

None.

## Dependencies

None.

## Deliverables

- A single-column Provider card-list module with matching loading cards and no remaining table terminology.
- Full-width Provider cards with stable Avatar, two-line Content, and end-aligned direct Actions regions.
- Name-triggered Provider metadata access without the current `Info` icon, plus preserved connection-status and failure-detail presentation.
- Direct Edit, Test Connection, and Delete icon actions with row-scoped pending behavior and existing query-cache synchronization.
- A simplified Providers page without list-owned API-key Reveal state, timers, or handlers.
- Static and command-based verification covering existing behavior and the approved renderer-only scope.

## Acceptance Criteria

- [x] Every Provider in the selected runtime renders as one full-width Card in a single vertical column and preserves the existing data order.
- [x] Each card maintains a non-overlapping Avatar, flexible two-line Content, and non-wrapping Actions layout at constrained content widths.
- [x] Cards have no whole-card pointer or keyboard activation behavior; editing, testing, and deletion start only from explicit actions.
- [x] The first content line keeps the Provider name adjacent to Connected, Failed, or Never tested status, while the second presents the Base URL as a single-line external Link with regular interface typography and the full available Content width.
- [x] Hovering or focusing a metadata-bearing Provider name opens Remark and valid Official website content without rendering an `Info` icon or a third visible card row.
- [x] A tested status exposes keyboard-accessible Last tested metadata, Failed also exposes its sanitized error detail, and Never tested does not expose a dead Tooltip trigger.
- [x] The list contains no API-key value, presence indicator, Copy action, Reveal action, or list-owned plaintext key state.
- [x] Edit, Test Connection, and Delete appear in that order as direct Provider-specific ghost IconButtons with the approved Lucide icons, tooltips, and accessible labels; `MoreMenu` is absent and the confirmation dialog retains destructive Delete styling.
- [x] A saved connection test disables all actions only on its matching card, shows progress on Test Connection, preserves the previous status while pending, updates the matching cached summary on valid completion, and retains existing internal-error feedback.
- [x] Confirmed deletion disables the matching card actions while pending and preserves the existing confirmation, success, reset, and failure behavior.
- [x] Loading uses four single-column skeleton cards with a stable final-layout footprint, while the page header, runtime tabs, EmptyState, load-error recovery, Add and Edit dialogs, and Delete confirmation remain behaviorally unchanged.
- [x] No dependency, shared contract, main-process, preload, IPC, persistence, connection-test protocol, package, or build-configuration change is introduced.
- [x] Focused tests, type checking, linting, diff validation, and static scope checks pass without launching the application or using visual automation.

## Out of Scope

- Multi-column or responsive card grids.
- Whole-card activation, selection, bulk operations, drag-and-drop ordering, or contextual menus.
- Provider search, sorting, filtering, or pagination.
- Provider form, dialog, runtime navigation, empty-state, error-state, or confirmation redesign.
- Connection-test request semantics, persistence rules, sanitization, cache-key ownership, or error-contract changes.
- Database, shared-contract, main-process, preload, IPC, credential-storage, or external-runtime changes.
- Removing the underlying API-key Copy or Reveal APIs or changing API-key behavior inside Add or Edit dialogs.
- New dependencies, DOM or component-test infrastructure, or a generalized card-list abstraction.
- Application launch, browser or desktop automation, screenshots, accessibility-tree inspection, or automated visual acceptance.

## Handoff

Completion closes Plan 016 with the Providers management surface using explicit single-column cards and without API-key exposure in the list. Provider forms, typed native boundaries, credential behavior, and runtime-scoped persistence remain stable foundations for later independently approved Provider or Agent Runtime work.

## Verification

- `pnpm test` passed all 5 test files and 31 test cases under Vitest 4.1.10.
- `pnpm typecheck` passed both the node and web TypeScript projects.
- `pnpm lint` passed with only the repository's existing package-manager and upstream ESLint deprecation warnings.
- `git diff --check` passed.
- Static inspection confirmed that the successful and loading Provider list no longer imports or renders Astryx `Table`, `MoreMenu`, the Lucide `Info`, Copy, Eye, or EyeOff list actions, or Provider-page Reveal state and timer ownership.
- Static inspection confirmed one full-width card per Provider, direct action order and labels, name-triggered metadata access, preserved status failure details, row-scoped pending behavior, and no raw `div`, `span`, or `svg` renderer layout additions.
- Static scope inspection confirmed that source changes are limited to the renderer Provider card-list module and its direct page caller, with no dependency, shared contract, main-process, preload, IPC, persistence, package, or build-configuration change.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy. Final visual inspection remains with the user.

## Maintenance Adjustments

### 2026-08-11 12:56:02: Optically Center Provider Avatars

- Change: The Provider Avatar and matching loading skeleton now use explicit cross-axis centering plus the Astryx `--spacing-0-5` block-start token as a small downward optical correction. The action region remains on the unadjusted center line.
- Previous state: The completed design described the Avatar as aligned with the start of the two-line content, and the initial implementation forced `crossAlignSelf="start"`. Removing that override mathematically centered the Avatar box but did not correct the visually high alignment against the text glyphs.
- Reason: User-provided visual evidence showed that the Avatar still appeared above the two-line Content center after the first alignment correction.
- Documentation impact: Updated the Plan 016 Detail and Decisions plus the Task 001 Detail to describe the current optical-centering behavior. The completed status, checklist, acceptance boundary, and task order remain unchanged.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed after the final adjustment. The application was not launched and no automated visual verification was performed under repository policy.

### 2026-08-11 13:20:37: Reduce Card Information Competition

- Change: The Provider name and status now remain adjacent on the first line, the Base URL owns the second line's full available Content width, and Last tested plus any sanitized failure reason are available from the status Tooltip. Delete now uses the same ghost treatment as the other resting card actions while the confirmation dialog retains destructive styling. Loading cards mirror the compact visible hierarchy.
- Previous state: Status and Last tested occupied the far ends of the first and second Content lines, respectively, which truncated the Provider name and Base URL earlier than necessary. Delete also used a persistent destructive button treatment in the card.
- Reason: User-provided visual evidence showed substantial information competition and excessive action emphasis despite sufficient overall card width.
- Documentation impact: Updated the Plan 016 Detail and Decisions plus the Task 001 Detail and Acceptance Criteria for the current visible hierarchy, metadata access, action styling, and loading structure. The completed status, checklist completion, task order, goal, and scope remain unchanged.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed after the adjustment. The application was not launched and no automated visual verification was performed under repository policy.

### 2026-08-11 14:21:10: Center Avatars by Their Own Bounds

- Change: The Provider Avatar and matching loading skeleton now render as direct children of the card row's centered `HStack`. Their wrapper `StackItem` and manual `--spacing-0-5` block-start offset were removed so flex alignment uses each visual element's own bounds.
- Previous state: Each visual was centered through an outer `StackItem` and then moved downward with an Astryx half-step spacing token.
- Reason: User-provided visual evidence showed that wrapper-based alignment still left the Avatar above the card's vertical center. Direct flex-item alignment removes the wrapper box and the size-specific optical correction from the centering calculation.
- Documentation impact: Updated the Task 001 Detail to describe the current direct flex alignment. Plan 016 remains accurate and unchanged because it records the centered outcome rather than the superseded implementation. Task status, checklist completion, acceptance boundary, and task order remain unchanged.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Static inspection confirmed that the Provider Avatar and loading skeleton are direct children of `HStack` elements configured with `vAlign="center"`. The application was not launched and no automated visual verification was performed under repository policy; final visual acceptance remains with the user.

### 2026-08-11 14:29:57: Present Base URL as an External Link

- Change: The card's Base URL now renders as a single-line standalone Astryx `Link` with `isExternalLink`, matching the regular interface typography and external-link treatment used for Official website. Activating it uses the application's existing external-link handling.
- Previous state: The Base URL rendered as non-interactive secondary `Text` with `type="code"`, which used a monospace typeface and a truncation Tooltip.
- Reason: The user requested that Base URL avoid the code typeface and use the same presentation approach as Official website.
- Documentation impact: Updated the Task 001 Detail and Acceptance Criteria for the current Base URL typography, truncation, and navigation behavior. Plan 016 remains accurate and unchanged; task status, checklist completion, acceptance boundary, and task order remain unchanged.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Static inspection confirmed the Base URL uses a standalone, external Astryx `Link` limited to one line, and the existing main-process window-open handler continues to route external links through `shell.openExternal`. The application was not launched and no automated visual verification was performed under repository policy; final visual acceptance remains with the user.
