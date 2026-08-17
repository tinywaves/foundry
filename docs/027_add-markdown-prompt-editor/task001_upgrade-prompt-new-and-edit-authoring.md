# Task 001: Upgrade Prompt New and Edit Authoring

## Status

`completed`

## Goal

Upgrade Prompt New and Edit with a two-row Description field and a code-oriented Markdown editor while preserving the current form, persistence, and version behavior.

## Detail

Keep `PromptCreatePage` and `PromptEditPage` on their shared controlled form. Reduce the Astryx Description `TextArea` from four visible rows to two. Replace only the Content `TextArea` with a Prompt-owned Markdown field composed from Astryx `FieldLabel`, `FieldStatus`, `SegmentedControl`, and `Markdown`. Use StyleX and existing design tokens for the application-owned field and Preview presentation while leaving the CodeMirror Source surface on its official default visual baseline.

The Content field defaults to Source and offers Source and Preview as mutually exclusive modes. Source uses a lazily loaded CodeMirror 6 component with Markdown syntax highlighting, line numbers, soft line wrapping, a stable height equivalent to approximately twenty code lines, and internal scrolling. Preview renders the same current draft in an equally sized scrolling surface. Keep the Source editor instance mounted while Preview is selected so returning to Source retains cursor position, selection, and undo history. Mode selection remains local presentation state: switching modes must not call the form's Content change handler, change validation input, or affect dirty-state comparison. Save remains available in either mode and submits the exact controlled Content string without trimming or application-authored Markdown transformation.

Configure Source from the official `@uiw/react-codemirror` Markdown example with `markdown({ base: markdownLanguage, codeLanguages: languages })`. Retain the wrapper's default `basicSetup` and `indentWithTab` behavior so Source includes line numbers, a fold gutter, active-line and selection drawing, history, search, syntax highlighting, bracket matching, autocomplete, and Tab indentation. Retain the Markdown extension's default HTML completion and paste-as-link behavior, and use `@codemirror/language-data` to load fenced-code language support on demand. Do not add a formatting toolbar, WYSIWYG behavior, a minimap, or an application-authored CodeMirror theme. Place the required Astryx `FieldLabel` and the Source/Preview `SegmentedControl` on the same header row, render validation through a detached Astryx `FieldStatus`, connect the CodeMirror content surface to an accessible textbox label, invalid-state description, and read-only state, and return to Source when Content validation fails so the invalid value can be corrected directly.

Retain the current selected-history workflow inside Edit. Restructure the native historical fieldset boundary only as needed so Title and Description retain their current non-editable, non-muted behavior, the Markdown Source surface receives explicit read-only and non-editable configuration, and the Source/Preview mode control remains usable. Historical selection must not become dirty or editable, and Restore must continue targeting the exact loaded snapshot. Saving and version loading continue to disable mutable fields; the Markdown source surface mirrors those busy states through read-only configuration without changing existing Header or History controls.

Render Preview with the existing Astryx `Markdown` component and its supported safe Markdown output. External preview links continue opening through the main window's existing denied-window and `shell.openExternal` policy. Prevent relative and hash preview links from navigating Foundry's renderer routes. Do not add IPC or expose native link-opening capability to the renderer.

Place the CodeMirror integration in a dedicated renderer module and load it through a literal, statically analyzable `React.lazy` import from the Prompt Markdown field. This keeps the editor, Markdown integration, and language-data registry out of non-editor initial renderer chunks while Vite emits concrete fenced-code languages as additional dynamic chunks. Keep static CodeMirror extensions hoisted and memoize only value-dependent accessibility and line-separator configuration so controlled typing does not repeatedly reconfigure or recreate the editor. Use CodeMirror's explicit external-change handling and line-separator configuration so mounting, mode switching, busy-state changes, and current or historical value replacement do not echo changes into Prompt form state. The application continues to persist the editor's resulting source string through the existing Prompt API without content parsing or normalization in Foundry-owned code.

Do not change Prompt form contracts, validation limits, queries, mutations, caches, persistence, preload, IPC, database tables, or any non-editor Prompt surface. Renderer verification remains limited to pure logic, static checks, and production builds; do not import or render the new UI modules in automated tests.

## Findings

None.

## Dependencies

