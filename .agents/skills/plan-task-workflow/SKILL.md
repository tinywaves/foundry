---
name: plan-task-workflow
description: Plan substantial work as numbered plan directories, settle the index before creating task files, then execute one task at a time with prerequisite review and index checkboxes.
disable-model-invocation: true
---

# Plan Task Workflow

Use this skill when a change should be broken into a plan directory under
`specs/plans/`. Create task files only after the plan index and task breakdown
have been discussed and confirmed.

## Workflow

1. Start in conversation, not files.
2. Use the discussion to discover the rough plan boundaries and whether the
   work should become one plan or multiple plans.
3. If the user asks to reserve plan containers before details are settled,
   create only the plan directory and `index.md`.
4. In an unsettled `index.md`, include the plan goal and an empty `Tasks`
   section. Do not add task links, task names, or task checkboxes yet.
5. Continue the design discussion until the `index.md` goal, scope, and task
   sequence are confirmed.
6. Only after the `index.md` content is confirmed, populate the `Tasks`
   section with every intended task in execution order.
7. Do not create any `taskN-<description>.md` file until that specific task is
   about to be discussed or implemented.
8. Before creating `task1-<description>.md`, discuss and confirm Task 1's
   scope, boundaries, and verification approach.
9. Write Task 1's task file, then read it back before editing production code.
10. Implement Task 1 only.
11. After Task 1 implementation and verification, report the changed files,
    verification results, and remaining risks.
12. Mark Task 1 complete in `index.md` only after that report is complete.
13. Wait for user confirmation before discussing and creating the next task
    file, then repeat the same flow for Task 2 and later tasks.

## Rules

- `index.md` is the plan-level progress tracker.
- An unsettled plan may have an empty `Tasks` section, but it must not contain
  invented task entries.
- Do not create placeholder task files just to reserve names.
- Create a task file only after that task's scope has been explicitly
  discussed or confirmed.
- Task files are as important as the index and should preserve the reasoning
  needed by later tasks.
- Do not silently expand a task beyond its file.
- Do not skip prerequisite task review.
- Do not mark a task complete in `index.md` until the task has been reported
  complete.
- The first version of each task file may contain open questions, but it must
  be grounded in the current task discussion rather than speculative future
  work.
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
