# Add a Markdown Prompt Editor

## Status

`completed`

## Goal

Improve Prompt creation and editing with a compact Description field and a code-oriented Markdown authoring experience while preserving exact source storage and existing version behavior.

## Detail

Keep New Prompt and Edit Prompt on their shared form while reducing the Description field to two visible rows and replacing the Content text area with a Monaco-like Markdown source editor. The editor provides Source and Preview modes, defaults to Source, and uses the official `@uiw/react-codemirror` Markdown integration with default CodeMirror editing behavior, Markdown syntax highlighting, line numbers, and dynamically loaded fenced-code language support. Preview renders the current draft through Astryx `Markdown` without modifying the saved source. The experience does not provide a formatting toolbar or WYSIWYG editing.

Switching editor modes must not change Content, affect validation, or mark the form dirty. A selected historical version continues to use the same form and editor in a non-editable state; version loading, selection, confirmation, and Restore behavior remain unchanged. Existing exact-content persistence, field validation, save failure handling, navigation blocking, and version creation semantics also remain unchanged.

Limit this outcome to the Prompt New and Edit routes. Prompt View, Trash View, and all other Prompt surfaces continue presenting content as they do today and may adopt Markdown rendering through a separate plan. Choose the concrete source-editor implementation only during Task 001 design after evaluating whether an existing dependency is sufficient or a focused new dependency is justified; the required product behavior does not depend on Monaco itself.

## Scope

- Reduce the Prompt Description input to two visible rows in New and Edit.
- Add a Monaco-like Markdown source editing experience for Prompt Content.
- Use the official CodeMirror Markdown baseline, including default editing capabilities and dynamically loaded fenced-code language highlighting.
- Add Source and Preview modes that operate on the same exact draft value.
- Cover editable, disabled, loading, validation-error, and historical read-only editor states.
- Preserve compatibility with the fixed Prompt header and the Edit route's History panel.
- Preserve Electron-controlled external-link behavior from rendered Markdown preview content.
- Verify extractable renderer logic, static types, lint rules, and the production build without visual automation.

## Out of Scope

- Markdown rendering in Prompt View, Trash View, Prompt cards, or other non-editor surfaces.
- Prompt copy behavior, persistence, IPC, preload, database, or schema changes.
- Formatting controls, WYSIWYG editing, a minimap, application-authored CodeMirror visual theming, or broader IDE behavior beyond the official default setup.
- Editing historical versions or changing version selection, confirmation, or Restore semantics.
- Transforming, normalizing, or otherwise changing the stored Markdown source.
- Renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Decisions

- Keep Markdown as exact source text at the storage boundary so existing Prompt contracts and version semantics remain valid.
- Require a Monaco-like code editing experience without requiring the Monaco implementation itself.
- Follow the official `@uiw/react-codemirror` Markdown configuration first, retaining its default `basicSetup`, Tab indentation, HTML completion, paste-as-link behavior, and fenced-code language loading before applying any future visual customization.
- Use Source and Preview as editor modes rather than page navigation, default to Source, and keep mode switching outside dirty-state calculation.
- Omit formatting controls and WYSIWYG behavior to keep the workflow focused on direct Markdown authoring.
- Reuse the same editor for selected historical versions while disabling source edits and preserving Restore behavior.
- Keep all non-New/Edit Prompt surfaces unchanged for a later independent plan.
- Use Astryx components and design tokens for the surrounding field and Preview surface while leaving the Source editor on CodeMirror's official default visual baseline.

## Tasks

- [x] [Task 001: Upgrade Prompt New and Edit Authoring](./task001_upgrade-prompt-new-and-edit-authoring.md)
