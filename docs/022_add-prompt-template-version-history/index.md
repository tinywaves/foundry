# Add Prompt Template Version History

## Status

`ready`

## Goal

Add immutable local version history to Prompt Templates so users can browse, compare, and switch the version currently used by a template without discarding any later history, while creating new versions only when actual content changes are saved.

## Detail

Keep each Prompt Template as a stable identity with its lifecycle state, favorite state, timestamps, and a reference to the currently effective version. Store the template's name, Markdown body, tags, and complete variable definitions in separate immutable version records. A variable definition's name, description, default value, and required state are all versioned content because they affect authoring and resolved Copy behavior.

Create Version 1 when a template is created and mark it as both `Current` and `Latest`. Whenever an explicit save changes the name, Markdown, tags, or variable definitions relative to the current version, create the next monotonically increasing version and switch the current reference to it. Do not create a version for a save with no actual versioned-content change. If the saved content matches a different historical version exactly, still create the next version so the save remains represented in history. Favorite changes, Copy actions, duplication, and transitions between `active`, `trash`, and `removed` do not create versions. A duplicated template is a distinct template with only its own Version 1.

Expose version history from a template's actions in a large History dialog. List versions in descending version-number order and label `Current` and `Latest` independently because they may refer to different versions. Allow users to inspect the selected version's name, tags, variables, and read-only Markdown, and compare it against the current version. Present explicit name changes, tag additions and removals, variable additions, removals, and property changes, and a line-oriented Markdown diff. Do not add rendered rich-text comparison.

Allow an active template to use any retained version. Before switching, show the difference between the current and target versions and require confirmation. `Use This Version` changes only the template's current-version reference; it does not create a version or modify an existing one. Switching back to the latest version follows the same reference-only behavior. After the switch, the template immediately uses the target version's name, Markdown, tags, and variables while retaining its favorite and lifecycle states.

Update the template's `updatedAt` whenever its current-version reference changes. This intentionally moves it according to the library's recent-update ordering and may cause it to leave the current name-search or tag-filter results. Its favorite-filter eligibility remains unchanged. The editor always opens from the current version. If a template with Versions 1 through 5 switches to Version 2 and is then saved with an actual change, create Version 6 and switch to it rather than changing Version 2 or branching the numbering sequence.

Migrate every Prompt Template that predates version storage by creating a Version 1 from its existing versioned content and marking that version as both `Current` and `Latest`. Apply the migration to `active`, `trash`, and `removed` templates without changing their content, favorite state, lifecycle state, or product visibility. Active and Trash templates can expose history in the product, but Trash history is read-only and cannot switch the current version. Templates and versions in the `removed` state remain retained in the database without a product access path.

Retain every version indefinitely. Moving a template to or restoring it from Trash preserves its complete history. Moving it from Trash to `removed` leaves the template and versions logically retained and inaccessible. Loading, comparison, or version-switching failures preserve the current reference and dialog state, provide clear feedback, and offer retry when safely repeatable.

## Scope

- Separate immutable Prompt Template version persistence.
- A current-version reference and latest-version identification for each template.
- Migration of existing `active`, `trash`, and `removed` templates to Version 1.
- New version creation when an explicit save changes versioned content.
- A History dialog with a version list and independent `Current` and `Latest` states.
- Read-only version details for names, tags, variable definitions, and Markdown.
- Structured comparison between a selected version and the current version.
- Confirmed current-version switching for active templates.
- The intended `updatedAt`, ordering, name-search, and tag-filter consequences of switching.
- Read-only history access for Trash templates.
- Purpose-specific shared, main-process, preload, and renderer contract extensions.
- TanStack Query integration and focused automated non-visual verification.

## Out of Scope

- Editing an existing version or rewriting version numbers.
- Deleting an individual version or cleaning up older versions.
- Version retention durations or count limits.
- Version names, notes, or commit messages.
- Manually created snapshots.
- Rendered rich-text comparison.
- Version merging or branching.
- Version-history synchronization, import, or export.
- Product access to `removed` templates or their versions.
- Switching the current version of a Trash template.
- Changes to favorite, Trash, or two-level logical-deletion semantics.
- Functionality outside the core Prompt Template library.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for visual acceptance.

## Decisions

- Store versioned content in separate immutable records and let each Template reference its currently effective version.
- Define `Current` as the effective version and `Latest` as the highest saved version, allowing the states to differ.
- Treat version switching as a current-reference update rather than a restored copy or a new version.
- Create versions only when an explicit save contains an actual versioned-content change.
- Version the name, Markdown, tags, and complete variable definitions together because they jointly determine the template's reusable content and behavior.
- Keep the favorite and lifecycle states on the Template because they are library-management state rather than authored content.
- Use monotonically increasing per-template version numbers without reuse or branching.
- Update `updatedAt` when the current-version reference changes and intentionally allow that to affect recent-update ordering and active filter results.
- Retain all history through every logical lifecycle state without physical deletion.
- Compare a selected version against the current version rather than always comparing against the latest version.

## Tasks

- [ ] [Task 001: Establish Immutable Prompt Template Version Storage](./task001_establish-immutable-prompt-template-version-storage.md)
- [ ] [Task 002: Version Prompt Template Saves](./task002_version-prompt-template-saves.md)
- [ ] [Task 003: Build Prompt Template History and Comparison](./task003_build-prompt-template-history-and-comparison.md)
- [ ] [Task 004: Enable Safe Prompt Template Version Switching](./task004_enable-safe-prompt-template-version-switching.md)
