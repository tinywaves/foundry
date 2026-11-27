# Agent Sessions

Vocabulary for Foundry's retained read-only Sessions backend and legacy UI
reference. Sessions is not a page in the current Web UI or a CLI command. These
terms describe the domain without expanding the current implemented feature
scope.

## Language

**Thread**:
A single logical conversation with an agent, identified by a stable thread id. Continuations of the same conversation remain one Thread.
_Avoid_: Session, conversation, chat

**Session**:
The user-facing label for a Thread in the legacy Sessions UI. It is not a separate domain object.
_Avoid_: using Session as an entity name or identifier

**Working Directory**:
The directory recorded as the execution location of a Thread. It provides a folder-based grouping for Threads and does not imply membership in a project defined by an agent application.
_Avoid_: Project

**Transcript**:
The persisted sequence of conversation and execution records for a Thread. A Transcript may span multiple segments.
_Avoid_: database, session index

**Subagent Thread**:
A Thread created by another Thread to perform delegated work.
_Avoid_: child session, sub-session

**Session Source**:
The agent product whose local conversation history is being viewed, such as Codex or Claude Code.
_Avoid_: provider, integration

**Session Snapshot**:
A point-in-time, read-only view of Thread metadata and aggregates for one Session Source.
_Avoid_: cache, import
