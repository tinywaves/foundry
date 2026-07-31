---
name: forge-plan
description: Interview-driven workflow for turning a product or engineering goal into a small, reviewable plan and a strictly connected sequence of implementation tasks. Use when the user explicitly invokes forge-plan with a new goal or a plan number, wants to shape requirements before implementation, resume a persisted plan, detail the next task, or execute an approved task only after a separate confirmation.
---

# Forge Plan

Shape one bounded goal into a reviewable plan, persist it only after confirmation, and advance through one implementation task at a time.

## Invocation

Support exactly these entry forms:

- `/forge-plan <goal>`: start a new plan.
- `/forge-plan <plan-number>`: resume an existing plan, accepting values such as `3` or `003`.

Treat an argument containing only digits as a plan number. Treat any other non-empty argument as a new goal.

## Non-Negotiable Rules

- Grill the user in focused rounds. Turn vague intent into explicit decisions instead of filling important gaps silently.
- Read the repository, existing documentation, dependency manifests, and Git state before asking questions answerable from local context.
- Keep all exploration read-only until the relevant persistence confirmation.
- Do not write a new plan before the user explicitly confirms the complete blueprint.
- Do not expand a task stub before the user explicitly confirms that task's detailed design.
- Do not modify application code or install dependencies before the user separately confirms task execution.
- Keep the plan bounded to one independently reviewable outcome. If it contains multiple independently valuable or independently acceptable outcomes, stop and propose separate goals.
- Prefer more connected tasks over fewer oversized tasks. Every task must produce a handoff consumed by the next task.
- Detail only the first unchecked task. If it cannot be designed without detailing the next task, pause and evaluate whether the two tasks should be merged.
- Treat the Tasks checklist in `index.md` as the only source of execution order and completion. Do not duplicate a current-task field in the plan status.
- Never silently delete plan history, task files, earlier decisions, or confirmed complements.

## Stage 1: Shape a New Plan

### Gather Context

Inspect the project root and directly relevant files. Learn the existing architecture, conventions, constraints, and current workspace state without writing files.

Keep this stage at the product and architecture level. Discuss:

- desired user or system outcome
- motivation and success conditions
- scope and out-of-scope boundaries
- product behavior and important flows
- architectural direction and subsystem boundaries
- constraints, assumptions, risks, and unresolved decisions
- the sequence of task-level handoffs

Do not design concrete schemas, function signatures, IPC payloads, database tables, migrations, or file-by-file implementation yet.

### Grill the Goal

Ask a small set of high-leverage questions per round. Challenge ambiguity, conflicting requirements, hidden scope, and missing acceptance boundaries. Summarize settled decisions between rounds so the user can correct drift.

Do not use task count as the size limit. Treat the plan as too large when it has more than one independently reviewable outcome, more than one independent acceptance boundary, or multiple workstreams that could be delivered separately.

When the goal is too large:

1. Stop planning the original goal.
2. Propose two or more standalone goals and explain their boundaries.
3. Ask the user to select one.
4. Do not create a parent plan or write files.

### Design the Task Chain

Create as many tasks as needed for a coherent linear chain. A task may establish foundations without delivering visible product behavior.

For each task name, verify:

- it has one clear responsibility
- its output can be reviewed
- it produces a concrete foundation or handoff
- the next task can consume that handoff
- it does not require premature design of later tasks

At this stage, define task names and chain intent only. Keep implementation details in the later task-design stage.

### Request Plan Persistence

Present the complete proposed Goal, Detail, Scope, Out of Scope, Decisions, ordered Tasks, proposed plan number, and proposed English kebab-case slug.

Ask for an explicit persistence confirmation. General agreement, answers to questions, or approval of one detail do not count as permission to write.

After confirmation, read [document-schema.md](references/document-schema.md) and create the plan under the project root's `docs/` directory.

## Stage 2: Persist the Plan

Scan directories matching `docs/<number>_*`. Choose the maximum existing numeric prefix plus one, format it with at least three digits, and never reuse a deleted number.

Create:

```text
docs/<plan-number>_<goal-slug>/
├── index.md
├── task001_<task-slug>.md
├── task002_<task-slug>.md
└── ...
```

Use English kebab-case for directory and file slugs. Keep document prose in the user's language. Preserve package names, API names, and code identifiers verbatim.