### `@uiw/react-codemirror`

- Purpose: Provide the React lifecycle wrapper for a controlled CodeMirror 6 source editor, including read-only configuration, line numbers, history, editor state retention, and extensibility for Markdown language support.
- Selected version: `^4.25.11`.
- Module format: Maintained dual package with explicit CommonJS and ESM entry points and exports.
- TypeScript: Bundled declarations; its peer range supports React and React DOM 17 or newer, including the repository's React 19 release.
- Compatibility: Compatible with React 19, TypeScript 5.9, Vite 7, Electron's Chromium renderer, and the repository's existing CodeMirror 6 transitive graph. It has no native module or platform packaging requirement.
- Maintenance: Version `4.25.11` was released on 2026-07-08, following multiple 2026 releases in the official release feed.
- Adoption: The npm Downloads API reported 16,850,406 downloads from 2026-07-17 through 2026-08-15.
- Security and license: MIT licensed. An OSV query for `4.25.11` returned no known vulnerability records on 2026-08-17.
- Operational cost: The published package reports an unpacked size of 826,039 bytes. Load it only from a dedicated lazy renderer module and keep extension references stable to limit initial bundle and reconfiguration costs.
- Alternatives: `@monaco-editor/react` supports React 19, but its required `monaco-editor@0.56.0` package reports a 97,911,464-byte unpacked size and adds worker and Vite packaging complexity that is disproportionate to one Markdown field. `react-simple-code-editor@0.14.1` is smaller but lacks the required integrated line-number, read-only, state, and extension capabilities and has not had a stable release since 2024. Managing raw CodeMirror view lifecycles locally would duplicate the focused React integration already provided here.
- Sources checked: npm registry metadata and npm Downloads API; the official `uiwjs/react-codemirror` README, package contents, and GitHub release feed; CodeMirror reference documentation; and OSV. Accessed 2026-08-17.

### `@codemirror/lang-markdown`

- Purpose: Add maintained CodeMirror 6 Markdown parsing, syntax highlighting, and Markdown-aware editing behavior to the Source mode.
- Selected version: `^6.5.2`.
- Module format: ESM package with explicit ESM and CommonJS exports.
- TypeScript: Bundled declarations maintained with the CodeMirror package.
- Compatibility: Uses the same CodeMirror 6 state, view, language, and Lezer ecosystem as the selected React wrapper and the repository's renderer toolchain. Configure the GFM-capable Markdown base with the official language-data registry for fenced-code highlighting.
- Maintenance: Version `6.5.2` was released on 2026-08-04 and fixes Markdown continuation behavior; its official changelog records regular releases through 2025 and 2026.
- Adoption: The npm Downloads API reported 16,876,557 downloads from 2026-07-17 through 2026-08-15.
- Security and license: MIT licensed. An OSV query for `6.5.2` returned no known vulnerability records on 2026-08-17.
- Operational cost: The published package reports an unpacked size of 72,594 bytes. Keep it inside the lazy Source editor module together with the language-data registry.
- Alternatives: A plain Astryx `TextArea` plus `Markdown` Preview cannot provide the confirmed Monaco-like syntax, line-number, history, and read-only source experience. Monaco's built-in Markdown language is rejected with the Monaco integration for the package and worker costs recorded above.
- Sources checked: npm registry metadata and npm Downloads API; the official CodeMirror Markdown README, API reference, changelog, and release metadata; and OSV. Accessed 2026-08-17.

### `@codemirror/language-data`

