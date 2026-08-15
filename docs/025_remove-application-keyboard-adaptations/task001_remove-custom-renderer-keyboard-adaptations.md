# Task 001: Remove Custom Renderer Keyboard Adaptations

## Status

`completed`

## Goal

Remove Foundry-authored renderer keyboard navigation, focus styling, and direct focus-management adaptations while preserving validation, application behavior, Astryx-owned focus contracts, and Electron shortcut handling.

## Detail

Delete `src/renderer/src/components/skip-to-main-content-link.tsx` and remove its imports and rendered instances from `AppShellLayout` and `FullWindowLayout`. Remove the `main-content` identifiers and `tabIndex={-1}` values that exist only as Skip to Main Content targets. Preserve each layout's semantic `main` element, fill behavior, scrolling ownership, macOS drag region, route outlet, standard shell, and SideNav behavior.

In `provider-card-list.tsx`, remove the manually assigned tab stop from Provider names and remove the Foundry-authored `:focus-visible` outline rules. Retain the Provider metadata HoverCard, its content, labels, pointer behavior, and Astryx `focusTrigger` configuration. Remove only imports and StyleX declarations that become unused after the keyboard-specific styling is deleted.

In `provider-connection-status.tsx`, remove the manually assigned tab stop and Foundry-authored `:focus-visible` outline rules from connection-status text. Retain the status presentation, Tooltip details, labels, pointer behavior, and Astryx `focusTrigger` configuration. Remove unused StyleX and token imports if no component-owned styling remains.

In `prompt-editor-page.tsx`, remove the title, description, and content element refs that exist only for direct focus management. Delete `focusFirstError` and stop calling it for local validation failures and mapped API field errors. Keep validation, error state, inline field status, API error mapping, saving, dirty-navigation protection, version behavior, and all Prompt navigation semantics unchanged.

In `provider-dialog.tsx`, delete `focusFirstFormError` and remove its calls from connection-test and save validation failures. Keep Provider validation, field-error state, connection testing, save and apply behavior, and existing error presentation unchanged. Preserve the Provider dialog title's `data-autofocus` and paired `tabIndex={-1}` because they participate in Astryx Dialog's documented internal autofocus protocol rather than a Foundry-owned direct focus implementation.

Do not modify any `focusTrigger` prop, Astryx component implementation, native interactive-control behavior, Dialog Escape handling, focus restoration, or other third-party keyboard processing. Do not modify Electron main-process code or `optimizer.watchWindowShortcuts(window)`. Verification will remain non-visual and will not add renderer UI tests.

## Findings

None.

## Dependencies

None.

## Deliverables

- Removal of the Foundry-owned Skip to Main Content component and both layout integrations.
- Layout main-content regions without skip-target-only identifiers or tab stops.
- Provider metadata and connection-status displays without Foundry-authored tab stops or focus-visible outlines.
- Prompt validation and API field-error handling without direct input `.focus()` calls.
- Provider save and connection-test validation without direct field `.focus()` calls.
- Existing validation messages, domain behavior, Astryx focus contracts, and Electron shortcut handling preserved.
- Focused static evidence that no unrelated keyboard behavior or third-party implementation was changed.

## Acceptance Criteria

- [x] `SkipToMainContentLink` is no longer rendered or present in the renderer source tree.
- [x] `AppShellLayout` and `FullWindowLayout` retain their semantic main regions without Skip Link target identifiers or target-only `tabIndex` values.
- [x] Standard-shell routing, full-window routing, SideNav behavior, layout sizing, scrolling, and macOS drag regions remain unchanged.
- [x] Provider name and connection-status text no longer receive Foundry-authored tab stops.
- [x] Provider name and connection-status text no longer use Foundry-authored `:focus-visible` outline styling.
- [x] Provider metadata and connection details remain available through their existing Astryx HoverCard and Tooltip behavior.
- [x] Prompt validation and mapped API field errors continue to render without programmatically focusing an input.
- [x] Provider connection-test and save validation errors continue to render without programmatically focusing a field.
- [x] The Provider dialog retains its Astryx-managed `data-autofocus` contract and paired title `tabIndex`.
- [x] Existing Astryx `focusTrigger` configuration and component-owned keyboard behavior remain unchanged.
- [x] Electron `optimizer.watchWindowShortcuts(window)` remains unchanged.
- [x] No renderer UI test, dependency, IPC, preload, routing, or main-process behavior change is introduced.

## Out of Scope

- Modifying Astryx source code, props, focus protocols, or built-in keyboard behavior.
- Removing the Provider dialog's Astryx-managed `data-autofocus` target.
- Changing Dialog Escape handling, focus restoration, focus trapping, or native control keyboard interaction.
- Removing Electron window shortcut handling.
- Removing semantic labels, inline validation messages, tooltips, or Provider metadata.
- Adding replacement skip navigation, tab management, focus styling, or programmatic focus behavior.
- Adding renderer UI tests or performing visual automation.
- Changing dependencies, IPC, preload, main-process architecture, routing, or domain contracts.

## Handoff

Completing Task 001 completes Plan 025. Future keyboard behavior should come from native controls, Electron, or unmodified Astryx component contracts rather than Foundry-authored renderer compatibility layers.

## Verification

- `pnpm test` passed 21 test files and 135 tests.
- `pnpm typecheck` passed for the node and renderer TypeScript projects.
- `pnpm lint` passed; ESLint emitted only the repository configuration's existing stylistic deprecation warnings.
- `pnpm build` passed for the main, preload, and renderer production bundles.
- Static search confirmed removal of the Skip Link, skip-target-only layout attributes, custom Provider `:focus-visible` styling and tab stops, and direct renderer `.focus()` calls.
- Static inspection confirmed preserved Astryx `focusTrigger` and `data-autofocus` usage and unchanged Electron `optimizer.watchWindowShortcuts(window)`.
- `git diff --check` passed.
- No application launch, screenshot, browser automation, accessibility-tree inspection, or desktop automation was performed, per repository UI verification rules.
