# Incremental Foundry Optimizations

## Status

`in_progress`

## Goal

Coordinate the current sequence of focused Foundry optimizations in one living plan, preserving a clear record of each approved change, its boundaries, implementation decisions, and verification results.

## Detail

This plan collects the incremental optimizations requested after completion of Plan 022. Each optimization is documented as a separate task so that its scope, decisions, acceptance criteria, and verification remain independently reviewable while the overall optimization sequence stays visible in one place.

Only explicitly requested optimizations enter this plan. A new task is added when an optimization is defined, and its status is updated as implementation progresses. Completed tasks remain unchanged as historical records unless a later request explicitly revises the same behavior.

The first optimization aligns renderer empty-state icons with the corresponding selected sidebar destination and slightly reduces the visual density of the shared empty-state message. The second optimization improves the shared empty state's visual hierarchy with an inset, low-contrast rounded dashed boundary that defines the otherwise empty content region without competing with its compact message. The third optimization consolidates Prompt list and Trash navigation into tabs below a stable Prompts header, removes the redundant Trash header action, and eliminates the extra header divider. The fourth optimization reduces the Prompts and Providers page-level primary actions to the small Astryx button size for a denser desktop header treatment.

## Working Agreement

- Add each newly requested optimization as the next numbered task in this plan.
- Keep the plan status `in_progress` while additional optimizations are expected.
- Record task-specific scope before broadening process, renderer, preload, main-process, persistence, build, or packaging boundaries.
- Preserve completed task verification and document any later follow-up as a new task unless it is a direct correction.
- Run checks appropriate to every task and record checks that could not be run.
- Follow the repository prohibition on automated visual verification for renderer UI changes.

## Scope

- Focused user-requested optimizations across the existing Foundry application.
- Small shared definitions when they prevent drift across related consumers.
- Task-specific documentation, implementation, and non-visual verification.
- Ongoing updates to this plan as additional optimizations are approved.

## Out of Scope

- Unrequested product features, redesigns, migrations, or dependency changes.
- Speculative tasks for optimizations that have not yet been defined.
- Refactoring unrelated code while implementing a focused optimization.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for renderer UI acceptance.

## Decisions

- Use one persistent numbered plan for the current optimization sequence instead of creating a separate top-level plan for every small improvement.
- Give every optimization its own task document and sequential task number.
- Keep unknown future optimization scope open rather than pre-authorizing implementation details.
- Prefer shared, narrowly owned definitions when multiple UI surfaces must remain synchronized.
- Continue using the existing architecture, Astryx, StyleX, design tokens, Lucide icons, and established process boundaries unless a later task explicitly requires otherwise.

## Tasks

- [x] [Task 001: Align Empty-State Icons and Density](./task001_align-empty-state-icons-and-density.md)
- [x] [Task 002: Refine Empty-State Visual Hierarchy](./task002_refine-empty-state-visual-hierarchy.md)
- [x] [Task 003: Consolidate Prompt List and Trash Navigation](./task003_consolidate-prompt-list-and-trash-navigation.md)
- [x] [Task 004: Reduce Page Header Action Size](./task004_reduce-page-header-action-size.md)
