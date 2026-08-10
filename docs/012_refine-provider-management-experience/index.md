# Refine Provider Management Experience

## Status

`completed`

## Goal

Record and preserve the twelve completed Provider-management UI refinements delivered across the active Electron renderer. The refinements improve terminology, hierarchy, form density, avatar selection, API-key handling, and connection-test feedback without changing Provider persistence, IPC contracts, or runtime behavior.

## Detail

The Providers page now presents a clearer page header and a compact runtime switcher. Provider dialogs use a smaller, intentional header with a single divider, omit redundant visual section headings, and keep the form focused on the fields themselves. Avatar selection previews the selected image immediately and makes the preview the primary interaction. API keys can be revealed transiently in the form.

Connection testing remains a draft-provider `GET` request owned by the existing main-process tester. The dialog explains that method through a hover/focus card and renders the latest test result beside the Test Connection action so users do not need to scroll back to the form top.

## Scope

- Provider navigation icon and Providers page hierarchy.
- Provider dialog header, dividers, section semantics, and footer actions.
- Avatar preview and picker interaction.
- API-key password/text visibility control.
- Connection-test method explanation and inline result feedback.
- CSP support for renderer-created `blob:` avatar preview URLs.
- Documentation of the final state and rejected intermediate direction.

## Out of Scope

- Provider table/list redesign or row-level behavior.
- Changing Base URL validation or connection-test request semantics.
- Changing the Provider database schema, avatar storage type, API contracts, IPC, preload, or main-process ownership.
- Changing the `Required`/`Optional` field-label convention. The attempted custom red-asterisk treatment was rejected and the existing Astryx field behavior remains in place.
- Route compatibility aliases for the former plural Agent Runtimes paths.
- Application launch or visual automation; visual acceptance remains with the user.

## Decisions

- Use Lucide `Plug` for the Providers navigation item because it communicates endpoint connectivity more directly than the previous icon.
- Keep `Providers` as the page title, separate from the runtime tabs and Add Provider action.
- Remove unnecessary toolbar dividers; retain only purposeful dialog header and footer dividers.
- Remove visible `Details`, `Connection`, and `Models` headings while retaining accessible section labels.
- Use a custom Astryx `LayoutHeader` with a smaller `Heading` and an icon-only close action.
- Use `Thumbnail` as the clickable avatar picker and its built-in remove affordance; do not show the selected file name or a separate choose/replace button.
- Keep avatar data as validated MIME type plus `Uint8Array` bytes in the typed contract and SQLite `BLOB` storage. Use a renderer `Blob` URL for preview and allow `blob:` in the renderer image CSP.
- Keep API-key visibility in local component state only. The reveal control switches between password and text input and uses `Eye`/`EyeOff` icons.
- Use `HoverCard` for connection-test method details because it opens on hover and keyboard focus. Use runtime-specific copy without exposing actual Base URL or API-key values.
- Render connection-test feedback beside the footer action with `StatusDot` and a compact text label. Long failure details truncate with a tooltip.

## Tasks

- [x] [Task 001: Record Provider Management UI Refinements](./task001_record-provider-management-ui-refinements.md)
