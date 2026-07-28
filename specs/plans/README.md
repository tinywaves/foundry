# Implementation Plans

Save all implementation plans in this directory. Every plan is a numbered
directory containing an `index.md` and independently reviewable task files.
Create or update the relevant plan before changing production code, and wait
for user confirmation between tasks.

## Plan Directory Naming

Use this directory name format:

```text
NNN_module_plan-name/
```

- `NNN` is a zero-padded three-digit sequence number beginning with `001`.
- `module` is a concise lowercase identifier for the affected module. Use
  hyphens for multiple words.
- `plan-name` is a descriptive lowercase name with words joined by hyphens.
- Use underscores only between the number, module, and plan name.
- For each new plan, increment the highest existing sequence number. Do not
  reuse missing numbers or renumber existing plans.

Examples:

```text
001_web_initial-dashboard/
002_cli_static-server-errors/
003_build-config_production-output/
```

## Task File Naming

Each plan directory must contain an `index.md` and one or more task files. Use
this filename format for task files:

```text
task1-<description>.md
task2-<description>.md
```

- Number tasks in implementation order without zero padding.
- Keep each task independently reviewable and narrow enough to confirm before
  starting the next task.
- Treat each task file as a complete, living implementation plan for that
  task. It must record the goal, context from prerequisite tasks, confirmed
  behavior, expected file scope, implementation boundaries, and verification
  approach.
- Before implementation starts, review and confirm the current task file.
- When later tasks depend on earlier work, read the prerequisite task files and
  keep their decisions and outcomes consistent.
- Keep later tasks out of an earlier task's implementation scope. A task may
  record dependencies on earlier tasks, but it must not silently implement
  them.

## Plan Index

The `index.md` file is the plan-level source for task order and progress. It
must:

- state the overall goal and scope of the plan;
- list every intended task in implementation order;
- link to each task file with a relative path;
- show task status with an unchecked checkbox until implementation and
  verification are complete;
- show a checked checkbox only after the task is complete and the user-facing
  completion report has been made.

Example:

```md
# Plan

## Tasks

- [ ] [Task 1: Define the contract](task1-define-the-contract.md)
- [ ] [Task 2: Implement the service](task2-implement-the-service.md)
```

## Required Dependency Section

Every task file must include a **Dependency Changes** section with exactly
these four items. Use `None` when no changes are required:

1. Dependencies to remove
2. Dev dependencies to remove
3. Dependencies to add
4. Dev dependencies to add
