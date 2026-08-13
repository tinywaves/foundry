# Build the Core Prompt Template Library

## Status

`ready`

## Goal

Replace the Prompt Templates placeholder with a cohesive local library for authoring, organizing, reusing, and managing Runtime-independent prompt fragments as single Markdown documents with interactive variables and a copy-focused output workflow. Align the page title and empty-state presentation with Foundry's established feature-page and navigation conventions as the visual foundation for the module.

The library manages reusable content without invoking an Agent Runtime, creating an Agent Session, or executing a prompt.

## Detail

First establish the Prompt Templates page presentation foundation. Match the compact upper-left title treatment used by Runtimes and Providers, including its visual level, semantic page-heading level, spacing, and alignment. Keep controls and toolbars dependent on actual page functionality rather than adding placeholder chrome. Align Prompt Template empty-state terminology and its `FileText` icon with the Prompt Templates navigation destination while allowing the initial library, filtered results, and Trash states to provide context-specific explanations and actions in one consistent structural style.

Present Prompt Templates as a local content library that follows the established page-heading and functional toolbar hierarchy used by Runtimes and Providers. The page provides name search, tag filtering, a favorites filter, access to Trash, and a New Template action above a compact template list. Each active template exposes its name, content summary, tags, favorite state, update time, Copy action, and focused management actions. Sort active templates by most recently updated; favorites affect filtering rather than ordering.

Store each template as a stable record whose identity does not depend on its non-unique name. A template contains a required name, required single-document Markdown body, tags, favorite state, variable definitions, and lifecycle timestamps. Tags are created and selected inside template authoring rather than through a separate management destination.

Use an explicit source-editing and preview experience for authoring Markdown. The editing mode preserves Markdown source while supporting syntax presentation, interactive variable tokens, and a cursor-positioned variable picker triggered by typing `{{`. Users can choose an existing variable or create one in place. Only placeholders declared through this interaction are treated as variables; otherwise matching text remains ordinary Markdown. Each variable has a name, description, default value, and required state, and repeated occurrences of the same variable share one definition. Do not silently discard a variable definition after its last token is removed; surface unused definitions at save time so the user can retain or clean them. The preview renders common Markdown without executing raw HTML, and links retain Foundry's controlled external-opening behavior. Creation and editing use explicit Save and Cancel actions, and closing with unsaved changes requires confirmation.

Make Copy the primary reuse workflow. Templates without variables copy their Markdown source immediately. Templates with variables open a value-entry dialog: default values are prefilled, repeated variables are entered once, required empty values prevent copying, and optional empty values resolve to empty strings. Show a live preview of the resolved Markdown source. A successful action copies that resolved source, closes the dialog, and reports success.

Search only template names. Tag filters support multiple selections with OR semantics, so a template matches when it contains any selected tag. Name search, the tag filter, and the favorites filter combine with AND semantics. Preserve active conditions when no templates match and provide a way to clear them. The initial library has no built-in or example templates and presents an action-oriented empty state.

Allow users to favorite templates without changing their sort position. Duplicate copies the Markdown body, variable definitions, and tags but does not inherit the favorite state. Generate readable duplicate names as `Original Copy`, `Original Copy 2`, and subsequent numbered variants even though names are not unique, then leave the user in the library rather than opening the new record for editing.

Treat deletion as a three-stage logical lifecycle: `active`, `trash`, and `removed`. Active-template deletion moves a record into a separate Trash view. Trashed templates cannot be copied, duplicated, or edited. Trash supports restoring one template, using Remove Template to move one record into the inaccessible `removed` state, and using Empty Trash to move every Trash record into that state. Remove Template and Empty Trash require confirmation that the affected records will no longer be accessible or recoverable through Foundry even though their data remains in the local database. Trash records do not expire automatically, `removed` records remain retained indefinitely and appear in no product view, and restoration from Trash preserves the content, variables, tags, and favorite state.

Persist the library locally through the existing SQLite foundation and expose only purpose-specific, validated operations across the main, preload, and renderer boundaries. Follow the established TanStack Query approach for renderer asynchronous state. Loading, saving, copying, restoring, and deletion failures preserve recoverable input or page state, provide clear feedback, and offer retry where the operation remains safely repeatable.

## Scope

