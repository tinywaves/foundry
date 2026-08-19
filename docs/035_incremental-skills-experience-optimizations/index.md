# Incremental Skills Experience Optimizations

## Status

`in_progress`

## Goal

Coordinate focused Skills experience optimizations while preserving the established Skills domain, process boundaries, and verified local and remote management workflows.

## Detail

This plan records incremental refinements requested after completion of the local and remote Skills management plans. Each defined optimization receives its own task document so its behavior, boundaries, and verification remain independently reviewable while the cumulative Skills baseline stays explicit.

Only requested optimizations enter this plan. Add a task when its outcome and scope are known, complete and verify that task, then append the accepted result to this index. Keep undefined future work out of the plan.

The first optimization removes Astryx `Toolbar` from Skills regions that only need passive layout and size coordination. Using `Toolbar` placed its built-in roving-tabindex focus management and `useKeyboardHint` behavior around ordinary search inputs and actions, which caused the visual `← → to navigate` hint to appear when the Skill Store search input received keyboard-visible focus. Skills now uses a narrowly owned passive action bar for those regions without modifying Astryx or changing the controls' business behavior.

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
- Preserve Astryx-owned behavior for semantic controls such as `TabList`, dialogs, menus, inputs, and buttons.
- Keep the existing main, preload, renderer, and shared-contract boundaries unless a later task explicitly requires a scoped change.
- Continue using Astryx, StyleX, design tokens, and Lucide icons without adding dependencies for presentation-only refinements.

## Tasks

- [x] [Task 001: Remove Toolbar Keyboard Hints from Skills](./task001_remove-toolbar-keyboard-hints-from-skills.md)
