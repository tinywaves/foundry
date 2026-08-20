# Vertical Slicing

Use this reference only while shaping a conventional new plan. An Incremental Optimization Series records already completed rounds and does not predeclare a vertical task chain.

## Core Distinction

- A **plan** owns one coherent product or engineering capability.
- A **task** is one vertical behavior slice within that capability.
- A **checkpoint** is a bounded implementation and review stop inside one task.

Tasks are merge and acceptance boundaries. Checkpoints are not. A checkpoint may temporarily stop after a model, test harness, storage implementation, or transport connection because the completed task will still deliver the full vertical behavior.

## Slice Test

A proposed task is a valid vertical slice only when all of these are true:

1. It can be stated as one actor-triggered behavior, system-visible result, state transition, or independently verifiable invariant.
2. Its acceptance does not require implementing a later task.
3. It may cross technical layers, but every changed layer serves the same behavior.
4. It can be merged or rolled back without leaving unused half-layers or speculative framework code.
5. It establishes a stable handoff that the next slice consumes.
6. It explicitly defers variants that are not required for the thinnest coherent path.

Do not use a fixed line-count limit. Treat review size as suspect when one task introduces more than one new domain concept, authority change, persistence relationship, process boundary, or external side effect. Split the behavior or explain why those concerns are inseparable.

## Slicing Procedure

1. Walk the complete user or system flow from trigger to observable result.
2. Identify its state transitions and authority changes.
3. Select the thinnest path that remains coherent and useful.
4. Include every technical layer required to complete that path.
5. Defer additional providers, platforms, batch behavior, automation, advanced lifecycle states, and polish when the first path works without them.
6. Order later slices so each consumes a stable contract, persisted state, or verified behavior from the previous slice.
7. Give each substantial task internal checkpoints that expose contracts and risky side effects before the next implementation batch.

## Invalid Horizontal Chains

Do not make plan tasks from implementation layers:

```text
Task 1: Add database tables
Task 2: Add Repository
Task 3: Add IPC
Task 4: Add page
```

Do not atomize UI mechanics:

```text
Task 1: Add button
Task 2: Add dialog
Task 3: Add validation
```

Combine each chain into one task stated as the completed behavior. Use its layers or UI mechanics as checkpoints when staged review is useful.

## Foundation Exception

A foundation-only task is allowed only when:

- it proves a concrete invariant through executable verification
- later side effects would be unsafe before that invariant is established
- folding it into the first behavior slice would make that slice materially harder to review
- it does not create speculative extensibility for unapproved future work

Name the invariant, not the artifact. Prefer `Normalize and verify native session events` over `Create session parser framework`.

## Examples

For session observability, prefer:

```text
Import one Codex session and display its normalized messages
Incrementally ingest appended Codex events
Add Claude Code through the normalized session seam
```

For Skill management, prefer:

```text
Sync one built-in target into the local Skill Store
Inspect verified files from a stored Skill Package
Distribute one stored Skill to one Target
Add multi-target partial-success behavior
```

The first task may include schema, Repository, IPC, and renderer work. Those layers are one implementation because they serve one accepted behavior.

## Checkpoint Design

Checkpoints reduce AI generation and human review size without fragmenting the task. A useful sequence is:

1. establish or update the behavior model, invariants, and red-capable verification
2. implement the deepest domain logic and persistence behavior
3. connect process or external-system boundaries
4. connect the user-facing flow
5. run full task verification and cleanup

Do not force this sequence when the task is smaller or risk lies elsewhere. Each checkpoint must name its stop condition and the evidence the reviewer should inspect before continuing.
