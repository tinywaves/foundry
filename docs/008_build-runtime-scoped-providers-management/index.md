# Build Runtime-Scoped Providers Management

## Status

`completed`

## Goal

Build a functional Providers page in Foundry for managing custom Providers scoped to Claude Code and Codex, with local SQLite persistence, runtime-specific model configuration, avatars, API key actions, and connection testing.

## Detail

Replace the title-only Providers placeholder with a runtime-scoped management surface. The page will place Codex and Claude Code tabs on the left side of its header, an Add provider action on the right, and a table below that shows only the custom Providers owned by the selected runtime. Provider records are completely isolated by runtime, use immutable UUID identities, and may share the same display name.

Each Provider stores a custom avatar, name, Base URL, optional plaintext API key, optional remark, optional official website, runtime-specific model configuration, and a persisted summary of the last connection test. Codex Providers use OpenAI-compatible behavior and require one default model. Claude Code Providers use Anthropic-compatible behavior and require the confirmed Sonnet, Opus, Fable, Haiku, Subagent, and default fallback model mappings.

Provider data will be stored in a SQLite database under Electron's `userData` directory through `better-sqlite3`. The initial schema will use one Providers table, keep runtime-specific model configuration in a versioned field, store custom avatar bytes with the owning Provider record, and retain soft-deleted records. API keys will be stored as local plaintext by explicit product decision. The main process will own database, file-selection, clipboard, and connection-test capabilities; the renderer will access only purpose-specific typed APIs exposed through preload. Native SQLite prebuilds will remain external to the electron-vite bundle and be unpacked explicitly for packaged applications.

The current UI manages only user-created custom Providers. The data model preserves a distinction for future Foundry built-in Providers, but runtime official defaults and Foundry built-in Provider management are not part of this plan. This plan also does not apply a Provider to Claude Code or Codex or modify either runtime's external configuration.

## Scope

- Add Codex and Claude Code runtime tabs with an Add provider action and a table for the selected runtime.
- Create, read, update, and delete runtime-scoped custom Providers identified by immutable UUIDs.
- Allow duplicate Provider names while requiring a non-empty name.
- Store and validate the confirmed common Provider fields: avatar, name, Base URL, optional API key, optional remark, and optional official website.
- Support local avatar upload, replacement, removal, SQLite BLOB persistence, and Astryx default-avatar fallback.
- Require a Codex default model without validating it against the remote Provider.
- Require the confirmed Claude Code Sonnet, Opus, Fable, Haiku, Subagent, and default fallback model mapping fields without remote model validation.
- Render the Name column as avatar plus name without making it an edit trigger.
- Show remark and official website information in a Provider hover popover.
- Show masked API keys with direct Copy and Reveal icon actions.
- Reveal only the selected row's complete API key and automatically re-mask it after 30 seconds, a runtime-tab change, or page departure.
- Keep copied API keys in the system clipboard until the user or another application replaces them.
- Provide Edit and Delete through a row MoreMenu and require confirmation before deletion.
- Test saved Provider values from the table and unsaved current form values from the Add/Edit dialog.
- Persist `Never tested`, `Connected`, and `Failed` connection summaries with the last tested timestamp and a sanitized failure summary.
- Store Provider data in a versioned SQLite database under Electron `userData` using `better-sqlite3` and main-process ownership.
- Soft-delete Provider records while retaining their complete data and excluding them from normal reads and actions.
- Expose constrained, typed preload APIs for Provider operations without exposing arbitrary IPC, filesystem, database, or Electron access.
- Use Astryx components, StyleX, and existing design tokens for all renderer UI.

## Out of Scope

- Applying a Provider to Claude Code or Codex.
- Switching a runtime between a custom Provider and its official default.
- Modifying Claude Code configuration files, environment variables, or authentication state.
- Modifying Codex configuration files or authentication state.
- Selecting the active Provider or model for an Agent.
- Agent configuration or Provider-to-Agent associations.
- Creating, displaying, editing, or deleting Foundry built-in Providers.
- Representing a runtime's official default as a managed Provider row.
- Sharing or synchronizing Provider records across runtimes.
- Discovering remote Providers or model lists.
- Validating whether configured model names exist remotely.
- Provider import, export, cloud synchronization, or account-based backup.
- Search, sorting, pagination, bulk selection, or bulk deletion.
- Remote avatar URLs or drag-and-drop avatar upload.
- API key encryption, secure-storage integration, or platform-specific secure-storage fallback behavior.
- Automatically clearing the system clipboard after copying an API key.
- A SQLite ORM or new general-purpose automated test framework.

## Decisions

- Codex and Claude Code are fixed runtime tabs in the first Providers release.
- A Provider belongs to exactly one runtime, and its runtime cannot change after creation.
- Codex Providers use OpenAI-compatible behavior; Claude Code Providers use Anthropic-compatible behavior.
- The current UI creates only user custom Providers while the persisted model preserves a future Foundry built-in distinction.
- Runtime official defaults are configuration choices for a later Agents plan, not managed Provider records in this plan.
- UUID is the Provider identity; names are required but may be duplicated within or across runtimes.
- Base URL is required and must use `http://` or `https://`.
- API key, remark, official website, and custom avatar are optional; a supplied official website must use `http://` or `https://`.
- Codex default model and every confirmed Claude Code model mapping field are required, but saving never depends on remote model validation.
- Missing custom avatars use the Astryx default avatar.
- Custom avatars are stored as Provider-owned SQLite BLOB data rather than separate managed files.
- Name is rendered with the avatar and is not clickable; editing is available through MoreMenu only.
- Provider hover information contains the optional remark and official website.
- Copy and Reveal are direct API-key cell actions and are not duplicated in MoreMenu.
- API key Reveal is explicit, row-scoped, and re-masks after 30 seconds, runtime switching, or page departure.
- Copy does not require Reveal and does not trigger automatic clipboard clearing.
- Add/Edit dialogs load the complete API key into a password input.
- Connection testing does not block saving and never saves unsaved form changes implicitly.
- The last connection-test result is a persisted historical summary, not a live availability guarantee.
- Provider data is stored under Electron `userData` through `better-sqlite3`; no ORM is added.
- `better-sqlite3` is installed as a runtime dependency, its maintained DefinitelyTyped declarations are installed for development, and its platform prebuilds are explicitly unpacked and verified for macOS Universal packaging.
- Provider deletion is a complete soft delete: the row, plaintext API key, avatar BLOB, model configuration, and test summary remain stored while normal Provider APIs treat the UUID as not found.
- API keys are intentionally stored as local plaintext by explicit product decision and must not be emitted to logs or sanitized error summaries.
- The main process owns SQLite, clipboard, native file selection, and remote connection testing; preload exposes only narrow Provider APIs.
- The existing Electron isolation architecture, React Router route, AppShell, sidebar behavior, and cross-platform packaging direction remain intact.
- UI implementation must use Astryx components, StyleX, and design tokens without raw layout elements, standalone CSS, or another styling system.

## Tasks

- [x] [Task 001: Establish SQLite Provider Persistence](./task001_establish-sqlite-provider-persistence.md)
- [x] [Task 002: Build Runtime Provider Navigation and Table](./task002_build-runtime-provider-navigation-and-table.md)
- [x] [Task 003: Add Provider Create and Edit Workflows](./task003_add-provider-create-and-edit-workflows.md)
- [x] [Task 004: Complete Provider Actions and Connection Testing](./task004_complete-provider-actions-and-connection-testing.md)
