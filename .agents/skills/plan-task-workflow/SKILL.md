---
name: plan-task-workflow
description: Plan substantial work as numbered plan directories with an index and task files, then execute one task at a time with prerequisite review and index checkboxes.
disable-model-invocation: true
---

# Plan Task Workflow

Use this skill when a change should be broken into a plan directory with an
`index.md` and multiple task files under `specs/plans/`.

## Workflow

1. Start in conversation, not files.
2. Use the discussion to discover the rough task boundaries and the likely
   task count.
3. Confirm the task breakdown before creating plan files.
4. Create or update the plan directory only after the task list is settled.
5. Write `index.md` first and list every intended task in execution order.
6. Create one task file per task, using `task1-<description>.md`,
   `task2-<description>.md`, and so on.
7. Treat each task file as a living implementation plan for that task.
8. Before starting a task, read its file and all prerequisite task files.
9. Update the current task file with confirmed scope, constraints, file scope,
   and verification before editing code.
10. Implement one task at a time.
11. After implementation and verification, mark the task complete in
    `index.md`.
12. Wait for user confirmation before starting the next task.

## Rules

- `index.md` is the plan-level progress tracker.
- Task files are as important as the index and should preserve the reasoning
  needed by later tasks.
- Do not silently expand a task beyond its file.
- Do not skip prerequisite task review.
- Do not mark a task complete in `index.md` until the task has been reported
  complete.
- The first version of each task file may be a structured placeholder while the
  task is still being planned.
- Every task file must use the same section layout.
- Required task sections, in order:
  1. `Status`
  2. `Goal`
  3. `Context`
  4. `Confirmed Decisions`
  5. `Expected File Scope`
  6. `Implementation Boundaries`
  7. `Verification`
  8. `Dependency Changes`
- Keep the section names stable across tasks so later work can compare task
  documents without relearning the shape each time.

## Good Shape

```text
specs/plans/003_feature-name/
├── index.md
├── task1-contract.md
├── task2-ui.md
└── task3-verification.md
```

## When To Use

- Use this skill for multi-step features, refactors, or architecture changes.
- Do not use it for tiny one-file edits that do not need a plan.
