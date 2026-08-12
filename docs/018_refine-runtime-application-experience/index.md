# Refine Runtime Application Experience

## Status

`completed`

## Goal

Refine the completed Runtime application workflow so users can select and apply a Provider with less duplicated context, inspect a compact but structurally accurate configuration diff, and recognize the configuration currently in use without confusing it with connection-test status.

## Detail

The Runtimes page now treats the selector as the primary representation of each Runtime's configuration target. Remove the separate Current configuration block, Provider URL, applied timestamp, and redundant current-value helper text. Present one inline `Use:` control followed immediately by the `Apply...` action so the selection and its consequence remain in the same interaction region.

Persisted Runtime state remains visible inside the selector options through an `In use` Token. Provider options use one compact line with an `xsm` Avatar and the Provider name at the same inherited text weight as Official Default. A custom Provider name opens supplementary Base URL and connection-status details on pointer hover without increasing every option's resting height. Official Default has no unnecessary hover detail.

The two fixed Runtime sections use a responsive Astryx Grid. The layout uses two columns when each Runtime can retain at least 480 pixels and collapses naturally to one column below that threshold. Loading content mirrors the final inline selector-and-action arrangement.

The confirmation dialog now prioritizes the pending mutation rather than presenting every managed field with equal prominence. Its title names the Provider and Runtime, its summary states the number of affected settings and logical configuration path, and its footer uses an action-specific label. Changed fields remain visible; unchanged fields move into a closed Collapsible. A zero-change preview reports that the configuration is already up to date and disables the mutation action.

Configuration fields retain their real hierarchy. Top-level Codex keys render directly, `model_providers.<resolved-key>` is a visible parent path for its nested keys, and Claude Code fields appear under `env`. The UI does not replace actual keys such as `name`, `base_url`, or `ANTHROPIC_BASE_URL` with flattened product labels that obscure where Foundry writes them.

Each changed field uses a stable three-column comparison grid: current value, centered arrow, and proposed value. Both value tracks use `minmax(0, 1fr)` so every arrow aligns vertically and long values truncate without changing the column geometry. The dialog width is 800 pixels to provide sufficient inspection space while retaining the existing maximum-height scrolling behavior. Truncated values preserve access to their complete text through the existing Astryx Text affordance.

The renderer theme overrides Astryx's code-family token with the local system monospace fallback. Configuration keys and values therefore use the user's platform-default monospace font rather than a component-library-specific Monaco preference.

This plan refines the renderer experience established by Plan 017. Runtime application state, Provider validation, configuration planning, secret handling, safe external writes, retry behavior, and reopen-after-apply guidance remain unchanged.

## Scope

- Remove the separate current-configuration summary from each Runtime section.
- Present `Use:` with the Selector and `Apply...` action in one horizontal control region.
- Keep the action adjacent to the selector in loading, ready, and disabled states.
- Arrange Runtime sections in a responsive one- or two-column Grid with a 480-pixel minimum track width.
- Render compact, height-consistent Provider and Official Default selector options.
- Show custom Provider Base URL and connection status through Provider-name hover details.
- Mark the persisted Provider or Official Default option with an `In use` Token.
- Replace the generic review action with an Apply-oriented action and confirmation flow.
- Reduce confirmation-dialog metadata to the target, connection context, affected path, and actual changes.
- Show changed fields by default and place unchanged fields in a closed Collapsible.
- Preserve real configuration hierarchy and key names in both changed and unchanged field views.
- Align current and proposed values through a fixed three-column comparison Grid.
- Truncate long values without resizing rows or moving comparison arrows.
- Use an 800-pixel dialog width and retain bounded scrolling.
- Override the global code font token with the local system monospace fallback.
- Preserve existing loading, preview failure, Apply failure, Retry Apply, secret reveal, and zero-change states.

## Out of Scope

- Runtime application-state persistence, Provider association, or `In use` authority changes.
- Main-process configuration planning, parsing, validation, backup, atomic write, or recovery changes.
- Shared contracts, preload, IPC, database schema, or Provider repository changes.
- Inferring Runtime state from external configuration or adding drift reconciliation.
- Changing Codex authentication behavior. Foundry continues to manage `forced_login_method = "api"` for custom Providers and removes it for Official Default.
- Managing or displaying `preferred_auth_method` as a Foundry-owned field.
- Changing Claude Code managed environment entries or Codex managed configuration keys.
- Adding dependencies, standalone CSS, or a new styling system.
- Application launch, screenshot automation, accessibility-tree inspection, browser automation, or desktop automation.

## Decisions

- The selector is the primary configuration representation, so a separate Current configuration summary is redundant.
- Do not show `Currently: <Provider>` helper text below the selector; use the persisted option's `In use` Token instead.
- Use `Use:` rather than `Target Provider`, `Change to:`, or `Apply to:` because the phrase describes the selected Runtime configuration without implying that selection itself performs the mutation.
- Keep `Apply...` beside the selector so selection and confirmation initiation form one workflow.
- Use a 480-pixel responsive Grid threshold and permit two Runtime columns instead of reserving a large empty page region.
- Keep option identity to Avatar and name on one line. Do not use connection-status dots in the resting option because they compete visually with selection and in-use state.
- Keep Provider option names at inherited weight so custom Providers and Official Default have consistent typography and row height.
- Show supplementary hover content only for custom Providers; Official Default has no Provider-specific URL or test metadata to explain.
- Represent persisted Runtime state with a green `In use` Token in the option list. The selector's checkmark continues to represent the current draft selection, so draft and persisted state remain distinct.
- Use action-specific confirmation titles: `Apply <Provider> to <Runtime>?` for Providers and `Restore <Runtime> Defaults?` for Official Default.
- Use `Apply to <Runtime>` and `Restore Defaults` for normal primary actions, while Apply failures retain explicit Retry wording.
- Show only `add`, `update`, and `remove` operations in the default Changes section. Do not repeat operation Tokens when the current-to-proposed comparison already communicates the mutation.
- Keep `no-change` fields inspectable but collapsed by default. An unchanged secret remains masked and has no Reveal action.
- Reveal is available only for a changed proposed Provider secret and remains dialog-local and temporary.
- Preserve configuration structure by splitting each field at its final path separator. The parent path is the group heading and the final segment is the row key.
- Do not translate raw configuration keys into flattened friendly labels because that can misrepresent ownership and nesting.
- Use equal current and proposed tracks with a fixed center arrow. Content length must never determine the arrow position.
- Increase the dialog to 800 pixels rather than allowing long technical content to degrade alignment at the previous width.
- Set `--font-family-code` to `monospace` in the Foundry theme so the platform selects its local default code face.
- Preserve Plan 017's process boundaries, managed fields, authentication semantics, and safe-write lifecycle.

## Tasks

- [x] [Task 001: Refine Runtime Selection and Configuration Confirmation](./task001_refine-runtime-selection-and-configuration-confirmation.md)
