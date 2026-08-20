# Document Schema

Use these schemas whenever Forge Plan creates or updates persisted plan documents.

## Naming

- Plan directory: `<NNN>_<english-goal-slug>`
- Plan index: `index.md`
- Task file: `task<NNN>_<english-task-slug>.md`
- Display title: use the user's language
- Slugs: lowercase English kebab-case
- Numbers: start at `001` and pad to at least three digits

Do not reuse deleted plan numbers. Keep task numbers aligned with checklist order. Never renumber a task after it leaves `pending`.
Derive the task slug from the task display title. Keep the task heading (`# Task NNN: <Task Name>`) and filename synchronized; if either changes, rename the task file and update every document reference in the same change.

## Plan Index

Create `index.md` with this structure:

```markdown
# <Goal Title>

## Status

`ready`

## Goal

<One bounded product or engineering capability delivered through connected vertical slices.>

## Detail

<Product behavior, motivation, constraints, and architectural direction.>

## Scope

- <Included responsibility>

## Out of Scope

- <Explicitly excluded responsibility>

## Decisions

- <Confirmed decision and rationale>

## Slice Strategy

<The thinnest coherent end-to-end behavior, how later slices expand it, and the
variants intentionally deferred from early slices.>

## Tasks

- [ ] [Task 001: <Task Name>](./task001_<task-slug>.md)
- [ ] [Task 002: <Task Name>](./task002_<task-slug>.md)
```

Use the checklist as the only source of task order and completion. Do not add a `Current Task` field.
Each checklist label and link must match the corresponding task document title and filename.

For new conventional plans, include `Slice Strategy`. Preserve existing plans that predate this section unless the user confirms a plan-structure revision. Incremental Optimization Series indexes describe cumulative completed behavior and do not require a predeclared Slice Strategy.

Update the plan state to `in-progress` when the first detailed task is persisted. Set it to `completed` only after every checklist item is checked and every task has a terminal status.

## Incremental Optimization Persistence

For an explicitly declared Incremental Optimization Series, do not create the plan index or task stubs before implementation. Persist each optimization only after the user confirms documentation synchronization for that completed round.

On the first confirmed synchronization:

- create the plan directory and `index.md`
- set the plan status to `completed`
- describe the cumulative optimization objective in Goal and the current cumulative behavior in Detail, Scope, Out of Scope, and Decisions
- create only `task001_<task-slug>.md`
- add Task 001 as a checked checklist entry

On each later confirmed synchronization:

- leave the documents unchanged until implementation and verification are complete
- append the next sequential checked task entry
- create the matching completed task document in the same change
- update only cumulative current-state statements affected by the new optimization
- preserve all earlier task files, checklist entries, decisions, and historical records
- keep the plan status `completed`

Revisions requested before synchronization remain part of the same optimization task. Do not allocate another task number until the user begins a distinct optimization round. If synchronization is declined, do not persist or later backfill the round without a new explicit confirmation.

## Initial Task Stub

Before task design is approved, keep each task file minimal:

```markdown
# Task 001: <Task Name>

## Status

`pending`
```

Do not persist partial interview notes into a pending task.

## Detailed Task

After the user approves a conventional-plan task design, replace the stub with:

```markdown
# Task 001: <Task Name>

## Status

`ready`

## Goal

<The single implementation outcome of this task.>

## Slice Boundary

- Trigger: <Actor action or system event>
- Observable result: <Behavior or state transition completed by this task>
- Primary invariant: <The most important correctness condition>
- Deferred variants: <Related behavior intentionally left to later tasks>

## Detail

<Concrete implementation design, ownership boundaries, contracts, data flow,
failure behavior, compatibility, and important file-level impact.>

## Findings

None.

## Dependencies

None.

## Deliverables

- <Reviewable artifact or behavior>

## Implementation Checkpoints

- [ ] Checkpoint 1: <Bounded implementation batch, stop condition, and review evidence>
- [ ] Checkpoint 2: <Bounded implementation batch, stop condition, and review evidence>

## Acceptance Criteria

- [ ] <Observable condition required for completion>

## Out of Scope

- <Work intentionally deferred to a later task>

## Handoff

<Stable output the next task will consume.>

## Verification

- `<command or inspection>`
```

Keep acceptance criteria about observable completion, not implementation activity. "Add a file" is a deliverable; "the application rejects invalid input through the approved boundary" is an acceptance criterion.

Implementation Checkpoints govern progress inside the current task; the checklist in `index.md` remains the only source of task order and task-level completion. Use one checkpoint for a genuinely small task. Check a checkpoint only after its stop condition and checkpoint verification succeed. Do not treat a checkpoint as permission to broaden the approved Slice Boundary.

## Completed Optimization Task

