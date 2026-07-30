---
name: plan-task-workflow
description: Break substantial work into a confirmed plan and small independently reviewable tasks, then design and implement one task at a time without front-loading later work into Task 1.
disable-model-invocation: true
---

# Plan Task Workflow

Use this skill when a change should be broken into a plan directory under
`specs/plans/`. Create task files only after the plan index and task breakdown
have been discussed and confirmed.

Follow `specs/plans/README.md` for plan naming and file structure. This skill
defines the discussion, decomposition, and execution workflow.

## Workflow

1. Start in conversation, not files.
2. Use the discussion to discover the rough plan boundaries and whether the
   work should become one plan or multiple plans.
3. If the user asks to reserve plan containers before details are settled,
   create only the plan directory and `index.md`.
4. In an unsettled `index.md`, include the plan goal and an empty `Tasks`
   section. Do not add task links, task names, or task checkboxes yet.
5. Continue the plan discussion until the goal, scope, and task sequence are
   confirmed. Keep task entries at outcome level; do not design every task in
   detail during plan discussion.
6. Run the Task Size Check below against every proposed task. Split any task
   that contains multiple independently reviewable outcomes before confirming
   the index.
7. Only after the index is confirmed, populate its `Tasks` section with every
   intended task in execution order.
8. Do not create any `taskN-<description>.md` file until that specific task is
   about to be discussed or implemented.
9. Before creating the current task file, read its prerequisite task files,
   then discuss and confirm only the scope, decisions, file boundaries, and
   verification needed for the current task.
10. Run the Task Size Check again using the task's concrete design. If it is
    too large, revise the index sequence before writing production code.
11. Write the current task file, then read it back before editing production
    code.
12. Implement the current task only.
13. After implementation and verification, report the changed files,
    verification results, and remaining risks.
14. Mark the task complete in `index.md` only after that report is complete.
15. Wait for user confirmation before discussing and creating the next task
    file, then repeat the same flow.
16. After the final task, check the original plan goal and scope for unfinished
    work before treating the plan as complete.

## Task Size Check

A task is appropriately sized when all of the following are true:

- It has one primary implementation outcome.
- Its changed files belong to one coherent responsibility or tightly coupled
  set of responsibilities.
- Its implementation can be reviewed without also reviewing unfinished later
  tasks.
- Its verification demonstrates that outcome without requiring later tasks to
  be implemented.
- Its prerequisite decisions are known, while decisions owned by later tasks
  remain deferred.

Split the task when any of the following is true:

- It establishes a foundation and also consumes that foundation across several
  user-facing surfaces.
- It combines multiple layers that can be implemented and verified in
  sequence, such as storage, application service, API, CLI, Skill, and Web UI.
- It has multiple independently meaningful verification outcomes.
- Its task document starts becoming a second copy of the complete plan.
- Part of the task could be completed, reported, and confirmed before the rest
  begins.

## Rules

- `index.md` is the plan-level progress tracker.
- A plan is the complete delivery boundary; a task is one independently
  reviewable implementation boundary.
- A task may deliver enabling work or only part of a capability.
- Required capability surfaces may be implemented in separate tasks within the
  same plan.
- Do not expand Task 1 merely because the complete plan needs architecture,
  infrastructure, and every user-facing surface.
- Do not front-load detailed decisions for later tasks into the current task
  unless the current implementation depends on them.
- An unsettled plan may have an empty `Tasks` section, but it must not contain
  invented task entries.
- Do not create placeholder task files just to reserve names.
- Create a task file only after that task's scope has been explicitly
  discussed or confirmed.
- Task files are as important as the index and should preserve the reasoning
  needed by later tasks.
- Do not silently expand a task beyond its file.
- When a task becomes too large, revise the index and keep the current task
  limited to the first independently reviewable outcome.
- An enabling task must produce a concrete prerequisite for a confirmed later
  task. Do not use task splitting to introduce speculative foundations.
- Do not skip prerequisite task review.
- Do not mark a task complete in `index.md` until the task has been reported
  complete.
- Do not treat completion of an individual task as completion of the plan.
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