- Purpose: Supply CodeMirror's official language metadata and dynamic loaders so fenced Markdown code blocks are highlighted according to their info string.
- Selected version: `^6.5.2`.
- Module format: ESM package with explicit ESM and CommonJS exports and `sideEffects: false`.
- TypeScript: Bundled declarations through `dist/index.d.ts`.
- Compatibility: Maintained by CodeMirror and built on the same CodeMirror 6 language ecosystem as `@codemirror/lang-markdown`. The React 19, TypeScript 5.9, Vite 7, and Electron renderer production build completed with the registry and its dynamic language imports.
- Maintenance: Version `6.5.2` was released on 2025-10-23; the official changelog records ongoing language mapping and package updates through that release.
- Adoption: The npm Downloads API reported 10,309,456 downloads from 2026-07-17 through 2026-08-15.
- Security and license: MIT licensed. An OSV query for `6.5.2` returned no known vulnerability records on 2026-08-17.
- Operational cost: The package reports a 71,718-byte unpacked size and added 29 language-related packages. The production build keeps the registry in the lazy Source editor chunk and emits concrete languages as separate on-demand chunks rather than adding them to the initial renderer chunk.
- Alternatives: Omitting `codeLanguages` leaves fenced code without language-aware highlighting and does not match the official `@uiw/react-codemirror` Markdown example. Maintaining a local hand-picked language map would duplicate official metadata and create manual coverage and upgrade work.
- Sources checked: npm registry metadata and Downloads API; the official package metadata, README, changelog, CodeMirror language-data documentation, `@uiw/react-codemirror` Markdown example, and OSV. Accessed 2026-08-17.

Install all three runtime dependencies through the repository-required unversioned command so pnpm records the current approved releases and updates `pnpm-lock.yaml`:

`pnpm add @uiw/react-codemirror @codemirror/lang-markdown @codemirror/language-data`

## Deliverables

- Prompt-owned Markdown Content field with accessible Source/Preview mode selection and validation feedback.
- Lazy CodeMirror 6 Markdown source editor using the official default editing baseline and dynamically loaded fenced-code language support.
- Two-row Description field on the shared New and Edit form.
- Integration with current, busy, validation-error, and selected historical version states without changing Prompt contracts or persistence.
- Updated runtime dependency manifest and pnpm lockfile.

## Acceptance Criteria

- [x] Description displays two visible rows in both New Prompt and Edit Prompt, including a selected historical version on Edit.
- [x] The required Content label and Source/Preview mode control share one header row above the editor surface.
- [x] Content defaults to Source and provides Markdown and fenced-code syntax highlighting, line numbers, a fold gutter, soft wrapping, stable twenty-line-equivalent height, internal scrolling, history, search, bracket matching, autocomplete, Tab indentation, HTML completion, and paste-as-link behavior without a toolbar, WYSIWYG behavior, or minimap.
- [x] Preview renders the current controlled draft in a same-height scrolling surface, and switching modes preserves Content, dirty state, cursor position, selection, and Source undo history.
- [x] Save from Source or Preview sends the existing form's exact controlled Content value through the unchanged Prompt mutation and retains existing validation, failure preservation, cache, navigation, and version-creation behavior.
- [x] A Content validation error is associated with the Markdown field and returns it to Source for correction without losing the draft.
- [x] A selected historical version keeps Title, Description, and Content non-editable without muted field-level styling, still allows Source/Preview switching, does not become dirty, and restores the exact selected snapshot through the existing confirmation flow.
- [x] Saving and version loading make Source non-editable while preserving the existing Header, History, and failure behavior.
- [x] External Preview links use the existing Electron-controlled external-opening path, while relative and hash links cannot navigate Foundry.
- [x] CodeMirror, its Markdown integration, and the language-data registry are emitted outside non-editor initial renderer chunks through a literal lazy import; concrete fenced-code languages are emitted as additional dynamic chunks, and typing does not recreate the editor through unstable extension references.
- [x] Prompt View, Trash View, cards, copy behavior, shared contracts, preload, IPC, main-process behavior, and storage remain unchanged.
- [x] Focused tests and static verification pass without importing rendered UI modules or launching or visually automating the application.

## Out of Scope

- Markdown rendering in Prompt View, Trash View, Prompt cards, or other non-editor surfaces.
- Prompt copy changes or any persistence, preload, IPC, database, schema, query, mutation, or cache contract changes.
- Formatting controls, WYSIWYG editing, a minimap, application-authored CodeMirror visual theming, or broader IDE behavior beyond the official default setup.
- Direct editing of historical versions or changes to History selection, confirmation, or Restore semantics.
- Renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, desktop automation, or manual application launch by the agent.

## Handoff

Task 001 completes Plan 027 with a stable New and Edit Markdown authoring surface. A later independent plan may reuse its preview conventions when adding Markdown rendering to Prompt View, Trash View, or other Prompt surfaces without reopening this task's accepted behavior.

## Verification