- A Prompt Templates page presentation foundation whose upper-left title matches the established Runtimes and Providers title treatment.
- Navigation-aligned Prompt Template empty-state terminology and iconography with state-specific explanations and actions.
- Local SQLite persistence for active and trashed Prompt Templates.
- Purpose-specific validated operations across the shared contract, main process, preload, and renderer boundaries.
- Prompt Template creation, reading, editing, deletion, and local organization.
- Single-document Markdown source authoring and safe preview.
- A `{{` variable trigger, inline variable presentation, and variable definitions.
- Variable value entry, resolved Markdown preview, and clipboard copying.
- Name-only search.
- Multi-tag OR filtering and an independent favorites filter.
- Favorite and unfavorite actions.
- Template duplication with readable generated names and a reset favorite state.
- Moving individual templates to Trash, restoring them, and logically removing them from product access.
- Empty Trash through the same confirmed logical-removal transition.
- Initial empty, filtered-empty, loading, and failure states.
- TanStack Query integration for renderer asynchronous state.
- Focused automated behavior coverage and the repository's required non-visual verification.

## Out of Scope

- Agent Runtime, Provider, or Agent Session integration.
- Prompt execution, model requests, or message delivery.
- `system` and `user` multi-message templates.
- Runtime-specific template structures or Runtime configuration-file generation.
- Built-in templates, example records, import, or export.
- Rich-text authoring.
- A separate tag-management page.
- Template pinning or favorite-based sorting.
- Bulk selection or bulk template operations.
- Template version history, version browsing, or version restoration.
- Undoing a deletion outside the explicit Trash restore workflow.
- Automatic Trash expiration.
- Physical deletion of Prompt Template data from the local database.
- Restoring or otherwise accessing templates after they enter the `removed` state.
- Database cleanup or retention-management tools for `removed` templates.
- Changes to the Skills, MCP Servers, or Sessions placeholder-page headers.
- Application-wide empty-state alignment outside Prompt Templates.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for visual acceptance.

## Decisions

- Establish the Prompt Templates page presentation foundation before its data and authoring workflows so every later state inherits one approved title and empty-state contract.
- Match the Runtimes and Providers upper-left title treatment without adding controls or toolbars that the Prompt Templates workflow does not require.
- Use the Prompt Templates navigation label and `FileText` icon as the terminology and iconography source for its empty states while keeping explanations and actions specific to each empty condition.
- Model each Prompt Template as one Runtime-independent Markdown document because the product outcome is local management and reuse rather than direct model invocation.
- Make Copy the terminal workflow for this module and keep prompt execution in a separate independently reviewable outcome.
- Preserve standard Markdown source and textual `{{name}}` placeholders underneath the interactive editing experience.
- Use an editor capable of cursor-positioned completion and inline decoration so `{{` can open an interactive variable picker without replacing the portable source representation.
- Evaluate current editor and Markdown-rendering dependencies during the relevant task design rather than selecting packages at plan level.
- Recognize a placeholder as a variable only when it is declared through the variable interaction, allowing otherwise matching Markdown text to remain literal without introducing an escape syntax.
- Provide source-editing and preview modes instead of a permanently split view so authoring remains usable within Foundry's current window constraints.
- Disable raw HTML execution in Markdown preview and preserve the existing controlled external-link boundary.
- Allow duplicate names and use stable record identity rather than name uniqueness.
- Search names only; use tags and favorites as explicit filters rather than widening full-text search.
- Combine selected tags with OR semantics, then combine name, tag, and favorite conditions with AND semantics.
- Keep favorites separate from ordering and omit a pinning concept.
- Duplicate content, variables, and tags while resetting the favorite state and remaining on the library page.
- Represent deletion as `active`, `trash`, and `removed` logical states; Trash remains recoverable, while `removed` records are inaccessible through Foundry but retained indefinitely in the local database.
- Name the single-record Trash action Remove Template rather than Permanently Delete, require confirmation that Foundry cannot recover the result, and apply the same disclosure and transition to Empty Trash.
- Defer version history, bulk operations, and placeholder-page header alignment to separate follow-up plans.

## Tasks

- [ ] [Task 001: Establish Prompt Template Page Presentation Foundation](./task001_establish-prompt-template-page-presentation-foundation.md)
- [ ] [Task 002: Establish Prompt Template Persistence and APIs](./task002_establish-prompt-template-persistence-and-apis.md)
- [ ] [Task 003: Build Prompt Template Library Browsing and Organization](./task003_build-prompt-template-library-browsing-and-organization.md)
- [ ] [Task 004: Add Markdown Authoring and Interactive Variables](./task004_add-markdown-authoring-and-interactive-variables.md)
- [ ] [Task 005: Complete Template Copy and Duplication Workflows](./task005_complete-template-copy-and-duplication-workflows.md)
- [ ] [Task 006: Complete Prompt Template Trash Lifecycle](./task006_complete-prompt-template-trash-lifecycle.md)
