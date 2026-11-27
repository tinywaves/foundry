# Settings implementation

Settings is one of the implemented Web features and CLI business command groups;
Instructions is the other. Keep the existing application shell and placeholder
routes. Providers, captures, fetch jobs, and sessions remain backend capabilities
outside the current Web and CLI feature scope.

## Routes and layout

`app/web/src/app.tsx` composes the hash router. `src/app/main-layout.tsx` owns the
main sidebar and content host, with navigation paths in `src/app/navigation.ts`.
`/library/instructions` renders the Instructions page. Dashboard, Skills, and the
Models routes remain placeholders. The root and unknown routes redirect to
`/dashboard`.

Settings uses the shared full-screen `src/app/full-screen-layout.tsx` at
`#/settings`. Each page route declares its return target through
`handle.backTo`; Settings uses `/dashboard`. A direct visit therefore still has
a predictable destination instead of depending on browser history.

The category is URL state owned by `SettingsPage`:

| Hash route | Category |
| --- | --- |
| `#/settings` or an unrecognized `panel` | Appearance |
| `#/settings?panel=appearance` | Appearance |
| `#/settings?panel=language-region` | Language & Region |
| `#/settings?panel=advanced` | Advanced |

Category changes push history entries and preserve other search parameters.
Browser back/forward therefore also traverses category changes. The default
Appearance category applies within Settings, not to the application's root route.

## Data ownership and synchronization

`SettingsService` reads and updates settings through the JSON storage module.
The Web client uses React Query for fetching, optimistic updates, pending state,
rollback, and reconciliation. Component state holds only interaction inputs such
as open dialogs, selected installation targets, and passphrases.

`useSettingsRealtime` connects to the existing `/api/events` SSE endpoint. A
`settings.changed` event invalidates the Settings query. Connection open and
reconnect also trigger a read, so changes made while disconnected are fetched.
During a local settings mutation, event handling marks data stale without starting
a competing refetch; mutation completion reconciles with persisted settings.
The hook's effect owns the EventSource connection and its cleanup, not fetched data.

The server runtime watches the storage directory for `settings.json` changes,
including atomic replacements made by another CLI process. Notifications are
coalesced with a short debounce and published through the existing event hub.
The watcher starts with the server and closes when the server closes. CLI
settings actions use feature services directly and do not start a server or watcher.

`SettingsProvider` applies resolved theme and language to the document. System
theme changes are subscribed through `useSyncExternalStore`. Timezone labels use
the selected UI language; persisted values use the shared timezone enum.

## CLI and API representations

The CLI intentionally exposes the current editable settings as flat keys. The
API and persisted settings retain their nested structure and backend feature
settings. `settings get` is not a raw dump of `settings.json`.

| CLI key | API response field | PATCH field |
| --- | --- | --- |
| `color-theme` | `workspace.appearance["color-theme"]` | `theme` |
| `language` | `workspace["language-region"].language` | `language` |
| `time-zone` | `workspace["language-region"]["time-zone"]` | `timezone` |
| `time-format` | `workspace["language-region"]["time-format"]` | `timeFormat` |
| `config-folder` | `configFolder` | Read-only |

Allowed values come from `packages/shared/src/settings.ts`. CLI help and the
[Skill Settings reference](../skills/foundry/references/settings.md) document them; no discovery endpoint
or separate list command is needed. Interactive PATCH and CLI set validate the
provided values. Backup import instead performs basic archive/data checks and
normalizes settings before replacement; see [data export and import](data-export.md).

The existing `/api/settings` GET/PATCH contract still supports retained capture
settings. These fields have not been added to the current Web or CLI settings
controls, and their backend support should not be removed as part of UI work.

## Advanced actions

- Export and Import call the separate data-export and data-import features. The
  current dataset contains normalized settings; the pipeline is not restricted
  to the four fields exposed by CLI get/set.
- Config Folder shows the server's absolute configuration directory in monospace.
  Copy uses the browser clipboard; Open asks the backend to open that directory.
- Download Skill uses the existing `/api/settings/skill-copy` GET/POST routes.
  It copies the bundled Foundry CLI usage Skill to selected fixed user-level
  `.agents` and `.claude` directories. It does not download a backup or modify
  Foundry settings. Request and response contracts are shared with the server.

Use React Query for Advanced requests and toast notifications for operation
errors and copy/install success. Keep transfer dialogs in their owning features
and reuse shadcn Dialog, Checkbox, Tooltip, and other preset primitives.
