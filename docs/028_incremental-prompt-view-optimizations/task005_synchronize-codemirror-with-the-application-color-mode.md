# Task 005: Synchronize CodeMirror with the Application Color Mode

## Status

`completed`

## Goal

Keep the Prompt Markdown Source editor legible and visually coherent in both application color modes by synchronizing CodeMirror with Astryx's resolved theme mode.

## Detail

`PromptMarkdownSourceEditor` previously omitted CodeMirror's `theme` prop. `@uiw/react-codemirror` therefore retained its default light editor canvas even when the surrounding Astryx application resolved to dark mode. The inherited application text color became light while the editor background remained white, producing insufficient contrast in Prompt New and Edit Source mode.

The Source editor now calls Astryx `useTheme` and reads its resolved `mode`. Astryx converts the application's default `system` preference into an effective `light` or `dark` value and updates the hook when that effective mode changes. The value is passed directly to CodeMirror's existing `theme` prop.

In light mode, `@uiw/react-codemirror` continues using its built-in light theme. In dark mode, it activates the One Dark extension already bundled and selected internally by the existing CodeMirror wrapper. The editor canvas, text, Markdown syntax highlighting, cursor, selection, active line, and gutters therefore switch as one editor-owned theme instead of combining a light canvas with dark-application text. When the resolved mode changes while the Source editor is mounted, the wrapper's existing theme dependency reconfigures the CodeMirror extensions without replacing the document or changing edit state.

The change remains inside the lazy-loaded Source editor. Preview mode does not load CodeMirror, no new dependency or custom palette is introduced, and Content values, line-separator handling, accessibility attributes, read-only behavior, validation focus, sizing, wrapping, language support, editing, and persistence remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- Astryx effective color-mode access within the lazy Prompt Markdown Source editor.
- CodeMirror light and dark theme selection through its existing `theme` prop.
- Runtime editor reconfiguration when the resolved application color mode changes.
- Preserved Source-editor lazy loading and existing Markdown editing behavior.

## Acceptance Criteria

- [x] Prompt New and Edit Source mode use CodeMirror's dark canvas and dark-appropriate editor colors when Astryx resolves dark mode.
- [x] Prompt New and Edit Source mode retain CodeMirror's built-in light presentation when Astryx resolves light mode.
- [x] Editor background, text, syntax highlighting, cursor, selection, active line, and gutters switch through one CodeMirror-owned theme.
- [x] A mounted Source editor reconfigures when the effective system color mode changes without replacing its document or edit state.
- [x] Preview mode continues avoiding the lazy CodeMirror module until Source mode is loaded.
- [x] Content values, line separators, accessibility attributes, read-only behavior, validation focus, dimensions, line wrapping, language support, and persistence remain unchanged.
- [x] No custom raw color, standalone CSS, theme package, or other dependency is introduced.
- [x] Type checking, linting, the full test suite, production build, diff validation, and static integration inspection pass without automated visual verification.

## Out of Scope

- A custom Foundry CodeMirror color palette or replacing the bundled One Dark theme.
- Application theme settings, a manual color-mode switcher, or persistence of a theme preference.
- Changes to Markdown Preview presentation, Source/Preview mode controls, editor sizing, editing commands, autocomplete, validation, or persistence.
- Eager CodeMirror loading, new dependencies, renderer component tests, DOM assertions, screenshots, browser automation, accessibility-tree inspection, or desktop automation.

## Handoff

Task 005 establishes application-aware CodeMirror theming while preserving the existing lazy Prompt authoring architecture as the baseline for the next explicitly requested optimization.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm test` passed all 23 test files and 146 tests.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Astryx discovery identified `useTheme` as the supported integration for non-CSS consumers and confirmed that its `mode` value resolves system preference to `light` or `dark`.
- Static `@uiw/react-codemirror` inspection confirmed that `theme="light"` selects its default light extension, `theme="dark"` selects One Dark, and a theme prop change reconfigures the mounted editor extensions.
- Production output retained `prompt-markdown-source-editor` as a separate lazy renderer chunk after the theme integration.
- Static scope inspection confirmed no custom raw colors, standalone CSS, dependency changes, or changes to editor content, line separators, accessibility, read-only state, validation focus, sizing, wrapping, language support, editing, Preview behavior, or persistence.
- The user approved documentation synchronization after reviewing the completed behavior and verification summary.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
