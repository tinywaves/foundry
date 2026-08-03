---
name: forge-plan
description: Interview-driven workflow for turning a product or engineering goal into a small, reviewable plan and a strictly connected sequence of implementation tasks. Use when the user explicitly invokes forge-plan with a new goal or a plan number, wants to shape requirements before implementation, resume a persisted plan, detail or execute an approved task, or assess whether a small out-of-task adjustment requires persisted documentation updates.
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
- Identify reasonably foreseeable user-visible consequences, interaction states, platform differences, and acceptance boundaries before execution. Do not defer predictable product decisions until implementation.
- Record material facts that could not reasonably have been discovered before execution as Findings. Keep active-task implementation design in `Detail`; reserve Maintenance Adjustments for narrow changes made after task completion.
- Do not use Findings to backfill requirements, acceptance criteria, or consequences that should reasonably have been identified during plan shaping or task design.
- Once a task is completed, do not broaden or reinterpret its scope through Findings. Put independently valuable follow-up behavior in a new plan.
- Review every unresolved Finding after the current task is completed. Keep the completed task closed; if the user decides that a Finding requires implementation, shape that work as a new plan.
- After any fix, polish, parameter change, or other implementation adjustment made outside an active approved task, perform a documentation impact assessment before finalizing. Inspect the relevant persisted plan and task documents for stale behavior, values, constraints, decisions, acceptance statements, and verification records.
- If an out-of-task adjustment requires documentation changes, do not assume code execution approval also authorizes plan-document edits. Explain which documents need synchronization and request explicit confirmation unless the user already authorized both implementation and documentation updates.
- Keep out-of-task maintenance narrow. If the change creates a new independently reviewable outcome, changes the plan goal or task chain, or materially broadens scope, shape it as a new plan instead of recording it as maintenance.
- Never silently delete plan history, task files, earlier decisions, or recorded Findings.

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

Review the proposed outcome from the user's perspective before designing the task chain. Cover the normal flow and any reasonably foreseeable states or side effects relevant to the goal, including interaction behavior, layout consequences, failure behavior, and platform differences. Ask the user to decide any behavior that affects acceptance; do not silently classify it as a future implementation detail.

Distinguish the requested outcome from possible follow-up enhancements. If a behavior is required for the stated outcome to be coherent or usable, resolve it in the current plan. If it is independently valuable and can be accepted separately, explicitly place it out of scope or propose it as a separate goal.

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
4. If every task is checked, verify terminal statuses, treat the plan as completed, and review any Findings whose disposition is still pending.
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

Before requesting task-design confirmation, perform a completeness review:

- walk through the complete user-visible or system-visible result
- identify predictable consequences of the selected implementation approach
- cover relevant interaction states, failure states, and platform variants
- trace every acceptance criterion to a deliverable and verification step
- confirm which adjacent behaviors remain intentionally unchanged or out of scope

Resolve every acceptance-affecting question before execution. If the review exposes independently valuable work, split it into a separate plan or task at the appropriate confirmation gate instead of postponing the decision until implementation.

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

When implementation or verification reveals a material fact that could not reasonably have been discovered from repository inspection, documentation, research, or the pre-execution completeness review, record it in the task's `Findings` section. A Finding is an observation and its evidence; it does not change the approved design or authorize additional work. Examples include an undocumented platform limitation, incompatible dependency behavior, or a contract that differs from the inspected source.

If a Finding requires an in-scope implementation-design adjustment:

1. Pause implementation.
2. Record the factual observation in `Findings`.
3. Explain the Finding and the proposed implementation-detail adjustment.
4. Return to task design.
5. Request confirmation for the proposed adjustment.
6. After confirmation, update `Detail` and any other affected task sections while preserving the Finding that explains the change.
7. Request execution confirmation again.

If a Finding requires changing the plan's Goal, Scope, Out of Scope, Acceptance Criteria, or task chain:

1. Pause implementation.
2. Record and explain the Finding.
3. Return to task design.
4. Treat the required change as plan change control or a separate plan, depending on whether it remains one independently reviewable outcome.

If a Finding does not change the approved design, record it and continue according to the existing task design.

If the issue was reasonably foreseeable, treat it as a planning gap rather than a Finding. Acknowledge the omission, pause execution, and ask the user whether to revise the current uncompleted task or keep the behavior out of scope. Do not present post-hoc scope expansion as an implementation discovery.

After a task is marked `completed`, its confirmed scope and acceptance boundary are closed. Proceed to the Findings review before proposing additional implementation. Do not reopen the task to implement a Finding.

When verification cannot pass, record the concrete blocker and set the task to `blocked`; do not mark it completed.

## Stage 6: Review Findings After Task Completion

Run this review after the current task is marked `completed`.

If the task has no Findings, state that clearly and continue according to the plan checklist. If it has Findings with a pending disposition:

1. Present each Finding's observation, evidence, and consequence.
2. Explain whether it suggests independently reviewable follow-up behavior without treating that recommendation as an approved requirement.
3. Ask the user whether the Finding needs no follow-up or should be shaped into a new plan.
4. Record the confirmed disposition in the completed task:
   - `No follow-up.`
   - `Candidate for a new plan.`
   - `Moved to Plan <NNN>.` after that plan is persisted.

Keep the completed task and its acceptance criteria unchanged throughout this review.

If the user decides implementation is necessary, begin Stage 1 for a new bounded goal. Apply every normal interview and confirmation gate, including explicit confirmation of the complete blueprint before persistence. Do not create or execute the new plan automatically. If multiple Findings imply independently valuable outcomes, propose separate plans and ask the user which one to shape first.

## Out-of-Task Maintenance

Use this path when the user directly requests a narrow fix or adjustment outside an active approved task, including post-completion visual tuning, parameter corrections, and small implementation fixes.

Before finalizing the implementation:

1. Verify that the change preserves the existing goal, scope, task chain, and independently reviewable outcome. If it does not, return to Stage 1.
2. Inspect the relevant persisted plan index and task documents.
3. Decide whether the change makes any documented behavior, constant, constraint, decision, deliverable, acceptance statement, or verification result stale.
4. Report the assessment even when no documentation update is required.
5. When synchronization is required, identify the affected documents and request explicit confirmation unless documentation changes were already authorized.

After documentation synchronization is authorized, read [document-schema.md](references/document-schema.md) and:

- update current-state statements that would otherwise be inaccurate
- append a dated Maintenance Adjustment to each affected completed task
- preserve the superseded value or decision in that record
- record the reason and verification evidence
- keep task status, checklist completion, and task order unchanged

Do not use a Maintenance Adjustment to hide new product behavior, broaden completed scope, or bypass a new plan.

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
