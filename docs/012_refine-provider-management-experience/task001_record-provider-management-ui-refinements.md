# Task 001: Record Provider Management UI Refinements

## Status

`completed`

## Goal

Capture the final implementation decisions for the thirteen Provider-management optimizations and provide a stable reference for future UI work.

## Final Refinements

### 1. Replace the unclear Providers icon

Replace the Providers navigation icon with the Lucide `Plug` icon. The icon now communicates an endpoint or connection integration more clearly than the previous `ServerCog` treatment. No custom SVG or new dependency is introduced.

### 2. Recompose the Providers page header

Separate the `Providers` page title and `Add Provider` action into a dedicated Astryx `Section`. Keep the Codex and Claude Code controls in a compact runtime `Toolbar` below the title row. This prevents the title, runtime switcher, and primary action from competing for the same visual space.

### 3. Remove excessive horizontal dividers

Remove the unnecessary bottom divider from the Providers runtime toolbar. The page uses spacing and the separate title band to establish hierarchy. Dialog header and footer dividers remain because they define the dialog frame and action boundary.

### 4. Remove redundant form section headings

Remove the visible `Details`, `Connection`, and `Models` headings from the Provider form. Keep semantic `aria-label` values on the corresponding sections so assistive technology retains the grouping without adding repeated visual chrome.

### 5. Reduce the dialog header title size

Replace the previous dialog title/subtitle treatment with an explicit Astryx `Heading` at `level={3}` and `accessibilityLevel={2}`. The title remains `Add Provider` or `Edit Provider`, while the header no longer consumes form space with a large secondary runtime subtitle.

### 6. Add a purposeful dialog header divider

Use `LayoutHeader hasDivider` to create one deliberate underline below the dialog header. The same frame keeps `LayoutFooter hasDivider` so the form content and actions remain clearly separated.

### 7. Preview the selected avatar immediately

When the native avatar picker returns a valid image, the renderer creates a preview URL from the image MIME type and `Uint8Array` bytes immediately. The file name is deliberately discarded from the visual state because it is not useful to the user. The renderer CSP allows `blob:` image sources so the preview can render safely.

Avatar persistence is unchanged: the shared `ProviderAvatar` contract contains `mimeType` and `bytes`, and the main-process repository stores the bytes in SQLite `avatar_data BLOB` with the MIME type in `avatar_mime_type`. The implementation does not convert the stored image to Base64.

### 8. Make the avatar preview the picker action

Remove the separate `Choose Image`/`Replace` button. Clicking the `Thumbnail` opens the picker, and the component's built-in remove affordance handles removal when an avatar exists. The preview is therefore both the result and the primary action.

### 9. Use singular Agent Runtime terminology

Use `Agent Runtime` for the sidebar section and canonical route identifiers. The active paths are `/agent-runtime` and `/agent-runtime/providers`; the parent route redirects to the Providers route. Dashboard navigation uses the singular path, while existing `ProviderRuntime` types and the `runtime` query parameter remain unchanged because they are accurate domain identifiers.

### 10. Add API-key reveal in the form

Wrap the API-key field in an Astryx `InputGroup` with an `Eye`/`EyeOff` icon button. The field switches between `password` and `text` types using local `isVisible` state. Clearing the value hides it again, and disabled/loading states disable the reveal action. The complete key is never added to list data or persisted reveal state.

### 11. Explain the connection-test method on hover

Wrap `Test Connection` in an Astryx `HoverCard` with `focusTrigger="always"`. The content uses runtime-specific inline `Code` values:

- Codex sends `GET` to the Base URL with `/models` appended and uses `Authorization: Bearer <API key>` when a key is present.
- Claude Code sends `GET` to `/v1/models`, or `/models` when the Base URL already ends in `/v1`; it uses `x-api-key` and `anthropic-version: 2023-06-01`.
- Any `2xx` response passes, redirects fail, and the request times out after `15s`.

The hover content describes the method without showing the configured URL or secret value.

### 12. Show the test result beside the action

Remove the connection-test success and failure Banners from the scrollable form content. Render a compact status next to `Test Connection` in the footer instead:

- Success: a green `StatusDot` and `Connection successful`.
- Failure: a red `StatusDot` and the failure reason, including request or network errors.
- Long messages: single-line truncation with the existing text tooltip behavior.
- While a new test is pending: hide the prior result while the button shows its loading state.

Save errors and avatar warnings remain in the form because they belong to different workflows.

### 13. Vertically align Claude Code model-role labels

Set the Claude Code model-mapping `Table` to `verticalAlign="middle"`. Role labels such as `Sonnet`, `Opus`, and `Haiku` now align with the visual center of the taller input controls in the same row instead of sticking to the row's top edge. The table's row dividers, column widths, input behavior, and model data remain unchanged.

## Dependencies

- Existing Astryx `Section`, `Toolbar`, `Layout`, `Thumbnail`, `InputGroup`, `Code`, `HoverCard`, `StatusDot`, and text components.
- Existing typed Provider contract and query/mutation adapters.
- Existing main-process avatar picker, validation, repository, and connection tester.
- No new package dependency.

## Deliverables

- Provider page with separated title/action and runtime controls.
- Provider dialog with compact header, purposeful dividers, and uncluttered form sections.
- Immediate avatar preview with clickable `Thumbnail` interaction.
- Local API-key reveal control.
- Runtime-specific connection-test method hover card.
- Footer-adjacent connection-test result feedback.
- Vertically centered Claude Code model-role labels.
- CSP and storage behavior documented without changing avatar persistence format.

## Acceptance Criteria

- [x] Providers uses the Lucide `Plug` icon in the active sidebar.
- [x] The Providers title, Add Provider action, and runtime tabs occupy distinct layout regions.
- [x] The runtime toolbar no longer adds an unnecessary divider.
- [x] `Details`, `Connection`, and `Models` are not visible form headings, while their semantic section labels remain available.
- [x] Add and Edit Provider dialogs use a smaller explicit header title with a visible divider and close action.
- [x] Selecting an avatar updates the preview without displaying the file name.
- [x] Clicking the avatar preview opens selection, and the separate choose/replace action is absent.
- [x] Agent Runtime terminology and singular routes are used by the active renderer.
- [x] API keys can be revealed and hidden in the form without changing persistence or list exposure.
- [x] Hovering or focusing Test Connection explains the actual runtime-specific request method.
- [x] Connection-test success and failure feedback appears beside the Test Connection action.
- [x] Claude Code model-role labels are vertically centered with their row inputs.
- [x] `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass.

## Out of Scope

- Provider list/table optimization.
- Changes to Base URL parsing, HTTP method, status handling, timeout, redirect policy, or authentication behavior.
- Database, IPC, preload, shared-contract, and main-process architecture changes.
- API-key encryption or long-lived reveal state.
- Custom red-asterisk Required/Optional labels; the intermediate experiment was reverted.
- Visual verification by application launch, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Handoff

Plan 012 records the final Provider-management interaction contract. Future list work should preserve the footer result placement, transient API-key reveal state, avatar preview semantics, and runtime-specific connection-test explanation unless a later plan explicitly supersedes them.

## Verification

- `pnpm typecheck` passed. The command emitted the repository's existing warnings about simultaneous `packageManager` and `devEngines.packageManager` declarations.
- `pnpm lint` passed. The command emitted the repository's existing `@stylistic/eslint-plugin` deprecation warnings.
- `git diff --check` passed.
- Visual verification was not run because repository policy reserves application launch and visual inspection for the user.
