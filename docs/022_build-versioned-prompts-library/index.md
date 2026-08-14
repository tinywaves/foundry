# Build a Versioned Prompts Library

## Status

`completed`

## Goal

Replace the Prompt Templates placeholder with a local, versioned Prompts library where users can create, view, edit, copy, safely discard, and recover reusable plain-text prompts without weakening Foundry's existing process and security boundaries.

## Detail

Rename the active product surface from Prompt Templates to Prompts across navigation, page language, the canonical `/agent-extensions/prompts` route, source identifiers, tests, and current repository documentation. Do not retain a compatibility route for `/agent-extensions/prompt-templates`. Preserve completed plan documents as historical records rather than rewriting their terminology.

Store Prompts in Foundry's existing local SQLite database behind a Prompt-owned main-process subsystem, constrained IPC handlers, a narrow preload API, and renderer-safe shared contracts. A Prompt has an immutable identity, a required title, required plain-text content, an optional description, and lifecycle timestamps. Titles may be duplicated because identity is determined only by the Prompt ID. Keep all Prompt and version data local to Foundry, with no count limit, expiration, or automatic retention policy.

Treat Prompt content as exact plain text. Preserve line breaks, indentation, Markdown-like syntax, code, structured text, and leading or trailing whitespace without parsing or rendering the content as Markdown. Viewing and copying must use the stored source text rather than a transformed representation.

Create an immutable initial version with each Prompt. Every explicit edit save that changes the title, description, or content creates another immutable version; a no-op save does not. The normal Prompts page uses a full-width table ordered by content update time and provides full-width View, Create, and Edit workflows. The View workflow presents the current Prompt and supports copying it. Create and Edit use explicit Save and Cancel actions. Leaving an editor with unsaved changes, switching away from the current Prompt, or selecting a historical version requires confirmation before discarding those changes.

Expose version history only from the Edit workflow. Opening History adds a closable, bounded, resizable right-side panel that compresses the editor content region instead of overlaying it. Selecting a historical version replaces the main content region with a read-only view of that snapshot and exposes Copy and Restore actions. Restore requires confirmation, creates a new latest version from the selected snapshot, and returns the editor to the latest version. History remains linear, immutable, and unlimited; version comparison and branching are not part of this goal.

Move a deleted Prompt into Trash only after confirmation while retaining its complete current data and version history. Trash uses a full-width table and supports View, Restore, Remove from Trash, and Empty Trash. Trash View exposes only the Prompt state that was current when it was deleted and does not expose Copy, Edit, or History. Restore returns the same Prompt identity and versions without creating a version or changing its content update time. Restoring from the Trash table keeps the user in Trash without selecting the restored row, while restoring from Trash View navigates to the restored Prompt's normal View. Remove from Trash and Empty Trash require confirmation and make affected records permanently inaccessible through the product while retaining their data as logically removed rows in SQLite. Trash has no bulk selection, bulk restore, expiration, or physical deletion behavior.

Present loading and command failures as direct failure feedback without a dedicated Retry control. Preserve the current editor input, selected historical snapshot, table contents, and dialog context whenever the failed operation has not completed. Copy operations report success or failure without changing stored data.

Build the renderer with the existing Astryx components, StyleX, design tokens, and Lucide icons. Keep the table, detail, editor, history, confirmation, empty, and failure states within the existing AppShell and renderer route boundary. Preserve the repository's non-visual verification policy and do not add another styling system or broaden renderer access to Electron, SQLite, the filesystem, or arbitrary IPC.

## Scope

- Rename the active Prompt Templates product surface and canonical route to Prompts.
- Add local versioned Prompt persistence to the existing Foundry SQLite database.
- Add constrained shared contracts, main-process ownership, IPC handlers, and preload methods for Prompt operations.
- Add the full-width Prompts table, current-version detail, plain-text copy, Create, Edit, and delete-to-Trash workflows.
- Add immutable version creation, interactive history browsing, historical copy, and confirmed history restoration.
- Add Trash viewing, restoration, logical removal, and confirmed Empty Trash behavior.
- Protect unsaved edits and preserve user context when operations fail.
- Cover normal, empty, loading, failure, confirmation, and lifecycle states with focused automated and static verification.
- Update current repository documentation to describe the available Prompts feature while preserving completed plan history.

## Out of Scope

- Prompt variables, interpolation, role-based messages, arbitrary message sequences, or Assistant examples.
- Markdown rendering, rich-text editing, formatting toolbars, or transformed clipboard output.
- Tags, categories, favorites, search, manual sorting, or version comparison.
- Prompt import, export, filesystem synchronization, cloud synchronization, sharing, or account-based backup.
- Sending or applying a Prompt to an Agent, Runtime, Session, Provider, or external application.
- Trash copy, editing, history access, bulk selection, bulk restoration, expiration, or physical data deletion.
- Recovery of records after Remove from Trash or Empty Trash through the product.
- A compatibility route for the former Prompt Templates path.
- Rewriting terminology in completed historical plan and task documents.
- New dependencies, another styling system, or visual automation infrastructure.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for visual acceptance.

## Decisions

- Use Prompts as the product and domain name because the feature stores reusable fixed text without template variables.
- Support only one plain-text content value per Prompt in the first release.
- Require a title and content, allow an optional description, and allow duplicate titles because Prompt ID is the only identity.
- Preserve Prompt source text exactly and never interpret Markdown-like syntax in the viewer.
- Use a full-width table and full-width detail and editor pages instead of a persistent master-detail split.
- Keep History inside Edit and use a closable, bounded, resizable panel that compresses the content region.
- Create a version on creation and on each material explicit edit save, with no version count or retention limit.
- Require confirmation before restoring a historical version, then record the restoration as a new latest version.
- Require confirmation before moving an active Prompt to Trash.
- Let Trash View expose the deleted current version without Copy, Edit, or History.
- Restore a trashed Prompt without creating a version or changing its content update time.
- Name the destructive lifecycle actions Remove from Trash and Empty Trash because their data remains logically retained in SQLite.
- Require confirmation for Remove from Trash and Empty Trash, then make affected rows permanently inaccessible through product APIs.
- Do not add batch selection or bulk restoration; Empty Trash is the only aggregate Trash command.
- Show direct failure feedback and preserve current context without a dedicated Retry control.
- Keep data local to Foundry and preserve the existing main, preload, renderer, and Electron security boundaries.
- Use existing dependencies and the repository's Astryx, StyleX, design-token, and non-visual verification conventions.

## Tasks

- [x] [Task 001: Establish Versioned Prompt Persistence and APIs](./task001_establish-versioned-prompt-persistence-and-apis.md)
- [x] [Task 002: Build the Prompts Library and Core Management Workflows](./task002_build-the-prompts-library-and-core-management-workflows.md)
- [x] [Task 003: Add Interactive Prompt Version History](./task003_add-interactive-prompt-version-history.md)
- [x] [Task 004: Complete the Prompt Trash Lifecycle](./task004_complete-the-prompt-trash-lifecycle.md)