- `pnpm test` passed all 22 test files and 142 tests, including the new uniform and mixed line-separator model coverage and the existing Prompt form and history suites.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- The renderer build emitted `prompt-markdown-source-editor-DKcRza0z.js` as a separate 1,216.09 kB lazy chunk, kept the main renderer chunk free of the CodeMirror implementation, and emitted concrete fenced-code languages as additional dynamic chunks.
- `git diff --check` passed.
- Static inspection confirmed the official Markdown configuration, default `basicSetup` and Tab behavior, stable CodeMirror extension and callback references, exact external-value handling, and explicit busy and historical read-only states.
- Static scope inspection confirmed no changes to main, preload, storage, shared Prompt contracts, Prompt View, Trash View, cards, queries, mutations, or caches.
- Static Astryx inspection found no application-authored raw `div` or `span` layout, standalone CSS, raw colors, raw pixel values, or utility classes in the changed UI source.
- `pnpm peers check` reported only the existing `@napi-rs/wasm-runtime` peer expectations for `@emnapi/core` and `@emnapi/runtime`; neither is introduced by the selected editor dependencies.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.

## Maintenance Adjustments

### 2026-08-17 16:47:22: Clip Source Editor Content to Its Rounded Border

- Change: Added overflow clipping to the CodeMirror root theme so the gutter, active-line background, and scrolling content remain inside the editor's rounded border.
- Previous state: The root displayed a rounded border without clipping its internal layers, allowing the gutter and active-line backgrounds to cover the curved top corners.
- Reason: User visual inspection identified square internal backgrounds protruding through the Source editor's upper-left and upper-right rounded corners.
- Documentation impact: Appended this maintenance record to Task 001; the Plan 027 goal, scope, decisions, task chain, completion state, and acceptance criteria remain unchanged.
- Verification: Static inspection confirmed that the root now clips child layers while `.cm-scroller` retains internal scrolling; `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed. The application was not launched and final visual acceptance remains user-performed under repository policy.

### 2026-08-17 17:11:36: Adopt the Official CodeMirror Markdown Baseline

- Change: Replaced the restricted `basicSetup` and application-authored CodeMirror theme with the official `@uiw/react-codemirror` Markdown configuration, retained default editor capabilities, and added `@codemirror/language-data` for dynamically loaded fenced-code highlighting. Preview continues using Astryx `Markdown` and all Prompt form, persistence, and version boundaries remain unchanged.
- Previous state: Source disabled autocomplete, Tab indentation, HTML completion, paste-as-link behavior, fold controls, and broad fenced-code language data, and used a custom token-based CodeMirror theme. The earlier rounded-border clipping adjustment belonged to that superseded custom theme.
- Reason: User functional inspection established that the customized editor did not provide the expected visible Markdown highlighting and differed materially from the official CodeMirror behavior. The implementation was reset to the official documented feature baseline before any later visual customization.
- Documentation impact: Synchronized the Plan 027 Detail, Scope, Out of Scope, and Decisions plus Task 001 Detail, Dependencies, Deliverables, Acceptance Criteria, Out of Scope, and Verification. The plan goal, task chain, completion state, Preview implementation, persistence boundary, and non-editor Prompt scope remain unchanged.
- Verification: `pnpm test` passed all 22 files and 142 tests; `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed. The production build emitted the lazy Source editor chunk plus separate language chunks. `pnpm peers check` continued reporting only the pre-existing `@emnapi` peer expectations. The application was not launched and final functional and visual acceptance remains user-performed under repository policy.

### 2026-08-17 17:22:52: Align the Content Label and Mode Control

- Change: Replaced the vertical Astryx `Field` shell with the equivalent `FieldLabel`, `FieldStatus`, and Stack composition so the required Content label and Source/Preview `SegmentedControl` share one header row above the editor surface.
- Previous state: The Source/Preview control occupied a separate right-aligned row between the Content label and editor surface.
- Reason: User visual review requested that the Content label and editor mode control appear on the same line.
- Documentation impact: Updated the Task 001 Detail and Acceptance Criteria to describe the shared header row. Editor behavior, validation, persistence, version handling, and Plan 027 scope remain unchanged.
- Verification: `pnpm test` passed all 22 files and 142 tests; `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. The application was not launched and final visual acceptance remains user-performed under repository policy.
