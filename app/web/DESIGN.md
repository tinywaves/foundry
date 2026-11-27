# Foundry Web UI

Foundry is an operational local workbench. Refine the implemented Instructions
and Settings UI within the existing application structure. Preserve the main
layout, sidebar, titlebar, and placeholder routes; work on one feature does not
remove that skeleton or migrate other business features.

## Visual system

Use shadcn/ui preset `b1D0dv72`: Base UI Mira, neutral base and theme, Inter
Variable, Lucide icons, and the preset radius and surface tokens. Use generated
primitives in `src/components/ui` and Tailwind CSS v4 for application styling.
Keep the CSS entry and tokens in `src/styles/globals.css`.

Component appearance follows the preset. Reuse Dialog, Select, RadioGroup,
Checkbox, Tooltip, and related primitives rather than creating independent
floating panels. Keep generated component code separate from business code.
Use the default button size for every application action: `default` for text
buttons and `icon` for standalone icon buttons. Both are `28px`. Do not
override application action buttons with `xs`, `sm`, `lg`, `icon-sm`, or
`icon-lg`; smaller icon sizes are reserved for controls embedded in compact
fields or toolbars. Generated navigation primitives keep their preset sizing.

Every required form field must show a red `*` in its label using
`RequiredLabel`. Keep the marker `aria-hidden`; required semantics belong on
the field through `required` or `aria-required`. This applies to native inputs
and required composite fields such as checkbox groups.

## Shell and routing

`src/app.tsx` composes the hash router. `src/app/main-layout.tsx` provides the
main sidebar and content host; `src/app/navigation.ts` defines the retained
placeholder routes. The main sidebar uses the generated defaults: `16rem`
expanded, `3rem` collapsed, and an `18rem` mobile sheet below `768px`.

Settings uses the shared full-screen layout with a back button and title. Each
full-screen page route declares an explicit `handle.backTo` target; Settings
returns to Dashboard rather than relying on browser history. Root and unknown
routes open Dashboard. A missing Settings category defaults to Appearance; it
does not change the app's root destination.

## Instructions

Instructions is a page in the main Library layout at
`#/library/instructions`. Feature actions mount through the page header action
slot and sit at the right side of the header. The current page exposes a
New instruction action.

The creation dialog requires both name and content. Use the shared required-label
pattern for both fields. Content uses the locally bundled Monaco Markdown editor,
preserves source text exactly, follows the application theme, and keeps the
editor lazy-loaded with the dialog. Do not add a rich-text toolbar or transform
Markdown source before saving.

## Settings composition

Use a `260px` category column with the existing content host. Below `680px`,
replace the category column with the dropdown category picker. Controls stack
below labels at that breakpoint. Categories remain Appearance, Language &
Region, and Advanced, with selection represented by the `panel` query parameter.
Navigation hover, selected, and keyboard focus states must be distinguishable.

Appearance uses System, Light, and Dark radio options. Language & Region uses
selects for language, timezone, and time format. Timezone names are localized;
the values remain shared timezone identifiers. System theme follows OS changes.
Theme and UI language apply throughout the app, including the shell and toasts.

Advanced contains Export, Import, Config Folder, and Download Skill. Paths are
selectable monospace text and wrap at narrow widths. Config Folder copy shows
brief success feedback and resets its icon. Use toasts for copy success and
operation errors rather than inline error containers.

The Download Skill help icon explains that the bundled Skill teaches agents to
operate Foundry through its CLI. The install dialog shows `.agents` and `.claude`
targets with absolute paths. Keep target options grouped closely, preserve
internal padding, and disable submission when no target is selected or an
operation is pending. Hover and keyboard focus both reveal help text.

## State and dialogs

React Query owns server data and request state. Use skeletons for initial loading,
disable affected controls during writes, and display failures through toasts.
Settings changes propagate across open clients and from CLI writes through SSE.
See [Settings implementation](../../docs/settings.md) for synchronization details.

Export asks for a passphrase and confirmation. Import asks for the selected
backup's passphrase and warns that supported data will be fully replaced.
Password controls support reveal/hide. Prevent duplicate submissions and dialog
closure during transfer. Successful import performs a full page reload without
the hash route; data is fetched again through the normal application startup.

Keep all user-facing copy in the existing four-language i18n resources. Verify
desktop and narrow layouts, keyboard access, hover, pending, loading, and error
states affected by a change. Remaining legacy page designs are reference only,
not requirements to add those pages to the current UI.