Initialize the plan as `ready` and every task as `pending`. Task files contain only the task title and Status section until their individual designs are confirmed.

## Stage 3: Resume a Plan

Resolve the numeric argument against `docs/<number>_*`. If there is no match or more than one match, report the ambiguity and do not guess.

Read `index.md`, then inspect tasks in checklist order:

1. Find the first unchecked task.
2. Open its task document.
3. Continue according to its status:
   - `pending`: begin task design.
   - `ready`: ask whether to execute it, revise its design, or pause.
   - `in-progress`: inspect the repository and recorded design, then continue implementation.
   - `blocked`: re-evaluate whether the blocker still exists before proceeding.
4. If every task is checked, verify terminal statuses and treat the plan as completed.
5. If the plan is `paused` or `cancelled`, require an explicit decision before changing that state.

If a task-design interview was interrupted before persistence, its status remains `pending`; restart the interview using the persisted plan and current repository state.

## Stage 4: Design the Current Task

Read the task's direct architectural context and relevant callers before grilling implementation details. This stage may cover concrete:

- data models and storage
- APIs, IPC contracts, and validation
- module ownership and file-level changes
- migrations and compatibility
- failure handling and security
- testing and verification
- dependency selection

Read [dependency-evaluation.md](references/dependency-evaluation.md) whenever a new third-party dependency may be useful. Current online research is mandatory before recommending a new dependency.

Build the task design using the detailed schema in [document-schema.md](references/document-schema.md). Ensure its Deliverables, Acceptance Criteria, Verification, and Handoff are concrete enough to review.

If implementation details from the next task are required, stop. Explain the boundary failure and ask whether to merge the tasks. Do not quietly broaden the current task.

Present the full task design and request explicit confirmation before expanding the task file. After confirmation:

- replace the task stub with the detailed document
- set the task status to `ready`
- set the plan status to `in-progress`
- do not execute code yet

## Stage 5: Execute an Approved Task

Execute only when the current task is `ready` and the user explicitly asks to begin implementation.

The execution confirmation authorizes:

- changing the task status to `in-progress`
- making the code and configuration changes already described by the task
- installing dependencies already approved in the task
- running the planned verification
- marking the task `completed` and checking it in `index.md` when verification succeeds

Do not request another confirmation for routine status transitions covered by that execution approval.

If implementation reveals a material scope change, a new dependency, a changed contract, or an invalid assumption:

1. Pause implementation.
2. Explain the discovery.
3. Return to task design.
4. Add a dated, append-only Complement after confirmation.
5. Update affected task sections without erasing earlier decisions.
6. Request execution confirmation again.

When verification cannot pass, record the concrete blocker and set the task to `blocked`; do not mark it completed.

## Status Model

Use these plan states:

- `ready`: persisted; every task is still `pending`
- `in-progress`: at least one task has been designed, started, blocked, merged, or completed
- `completed`: every task is checked and terminal
- `paused`: explicitly paused by the user
- `cancelled`: explicitly abandoned by the user

Use these task states:

- `pending`: title-only stub; implementation design is not persisted
- `ready`: detailed design is approved; execution has not started
- `in-progress`: execution is approved and underway
- `completed`: deliverables are implemented and verification succeeded
- `blocked`: execution cannot continue for a recorded reason
- `cancelled`: explicitly abandoned
- `merged`: absorbed into another task with the destination recorded

Check a task in `index.md` only when its state is `completed`, `cancelled`, or `merged`.

## Change Control

Require confirmation before changing a persisted plan structure.

When merging tasks:

- explain why the original boundary failed
- show the combined Goal, scope, and Handoff
- update the surviving task after confirmation
- preserve the absorbed task file as `merged`
- record which task absorbed it
- check the merged task in `index.md`

Never renumber a task that is `ready`, `in-progress`, `blocked`, `completed`, `cancelled`, or `merged`. Pending tasks may be renamed, split, reordered, or renumbered only after the user confirms the revised remaining chain. Update all affected links atomically.

## Communication

- Match the user's language.
- Ask questions in manageable rounds rather than one exhaustive questionnaire.
- Separate facts learned from the repository, user decisions, assumptions, and recommendations.
- Surface uncertainty directly.
- Before every confirmation gate, summarize exactly what will be written or executed.
- End each design stage with a direct confirmation request; never infer permission from enthusiasm.
