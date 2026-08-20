# Incremental Skills Experience Optimizations

## Status

`in_progress`

## Superseded Decisions

[Plan 037](../037_replace-skill-store-with-sqlite-blobs/index.md) removes the Store observation Status established by Task 006 and the live Installation observation presentation established by Task 009. The completed tasks remain historical UI records; current Skills presentation comes from Plan 037 and [ADR 0005](../adr/0005-store-current-skill-content-in-sqlite.md).

## Goal

Coordinate focused Skills experience optimizations while preserving the established Skills domain, process boundaries, and verified local and remote management workflows.

## Detail

This plan records incremental refinements requested after completion of the local and remote Skills management plans. Each defined optimization receives its own task document so its behavior, boundaries, and verification remain independently reviewable while the cumulative Skills baseline stays explicit.

Only requested optimizations enter this plan. Add a task when its outcome and scope are known, complete and verify that task, then append the accepted result to this index. Keep undefined future work out of the plan.

The first optimization removes Astryx `Toolbar` from Skills regions that only need passive layout and size coordination. Using `Toolbar` placed its built-in roving-tabindex focus management and `useKeyboardHint` behavior around ordinary search inputs and actions, which caused the visual `← → to navigate` hint to appear when the Skill Store search input received keyboard-visible focus. Skills now uses a narrowly owned passive action bar for those regions without modifying Astryx or changing the controls' business behavior.

The second optimization strengthens the Skill Store control hierarchy by separating the search field from the trailing action group more clearly than the two actions are separated from each other. The shared action bar now accepts a token-based slot gap, and the Store uses spacing step 4 between Search and Actions while retaining spacing step 2 between Discover and Import Existing. Other Skills action bars retain their existing default spacing.

The third optimization aligns import feedback with optional Discovery Root semantics. A missing configured root now means that the scan found no Skill Packages at that location; it remains an internal root observation but no longer becomes a user-facing scan warning. Unreadable roots and partial or failed package scans still produce warnings. Warning results now expose a `View Details` action that identifies the affected Distribution Target, root path, optional relative path, and readable cause for each actionable issue.

The fourth optimization refines the import-warning Dialog into a compact operational detail surface. Warning conclusions and explanations now use a restrained type hierarchy, their status icons are optically aligned with the first conclusion line, and each issue exposes one safely wrapped filesystem location through a supporting-size inline `Code` value. The Target name appears only when the root path is unavailable. The narrower information Dialog relies on its standard close affordance instead of adding a redundant issue-count subtitle or primary footer action.

The fifth optimization makes completed import feedback transient without adding another manual dismissal affordance. The `Import Finished` Banner no longer renders a close button and clears automatically after eight seconds. Opening warning details pauses that lifecycle so the Dialog is not removed with its source result; closing the Dialog starts a fresh interval. Import and Store error Banners remain persistent.

The sixth optimization reduces the Skill Store inventory to its decision-relevant columns. The ambiguous `Store` heading becomes `Status`, while the time column is removed because it displayed package update time under an `Observed` label and did not help the primary identify, assess, and act workflow. The remaining `Skill`, `Status`, and `Actions` columns allocate most of the width to the Skill identity.

The seventh optimization replaces checkbox-led Distribution Target rows with a two-column grid of selectable cards. Each card introduces the existing Target icon, keeps the name, path, and live distribution feedback together, and makes the complete option surface toggle selection. Select-all, preflight review, replacement confirmation, and result handling remain unchanged.

The eighth optimization makes Distribution Target icons identifiable and legible across light and dark themes. Agent Skills uses its provided avatar as a bundled local image clipped with the restrained Astryx `--radius-inner` token, Hermes Agent uses the available static brand asset, and Custom Targets use the more distinctive Lucide `Blocks` symbol. The monochrome assets for OpenCode, Cursor, GitHub Copilot, and Hermes Agent retain their original dark appearance in light mode and normalize to light marks in effective dark mode. Colored and self-contained image assets otherwise remain unchanged, while the Custom Target symbol inherits Astryx semantic colors.

The ninth optimization separates distribution selection from installation observation. A card's selected border remains the input for the pending distribution command, while its status now reports whether the current Skill has an available, missing, unreadable, or absent Skill Installation in that Target. Loading and unavailable observations remain explicit, and preflight or execution feedback temporarily takes precedence once an operation begins.

The tenth optimization keeps Distribution Target cards dimensionally stable when configured paths are long. Filesystem paths remain on one line, truncate with an ellipsis at the available width, and retain Astryx's automatic full-value tooltip. The two-column Grid uses zero-minimum equal tracks and each Selectable Card permits intrinsic-width contraction, so a long Custom Target path cannot widen its column. Operational error messages remain distinct and may use up to two lines.