When retrospectively persisting a confirmed Incremental Optimization Series round, use the Detailed Task structure with these terminal values:

- set Status to `completed`
- describe the implementation that actually exists, not a proposed design
- omit `Slice Boundary` and `Implementation Checkpoints`; those sections govern prospective conventional-plan slicing and review gates
- use `None.` for Findings unless implementation exposed a material factual observation; resolve its disposition before marking the retrospective task completed
- record only dependencies actually added or selected
- check every satisfied Acceptance Criterion
- describe the stable cumulative baseline for the next optimization under Handoff
- record actual verification commands and results under Verification

Do not create a preceding pending or ready version of this task. The completed task document and checked index entry must be written atomically after synchronization confirmation.

## Finding Entries

Record material factual observations discovered during implementation or verification that could not reasonably have been identified earlier through repository inspection, documentation, research, or design review. Findings are append-only and do not change the approved design by themselves:

```markdown
## Findings

### YYYY-MM-DD: <Short Finding Title>

- Observation: <What was observed or proved false>
- Evidence: <How it was established>
- Consequence: <Whether the approved design is affected>
- Disposition: `Pending review.`
```

Do not use Findings as a scratchpad or to backfill a planning omission. If a Finding affects the approved design, pause and request confirmation before changing the task.

When a confirmed response to a Finding changes implementation details, update `Detail` and the other affected task sections. Preserve the Finding as the factual reason for the change. If the Goal, Scope, Out of Scope, Acceptance Criteria, or task chain must change, use plan change control or create a separate plan.

After the task is completed, review every Finding whose disposition is still pending. Update only its `Disposition` after the user decides:

- `No follow-up.`
- `Candidate for a new plan.`
- `Moved to Plan <NNN>.` after the new plan is persisted.

The Findings review does not reopen the completed task or authorize implementation. Any implementation arising from a completed task's Finding must go through a new plan with the normal persistence and execution confirmations.

## Maintenance Adjustments

Use a Maintenance Adjustment only for a narrow fix or parameter refinement made outside an active task after the affected task is completed. The change must preserve the existing goal, scope, task chain, and independently reviewable outcome.

A user's direct request to implement an out-of-task maintenance adjustment authorizes the implementation but does not authorize documentation synchronization. After each maintenance adjustment, identify the relevant documentation targets and ask the user explicitly whether to synchronize this specific adjustment. Only after confirmation should you update stale current-state statements and append this section to the affected completed task:

```markdown
## Maintenance Adjustments

### YYYY-MM-DD HH:mm:ss: <Short Adjustment Title>

- Change: <What changed in the implementation and current behavior>
- Previous state: <The superseded value, behavior, or constraint>
- Reason: <Why the adjustment was needed>
- Documentation impact: <Which plan or task statements were synchronized>
- Verification: <Evidence that the adjusted behavior works>
```

Capture the repository's local time when writing the adjustment and format the heading exactly to second precision as `YYYY-MM-DD HH:mm:ss: <Short Adjustment Title>`.

Maintenance Adjustments are append-only. Add new second-precision timestamped entries below existing ones only after the user confirms synchronization for that adjustment. Do not remove the previous state from the record, change task status or checklist completion, or use maintenance to introduce a new outcome. If the user declines synchronization, leave the persisted documents unchanged and report that decision.

If the adjustment changes the plan goal, task chain, independently reviewable outcome, or materially broadens scope, do not write a Maintenance Adjustment. Shape a new plan instead.

## Dependency Entries

When a new dependency is approved, summarize the research from `dependency-evaluation.md`:

```markdown
## Dependencies

### `<package-name>`

- Purpose: <Why the task needs it>
- Selected version: `<version or range>`
- Module format: <ESM or dual package>
- TypeScript: <Bundled types or maintained declarations>
- Compatibility: <Relevant project runtime and framework versions>
- Maintenance: <Latest release date and maintenance evidence>
- Adoption: <Current downloads and repository adoption evidence>
- Security and license: <Findings>
- Alternatives: <Candidates rejected and why>
- Sources checked: <Official source names and exact access date>
```

Use `None.` when no new dependency is needed. Existing project dependencies may be named without repeating the full external evaluation unless their suitability is uncertain.

## Terminal Task States

For a completed task:

- set Status to `completed`
- check its Acceptance Criteria
- record actual verification results under Verification
- check its entry in `index.md`
- review unresolved Findings after completion without reopening the task

For a blocked task:

- set Status to `blocked`
- add the blocker and failed verification under Detail or Verification
- leave its entry unchecked

For a cancelled task:

- set Status to `cancelled`
- record the user's reason
- check its entry in `index.md`

For a merged task:

- set Status to `merged`
- replace the remaining body with a short record naming the destination task and reason
- check its entry in `index.md`
- keep the file and checklist link
