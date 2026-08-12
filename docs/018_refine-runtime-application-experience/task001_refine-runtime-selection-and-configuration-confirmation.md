# Task 001: Refine Runtime Selection and Configuration Confirmation

## Status

`completed`

## Goal

Implement and record the approved renderer-only refinements for Runtime target selection, persisted-state recognition, responsive page density, code typography, and hierarchical configuration confirmation.

## Final Refinements

### 1. Make the Selector the Runtime's primary configuration surface

Remove the visible `Current configuration` label, persisted Provider name, Base URL, and applied timestamp from each Runtime section. Also omit the proposed `Currently: <Provider>` helper because it repeats the persisted state already available in the Selector.

Render a compact `Use:` label and an accessibility-labeled Astryx Selector on the same line. Keep selection draft state renderer-local and preserve the existing rule that selecting a target does not mutate external configuration.

### 2. Keep Apply adjacent to selection

Move the confirmation entry action beside the Selector and rename it from `Review Changes` to `Apply...`. Retain existing availability rules: Providers must be loaded, the target must be valid, and the draft target must differ from the last successfully persisted Foundry state. Disabled tooltips explain the relevant unavailable condition.

Loading Runtime sections mirror the final structure with `Use:`, one Selector-sized skeleton, and one action-sized skeleton. This prevents a large vertical shift when Runtime and Provider data become available.

### 3. Use available page width without weakening constrained layouts

Replace the vertical Runtime List with an Astryx Grid configured with `minWidth: 480`, `max: 2`, and `repeat: fit`. At sufficient width, Codex and Claude Code occupy two columns. When each track cannot retain at least 480 pixels, the page returns to one column. Both successful and loading states use the same Grid definition.

### 4. Compact and normalize Selector options

Render custom Providers as an `xsm` Avatar followed by the Provider name on one line. Do not render the Base URL as a second description row or connection status as permanent trailing content. Provider names inherit Selector typography rather than applying a distinct weight.

Use the Provider name as a pointer-hover trigger for a non-focus-stealing HoverCard containing Base URL and the existing persisted connection status. Official Default retains its Runtime icon and one-line label without a HoverCard because no Provider-specific details exist.

These rules keep custom and official options at the same height and text weight while leaving supplementary diagnostics available when useful.

### 5. Distinguish persisted state from draft selection

Resolve the persisted Runtime target independently from the effective draft target. Add an `In use` Token to the persisted Provider or Official Default option. Preserve the Selector's own selected checkmark for the current draft target.

This creates two explicit meanings:

- `In use` identifies the last Runtime configuration successfully managed by Foundry.
- The Selector checkmark identifies what the user is currently preparing to apply.

No additional status dot or `Currently:` helper is rendered.

### 6. Use the platform's default monospace font

Create a Foundry renderer theme that extends the existing neutral theme and overrides `--font-family-code` with `monospace`. Continue using Astryx semantic `Code` and `Text type="code"` components; the token override changes their font resolution globally without custom component CSS or a new dependency.

### 7. Recompose the Runtime confirmation dialog

Replace the four-column Table with a focused confirmation layout. The dialog title is `Apply <Provider> to <Runtime>?` for a custom Provider and `Restore <Runtime> Defaults?` for Official Default. The summary reports the changed-setting count and logical configuration path. Provider targets show the Provider name, connection status, and one-line truncating Base URL as supporting context.

The default Changes section contains only fields whose operation is `add`, `update`, or `remove`. Place all `no-change` fields inside a closed Collapsible labeled with the unchanged-setting count. When no field changes, report that the configuration is already up to date and disable the primary action. Do not render empty Changes or unchanged sections.

Remove the operation column and `Add`, `Update`, `Remove`, or `No change` Tokens. Each changed row directly compares current and proposed values, which is sufficient to communicate the mutation.

Preserve real configuration hierarchy. Split every managed field key at its final period:

- Codex top-level keys such as `model`, `model_provider`, and `forced_login_method` render directly.
- Codex Provider keys render below the parent path `model_providers.<resolved-key>` as `name`, `base_url`, `wire_api`, and `experimental_bearer_token`.
- Claude Code keys render below `env` with their exact `ANTHROPIC_*` or `CLAUDE_CODE_*` names.

Do not replace these keys with labels such as Provider name or Base URL because flattened labels hide where the value will be written.

Render every changed value comparison in an Astryx Grid with `minmax(0, 1fr) auto minmax(0, 1fr)`. Current and proposed values receive equal tracks, while the arrow occupies the fixed center track. Set all value containers to a zero minimum width and single-line truncation so long URLs or model identifiers cannot move the arrow or resize the row. Use an 800-pixel Dialog width and retain the existing `85vh` maximum height and scrollable content region.

Keep current secrets as presence-only values. Only a configured, changed proposed Provider secret may expose the existing Eye/EyeOff control. Hide, close, context replacement, success, and stale request protection retain the existing local-secret behavior.

