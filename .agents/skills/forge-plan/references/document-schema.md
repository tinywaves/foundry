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

## Plan Index

Create `index.md` with this structure:

```markdown
# <Goal Title>

## Status

`ready`

## Goal

<One bounded, independently reviewable outcome.>

## Detail

<Product behavior, motivation, constraints, and architectural direction.>

## Scope

- <Included responsibility>

## Out of Scope

- <Explicitly excluded responsibility>

## Decisions

- <Confirmed decision and rationale>

## Tasks

- [ ] [Task 001: <Task Name>](./task001_<task-slug>.md)
- [ ] [Task 002: <Task Name>](./task002_<task-slug>.md)
```

Use the checklist as the only source of task order and completion. Do not add a `Current Task` field.

Update the plan state to `in-progress` when the first detailed task is persisted. Set it to `completed` only after every checklist item is checked and every task has a terminal status.

## Initial Task Stub

Before task design is approved, keep each task file minimal:

```markdown
# Task 001: <Task Name>

## Status

`pending`
```

Do not persist partial interview notes into a pending task.

## Detailed Task

After the user approves the task design, replace the stub with:

```markdown
# Task 001: <Task Name>

## Status

`ready`

## Goal

<The single implementation outcome of this task.>

## Detail

<Concrete implementation design, ownership boundaries, contracts, data flow,
failure behavior, compatibility, and important file-level impact.>

## Complement

None.

## Dependencies

None.

## Deliverables

- <Reviewable artifact or behavior>

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

## Complement Entries

Use Complement for confirmed changes discovered after the initial task design. Preserve previous entries and append new ones:

```markdown
## Complement

### YYYY-MM-DD: <Short Decision Title>

- Discovery: <What changed or proved false>
- Decision: <Confirmed adjustment>
- Impact: <Affected scope, contracts, dependencies, or verification>
```

Do not use Complement as a scratchpad. A material complement requires persistence confirmation and a new execution confirmation.

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
