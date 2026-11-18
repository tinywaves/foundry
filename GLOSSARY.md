# Codex Sessions

Vocabulary for Foundry's read-only view of agent conversation history.

## Language

**Thread**:
A single logical conversation with an agent, identified by a stable thread id. Continuations of the same conversation remain one Thread.
_Avoid_: Session, conversation, chat

**Session**:
The user-facing label for a Thread in the Sessions page. It is not a separate domain object.
_Avoid_: using Session as an entity name or identifier

**Project**:
A user-defined grouping of one or more repository roots that organizes Threads. Thread membership is independent of the Thread's working directory.
_Avoid_: workspace, repo, folder

**Projectless Thread**:
A Thread explicitly marked as not belonging to any Project.
_Avoid_: unassigned, orphaned

**Unassigned Thread**:
A Thread with no recorded Project membership. It is not the same as a Projectless Thread.
_Avoid_: projectless

**Subagent Thread**:
A Thread created by another Thread to perform delegated work.
_Avoid_: child session, sub-session

**Session Source**:
The agent product whose local conversation history is being viewed, such as Codex or Claude Code.
_Avoid_: provider, integration

**Session Snapshot**:
A point-in-time, read-only view of Thread metadata and aggregates for one Session Source.
_Avoid_: cache, import