Use `Apply to <Runtime>` for Provider confirmation, `Restore Defaults` for Official Default, and explicit Retry Apply wording after failure. Preserve Apply loading, preview Retry, Cancel, and required-dialog behavior.

## Findings

None.

## Dependencies

None. The implementation reuses existing Astryx, StyleX, Lucide, React, TanStack Query, Runtime state, and Provider presentation foundations.

## Deliverables

- Responsive Runtime Grid with matching ready and loading structures.
- Inline `Use:` Selector and adjacent Apply confirmation action.
- Compact custom and official Selector options with consistent height and typography.
- Provider-only HoverCard details and persisted-target `In use` Tokens.
- Foundry theme override for the platform-default monospace font.
- Focused Runtime confirmation dialog with changed-only default content.
- Collapsed unchanged-field inspection.
- Real configuration path grouping for Codex and Claude Code.
- Stable, aligned current-to-proposed comparison columns.
- Preserved secret handling, failure recovery, and safe Apply behavior.

## Acceptance Criteria

- [x] Runtime sections contain no separate Current configuration label, persisted Provider summary, Base URL summary, applied timestamp, or `Currently:` helper text.
- [x] `Use:`, the Selector, and `Apply...` form one adjacent workflow in both ready and loading states.
- [x] Codex and Claude Code use two columns only when each Grid track can retain at least 480 pixels and otherwise render in one column.
- [x] Custom Provider and Official Default options use one compact line with consistent height and inherited text weight.
- [x] Custom Provider names expose Base URL and connection status through pointer hover, while Official Default has no unnecessary HoverCard.
- [x] Exactly the persisted target receives an `In use` Token, independently from the Selector's draft-selection checkmark.
- [x] The primary entry action says `Apply...` and retains all previous target-validity and changed-target safeguards.
- [x] Astryx code typography resolves through the platform-default `monospace` family.
- [x] Provider and Official Default confirmation titles and primary actions name the actual operation and Runtime.
- [x] The dialog summary reports the changed-setting count and logical configuration path without repeating low-priority file-existence metadata.
- [x] Changed fields are visible by default, unchanged fields are closed in a count-labeled Collapsible, and neither section renders when empty.
- [x] Field presentation preserves top-level keys and groups nested keys under `model_providers.<resolved-key>` or `env`.
- [x] No flattened friendly label obscures the field's actual configuration ownership or nesting.
- [x] Every changed row uses equal current and proposed tracks with one vertically aligned center arrow.
- [x] Long URLs, model identifiers, and revealed proposed secrets truncate without changing the comparison geometry or overlapping adjacent content.
- [x] The dialog is 800 pixels wide, remains bounded to `85vh`, and keeps content scrollable.
- [x] Current secrets remain unrevealable, while changed proposed Provider secrets retain explicit temporary Reveal and stale-response protection.
- [x] Zero-change previews report an up-to-date configuration and disable the primary action.
- [x] Runtime persistence, configuration planning, safe external writes, authentication semantics, and reopen guidance remain unchanged from Plan 017.
- [x] `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass.

## Out of Scope

- Runtime state, Provider association, Provider CRUD, or database changes.
- Configuration-plan mappings, parser behavior, file paths, backup behavior, atomic writes, or recovery changes.
- Main-process, preload, IPC, and shared-contract changes.
- New managed Codex or Claude Code fields.
- Changing `forced_login_method` behavior or adopting `preferred_auth_method`.
- Re-apply without a draft target change, drift detection, or external configuration inference.
- Search, filtering, sorting, or user-created Runtime entries.
- New package dependencies or generalized renderer abstractions.
- Automated visual verification. Repository policy reserves application launch and final visual inspection for the user.

## Handoff

Plan 018 supersedes the renderer presentation details of Plan 017 while retaining its Runtime-state and safe-application contract. Future Runtime UI work should preserve the distinction between persisted `In use` state and draft selection, real configuration hierarchy, changed-only default emphasis, and fixed comparison alignment unless a later plan explicitly replaces them.

## Verification

- `pnpm typecheck` passed for the node/preload and renderer TypeScript projects.
- `pnpm lint` passed with only the repository's existing package-manager and upstream ESLint configuration deprecation warnings.
- `git diff --check` passed.
- Static inspection confirmed the Runtime page uses Astryx Grid, Selector, HoverCard, Token, Stack, and Button components with StyleX design tokens and no new standalone CSS.
- Static inspection confirmed the confirmation dialog no longer imports Astryx Table or operation Tokens, preserves nested configuration paths, and uses a fixed three-column comparison Grid.
- Static scope inspection confirmed that implementation changes are limited to the renderer theme, Runtimes page, and Runtime confirmation dialog, with no dependency, shared-contract, preload, IPC, main-process, database, or external-write change.
- The application was not launched and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy. Final visual acceptance was provided through user inspection during implementation.