## Working Agreement

- Add each newly requested Skills optimization as the next numbered task.
- Keep this plan `in_progress` while additional Skills optimizations are expected.
- Define the task boundary before changing renderer, preload, main-process, persistence, dependency, build, or packaging behavior.
- Audit effective component behavior through public documentation and dependency source when a rendered interaction is not explained by Foundry source alone.
- Preserve completed tasks as historical records; document later refinements as new tasks unless they directly correct the same implementation.
- Record task-specific checks and leave renderer visual acceptance to the user under the repository policy.

## Scope

- Focused user-requested refinements to existing Skills surfaces and workflows.
- Narrow Skills-owned presentation helpers when they remove unintended behavior or prevent drift.
- Token-based spacing hierarchy within existing Skills control regions.
- Task-specific documentation, implementation, static inspection, and non-visual verification.
- Cumulative updates as additional Skills optimizations are defined.

## Out of Scope

- Speculative Skills features or optimizations that have not been requested.
- Reopening the completed domain and workflow scope of Plans 033 and 034.
- Unrequested changes to Skills persistence, IPC, preload, filesystem, acquisition, distribution, update, or trash behavior.
- Modifying Astryx source or globally changing its component contracts.
- Broad renderer redesigns or changes outside Skills.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Decisions

- Maintain a dedicated Skills optimization sequence rather than extending completed feature plans or the broader Foundry optimization plan.
- Use one task document per optimization and assign task numbers only when the work is defined.
- Treat dependency-owned behavior activated by a Foundry component choice as part of the effective behavior audit.
- Use passive layout components for Skills action regions that do not require composite-widget keyboard semantics.
- Keep spacing relationships explicit: related controls use a tighter group gap than the boundary between distinct control groups.
- Treat a missing Discovery Root as an empty optional location rather than an actionable scan failure.
- Keep unreadable roots and partial or failed scans actionable, with details available from the import result.
- Present import warnings as compact issue details with optically aligned status, subordinate explanation, and one inline-code filesystem location.
- Keep dismissable information Dialogs free of redundant primary footer actions.
- Auto-hide completed import feedback after eight seconds without rendering a close control.
- Pause import-result auto-hide while warning details are open, and keep error feedback persistent.
- Keep the Skill Store inventory focused on Skill identity, local content status, and row actions without a low-value time column.
- Label the local content observation column `Status` within the Store-scoped table.
- Present Distribution Targets as icon-led selectable cards while preserving multi-select and operational feedback.
- Keep distribution preflight and confirmation authoritative when changing only the Target selection surface.
- Use specific available Target branding, adapt only monochrome brand assets to the effective Astryx color mode, preserve colored assets, and give Custom Targets a token-driven Lucide `Blocks` identity.
- Keep selection as transient distribution input and use each Target card's status area for authoritative Skill Installation presence.
- Use `Skill Installation` rather than download terminology, and distinguish missing or unreadable installations from both installed and not installed states.
- Keep configured Target paths to one truncated line, constrain the card Grid to equal shrinkable columns, and preserve multi-line space for actionable operation errors.
- Preserve Astryx-owned behavior for semantic controls such as `TabList`, dialogs, menus, inputs, and buttons.
- Keep the existing main, preload, renderer, and shared-contract boundaries unless a later task explicitly requires a scoped change.
- Continue using Astryx, StyleX, design tokens, and Lucide icons without adding dependencies for presentation-only refinements.

## Tasks

- [x] [Task 001: Remove Toolbar Keyboard Hints from Skills](./task001_remove-toolbar-keyboard-hints-from-skills.md)
- [x] [Task 002: Separate Skill Store Search and Actions](./task002_separate-skill-store-search-and-actions.md)
- [x] [Task 003: Clarify Skill Import Warnings](./task003_clarify-skill-import-warnings.md)
- [x] [Task 004: Refine the Import Warning Dialog](./task004_refine-the-import-warning-dialog.md)
- [x] [Task 005: Auto-Hide the Import Result Banner](./task005_auto-hide-the-import-result-banner.md)
- [x] [Task 006: Simplify the Skill Store Columns](./task006_simplify-the-skill-store-columns.md)
- [x] [Task 007: Use Selectable Distribution Target Cards](./task007_use-selectable-distribution-target-cards.md)
- [x] [Task 008: Adapt Target Icons to Color Mode](./task008_adapt-target-icons-to-color-mode.md)
- [x] [Task 009: Show Target Installation Status](./task009_show-target-installation-status.md)
- [x] [Task 010: Truncate Distribution Target Paths](./task010_truncate-distribution-target-paths.md)
