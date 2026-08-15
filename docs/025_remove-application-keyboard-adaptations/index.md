# Remove Application-Owned Keyboard Adaptations

## Status

`completed`

## Goal

Remove Foundry-authored renderer keyboard compatibility and focus-management adaptations while preserving keyboard behavior owned by Astryx components and Electron.

## Detail

Foundry currently contains renderer code written specifically to add keyboard-only navigation, focus visibility, and programmatic focus behavior. This includes the shared Skip to Main Content trigger introduced for the sibling layouts, layout targets that exist only for that trigger, manually focusable Provider metadata and connection-status labels with custom focus-visible styling, and direct form-error focus calls in the Prompt editor and Provider dialog.

Remove those application-owned adaptations rather than maintaining a parallel keyboard interaction layer. The affected visual elements and forms will continue to use their existing Astryx components and ordinary pointer interaction, but Foundry will no longer add custom tab stops, focus-only styling, skip navigation, or direct `.focus()` calls around them.

Do not modify keyboard or focus behavior implemented by Astryx itself. Preserve Astryx component contracts and configuration such as `focusTrigger` and `data-autofocus`, including Dialog focus management, Escape handling, focus restoration, and built-in control keyboard interaction. Do not modify Electron's `optimizer.watchWindowShortcuts(window)` integration.

This plan is limited to removing identifiable Foundry-owned renderer adaptations. It does not remove semantic labels, change Provider or Prompt domain behavior, alter native control behavior, or modify third-party source code.

## Scope

- Removal of the Foundry-owned Skip to Main Content component and its use in both renderer layouts.
- Removal of layout identifiers and `tabIndex` values used only as Skip to Main Content targets.
- Removal of manually added Provider metadata and connection-status tab stops.
- Removal of Foundry-authored Provider focus-visible outline styling.
- Removal of direct `.focus()` calls used by Prompt and Provider form-error handling.
- Static verification that Astryx-owned and Electron-owned keyboard behavior remains untouched.
- Non-visual project verification without renderer UI tests.

## Out of Scope

- Modifying Astryx source code or its built-in keyboard and focus behavior.
- Removing or changing Astryx `focusTrigger` or `data-autofocus` usage.
- Changing Dialog Escape handling, focus restoration, focus trapping, or native control keyboard interaction.
- Removing Electron's `optimizer.watchWindowShortcuts(window)` integration.
- Removing semantic ARIA labels or changing Provider and Prompt domain behavior.
- Adding replacement keyboard navigation, focus management, or accessibility infrastructure.
- Adding renderer UI tests or visual automation.
- Changing dependencies, IPC, preload, main-process architecture, or application routing.

## Decisions

- Remove only keyboard and focus adaptations authored by Foundry renderer code.
- Delete the Skip to Main Content component instead of retaining an unused abstraction.
- Remove custom tab stops and focus-visible styling together so non-interactive text no longer participates in Foundry-managed keyboard navigation.
- Remove direct form-error `.focus()` calls without replacing them with another application-owned focus mechanism.
- Preserve `focusTrigger` and `data-autofocus` because they are handled through Astryx component contracts.
- Preserve all keyboard behavior internal to unmodified Astryx components.
- Preserve Electron window shortcut handling unchanged.
- Verify the change through pure-function tests, type checking, linting, production build, and static inspection rather than renderer UI tests or visual automation.

## Tasks

- [x] [Task 001: Remove Custom Renderer Keyboard Adaptations](./task001_remove-custom-renderer-keyboard-adaptations.md)
