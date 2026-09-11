# Markdown Editor And Renderer Selection

Date: 2026-09-10

## Decision

Prompt management needs a Markdown source editor, but not a renderer:

- Edit Prompt content with CodeMirror 6 through `@uiw/react-codemirror` and
  `@codemirror/lang-markdown`. It keeps editing source-oriented, provides
  Markdown syntax awareness, and preserves the exact stored string.
- Do not render Prompt content. Show the original text in its editing dialog and
  a plain-text excerpt on its card.
- If a future Skill workflow requires rendered documentation, evaluate
  `react-markdown` and `remark-gfm` at that boundary.
- Add `remark-frontmatter` only on Skill previews so the YAML header in
  `SKILL.md` is parsed as metadata rather than displayed as document content.
- Keep the canonical value as the original Markdown string. Do not convert it
  to a rich-text JSON model before saving.

This is the best fit for Foundry, not merely the candidate with the largest
star or download count. The current app uses React 19, Rsbuild, Tailwind CSS 4,
and Base UI. Prompt content is modeled as text, while a Skill package's primary
file is a `SKILL.md` document with YAML frontmatter. Exact source syntax can be
meaningful to agents even when two Markdown strings render similarly.

Use `@mdxeditor/editor` only if a future product requirement explicitly makes
WYSIWYG editing more important than source fidelity. Before adopting it, run a
round-trip proof of concept against real Prompt and Skill fixtures, including
frontmatter, comments, fenced code, nested lists, HTML, directives, and unknown
syntax. Its source/diff mode makes it the strongest rich-text fallback, but its
rich-text path still parses and serializes Markdown and adds a second UI
primitive stack through Radix dependencies.

Do not select BlockNote or Tiptap as the canonical Markdown editor now.
BlockNote documents that its Markdown import and export are lossy. Tiptap marks
its Markdown extension as beta and documents unsupported comments that may be
lost. Both projects are modern and highly active; the rejection is about the
Foundry data contract, not project quality.

## Why This Fits Foundry

The active Local Web UI dependencies in
[`app/package.json`](../../app/package.json) establish these constraints:

- React `19.2.8`, client-side Rsbuild, and ESM-compatible packages.
- Tailwind CSS 4 and shadcn's Base UI configuration rather than a bundled
  editor design system.
- Existing light/dark appearance state that editor styles must follow.
- A small application where the Prompt editor remains secondary to its compact
  list.

The current Prompt HTTP contract stores `content` as a string, and the earlier
Skill subsystem reads text files without converting their representation.
`SKILL.md` frontmatter is parsed separately with YAML. Both boundaries preserve
the domain's source-oriented semantics: content remains text rather than a
rendered or editor-specific document model.

CodeMirror 6 is the strongest researched source-editor option for Prompt
content. The editor module is statically imported so the first dialog open does
not introduce a separate dependency-loading state. Its UI follows Foundry's
light/dark appearance while the surrounding dialog remains responsible for
fields and actions.

## Measurement Method

Data was queried on **2026-09-10**. npm counts use the latest shared completed
window, **2026-08-30 through 2026-09-05**, from npm's official downloads API.
Package versions, publish dates, dependencies, peer ranges, and licenses come
from the npm registry. Repository stars and archived state come from GitHub's
official API; recent activity comes from official commit and release feeds.

npm downloads include transitive installations. They measure ecosystem
footprint, not deliberate direct adoption. The adoption section therefore uses
current first-party manifests from downstream projects as separate evidence.
Stars are included only as a broad community signal. Recent releases, commits,
documented limitations, compatibility, and the Foundry data model carry more
weight in the decision.

## Editor Comparison

| Candidate | Current activity and use | React and project fit | Source fidelity | Assessment |
| --- | --- | --- | --- | --- |
| **CodeMirror 6** via `@uiw/react-codemirror` + `@codemirror/lang-markdown` | Wrapper `4.25.11`, published 2026-07-08, [4,080,050 downloads/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40uiw%2Freact-codemirror), [2,251 stars](https://api.github.com/repos/uiwjs/react-codemirror), last wrapper commit 2026-07-08. Markdown language `6.5.2`, published 2026-08-04, [5,203,047/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40codemirror%2Flang-markdown); core view `6.43.11` was published 2026-09-03. MIT. | Wrapper peers accept React 17+, and CodeMirror packages provide ESM. Headless styling can use Foundry CSS variables. | Edits the canonical string directly; unsupported syntax remains text rather than being discarded. | **Preferred**. Modern engine, strong use, current releases, and the smallest semantic mismatch. |
| **MDXEditor** | `4.2.3`, published 2026-08-27, [1,027,548/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40mdxeditor%2Feditor), [3,664 stars](https://api.github.com/repos/mdx-editor/editor), commits through 2026-09-09. MIT. | ESM and peers accept React 18/19. Includes Lexical, CodeMirror, many Markdown utilities, and Radix UI controls. | Supports frontmatter, directives, JSX, code blocks, plugins, and source/diff mode, but rich-text editing necessarily parses and serializes content. | **Conditional WYSIWYG fallback**. Best feature fit among rich-text candidates, but heavier and less native to Foundry's Base UI stack. |
| **Milkdown** | React `7.22.1`, published 2026-08-12, [104,982/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40milkdown%2Freact); core has [317,061/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40milkdown%2Fcore), [11,901 stars](https://api.github.com/repos/Milkdown/milkdown), commits through 2026-09-02. MIT. | ESM, React wrapper, ProseMirror + remark, plugin driven. The React entry currently brings its kit and Crepe preset. | Markdown-first WYSIWYG, but saving still serializes a ProseMirror document and needs dialect-specific round-trip tests. | Strong modern project, but lower direct React package use and more editor-framework work than the default needs. |
| **BlockNote** | React `0.54.2`, published 2026-09-09, [500,773/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40blocknote%2Freact), [10,165 stars](https://api.github.com/repos/TypeCellOS/BlockNote), commits and release on 2026-09-09. MPL-2.0. | React 19 is supported. `@blocknote/shadcn` supports Tailwind 4 and Base UI, but also brings Lucide and its own composition. | Official docs call Markdown import/export **lossy**, support only a minimal CommonMark/GFM subset, and recommend Block JSON for lossless persistence. | Excellent block editor, wrong canonical format. Consider only if Foundry deliberately stores BlockNote JSON and treats Markdown as interchange. That would require prior database-migration approval. |
| **Tiptap + `@tiptap/markdown`** | Markdown `3.31.3`, published 2026-09-04, [2,360,828/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40tiptap%2Fmarkdown), repository [38,325 stars](https://api.github.com/repos/ueberdosis/tiptap), commits through 2026-09-04. MIT for these packages. | React 19 is supported and the editor is headless, but a complete UI must be composed locally. | Officially **beta/early release**; Markdown is bridged through Tiptap JSON, and comments are not supported and may be lost. | Revisit after the Markdown extension is stable and round-trip behavior covers Foundry fixtures. Not now. |
| **Lexical + `@lexical/markdown`** | Markdown `0.50.0`, published 2026-09-02, [4,192,737/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40lexical%2Fmarkdown), repository [23,842 stars](https://api.github.com/repos/facebook/lexical), commits through 2026-09-09. MIT. | First-party React packages and excellent React 19 activity. It is an editor framework, not a ready Markdown product. | Import, export, and shortcuts are transformer driven; the application owns unsupported syntax and UI behavior. | Strong foundation for a custom editor, but MDXEditor already packages the relevant work. Building directly on Lexical is unjustified here. |
| **`@uiw/react-md-editor`** | `4.1.2`, published 2026-08-21, [716,747/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40uiw%2Freact-md-editor), [2,927 stars](https://api.github.com/repos/uiwjs/react-md-editor), release and commit on 2026-08-21. MIT. | React peers accept 16.8+, and it bundles toolbar plus preview behavior. | Keeps Markdown text, but offers a less capable editing surface and couples editor, preview, highlighting, commands, and styling. | Credible all-in-one option for a small form; CodeMirror plus an explicit renderer is more controllable and testable for Foundry. |

### Explicit Legacy Exclusions

| Candidate | Why It Is Excluded |
| --- | --- |
| `@toast-ui/editor` | Latest package `3.2.2` was published 2023-02-17, the [repository is archived](https://api.github.com/repos/nhn/tui.editor), and its 18,024 stars do not offset the maintenance state. |
| `react-mde` | Latest package `11.5.0` was published 2021-05-04 and its peer range is React 17 only. It is not a React 19 choice. |
| EasyMDE | `2.21.0` was published 2026-05-03, so it is not abandoned, but its current manifest still depends on CodeMirror 5 and Marked 4. It preserves a legacy editor generation rather than fitting the current stack. |
| SimpleMDE and older React Markdown wrappers | Superseded by maintained alternatives built on CodeMirror 6 or modern React. Historical usage alone is not a selection reason. |

## Renderer Comparison

| Candidate | Current activity and use | Output and safety model | Assessment |
| --- | --- | --- | --- |
| **`react-markdown` + `remark-gfm`** | `react-markdown 10.1.0`, published 2025-03-07, [29,856,824/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/react-markdown), [15,877 stars](https://api.github.com/repos/remarkjs/react-markdown), repository commits through 2026-09-01. `remark-gfm 4.0.1` has [27,196,369/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/remark-gfm). MIT. | Produces React elements, supports component overrides and unified plugins, and is safe by default without `dangerouslySetInnerHTML`. Raw HTML is escaped or can be ignored. | **Preferred** for React integration, safety defaults, and ecosystem. Its package release cadence is slower than Marked or markdown-it; keep that visible in dependency reviews rather than pretending the 2025 publish date is recent. |
| **`markdown-to-jsx`** | `9.10.2`, published 2026-08-03, [4,033,645/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/markdown-to-jsx), [2,387 stars](https://api.github.com/repos/quantizor/markdown-to-jsx), commits through 2026-08-08. MIT. | React output, CommonMark/GFM, component overrides, built-in URL sanitizer, and v9 raw-HTML sanitization/tag filtering. | **Activity-first fallback**. More recent package work than `react-markdown` and enough adoption, but a smaller plugin ecosystem and a newly expanded multi-renderer major. |
| **Marked** | `18.0.12`, published 2026-09-07, [66,504,297/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/marked), [37,133 stars](https://api.github.com/repos/markedjs/marked), commits through 2026-09-08. MIT. | Very fast Markdown-to-HTML string compiler. Its own README explicitly says output is **not sanitized** and recommends DOMPurify or another sanitizer. | Excellent parser, but React would need sanitized `dangerouslySetInnerHTML` and a separate component-mapping strategy. Activity and downloads do not make that the best application API. |
| **markdown-it** | `15.0.1`, published 2026-08-27, [27,181,102/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/markdown-it), [21,886 stars](https://api.github.com/repos/markdown-it/markdown-it), commits through 2026-08-27. MIT. | CommonMark-oriented HTML string output, safe defaults, and a large syntax-plugin ecosystem. | Modern and active after its v15 release, but less direct than a React renderer and still requires disciplined HTML insertion and plugin review. |
| **micromark** | `4.0.2`, published 2025-02-27, [50,575,292/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/micromark), [2,219 stars](https://api.github.com/repos/micromark/micromark), last repository commit 2025-05-10. MIT. | Low-level CommonMark tokenizer/compiler with strong compliance and extension primitives. Safe by default. | Infrastructure used beneath unified packages, not the React rendering boundary Foundry needs. High transitive downloads are especially misleading here. |

### Is `react-markdown` The Only Choice?

No. All four shortlisted renderers are maintained and viable, but they expose
different application boundaries. The earlier `PromptMarkdown` prototype
relied on three `react-markdown` policies: `skipHtml` removed raw HTML,
an `a` component opens links with `rel="noreferrer"`, and an `img` component
replaces every remote image with inert alt text. The relevant comparison is
therefore the cost of preserving those policies, not whether another parser can
produce HTML.

| Candidate | React 19 integration | GFM and extension model | Cost to preserve Foundry's current policy |
| --- | --- | --- | --- |
| **`react-markdown`** | Native React elements; its [published peer range](https://registry.npmjs.org/react-markdown/latest) is React 18+. | CommonMark by default; `remark-gfm` adds tables, task lists, strikethrough, and autolinks; remark/rehype plugins and element-component overrides share one AST pipeline. | **None**. `skipHtml`, `components.a`, and `components.img` are the APIs already in use. The [official security guidance](https://github.com/remarkjs/react-markdown/blob/a758d3c302151caced5b9f5a092fa61e16c118a5/readme.md#security) confirms the default safe model and warns that plugins, components, and a custom URL transform can weaken it. |
| **`markdown-to-jsx`** | Native React output; React 16+ is an optional peer, so React 19 is within its [published range](https://registry.npmjs.org/markdown-to-jsx/latest). | GFM constructs are built in; element overrides and `renderRule` provide customization without a unified-style plugin graph. Version 9 also enables dangerous-tag filtering and raw-HTML/URL sanitization by default. | **Low to medium**. Link and image replacements map cleanly to `overrides`. Its `disableParsingRawHTML` / `ignoreHTMLBlocks` options treat HTML as unparsed text rather than matching `skipHtml`'s removal semantics, so exact parity needs a small `renderRule` that drops HTML node types. See the [official options and sanitization docs](https://github.com/quantizor/markdown-to-jsx/blob/ec06a54a71691305d58cb53e762e4a82814b6303/README.md#options). |
| **Marked** | Framework agnostic and returns an HTML string; React 19 adds no special integration. | GFM is enabled by default and tokenizers/renderers/hooks are extensible. | **High**. Foundry would need an HTML insertion boundary, DOMPurify or an equivalent dependency, renderer overrides for links and images, and tests that those layers cannot drift. Marked's [official warning](https://github.com/markedjs/marked/blob/afbb27c7ee753af07fb1a5c18031fc3068261b31/README.md#usage) explicitly states that it does not sanitize output. |
| **markdown-it** | Framework agnostic and returns an HTML string; React 19 adds no special integration. | CommonMark-oriented core with configurable rules and a broad plugin ecosystem. Tables and strikethrough are available, but GFM task lists require a plugin and URL linkification is optional. | **High**. `html: false` is safe by default but escapes raw HTML instead of dropping it. Matching the current behavior needs renderer/token rules for raw HTML, links, and images, plus a carefully controlled HTML insertion boundary. Its [official safety guide](https://github.com/markdown-it/markdown-it/blob/924b203442f62cea128b5f2680294697621b416d/docs/safety.md) recommends either keeping HTML disabled or sanitizing externally. |

`markdown-to-jsx` is consequently the realistic drop-in alternative if
`react-markdown`'s slower package-release cadence becomes unacceptable. Marked
and markdown-it remain good parser choices for non-React HTML generation or a
future server-side pipeline, but adopting either in a future React preview
would add security plumbing without improving the product contract.

## Verified Direct Adoption

These examples are current downstream manifests, not npm dependent estimates:

- [Langfuse's web manifest](https://github.com/langfuse/langfuse/blob/main/web/package.json)
  directly declares `@uiw/react-codemirror ^4.25.8` and
  `react-markdown ^10.1.0`. This is the closest verified analogue to Foundry's
  React-based AI developer UI.
- [LobeHub's manifest](https://github.com/lobehub/lobehub/blob/main/package.json)
  directly declares `react-markdown ^10.1.0` and `marked ^17.0.6` for distinct
  roles.
- [Open WebUI's manifest](https://github.com/open-webui/open-webui/blob/main/package.json)
  directly declares CodeMirror 6, Marked, and Tiptap 3 packages. This supports
  their broad current adoption, but it does not prove adoption of Tiptap's
  separate beta Markdown extension.
- [Outline's manifest](https://github.com/outline/outline/blob/main/package.json)
  directly declares `markdown-it ^14.3.0` and related plugins.
- [Storybook's addon-docs manifest](https://github.com/storybookjs/storybook/blob/next/code/addons/docs/package.json)
  directly declares `markdown-to-jsx ^7.7.2`. It is real adoption, though not
  evidence that Storybook has moved to the current v9 line.
- [NINA's map editor manifest](https://github.com/NINAnor/map-editor/blob/main/package.json)
  directly declares `@mdxeditor/editor ^4.0.0` and `react-markdown ^10.1.0`.

The examples support the shortlist but do not replace Foundry-specific fit.
Downstream projects can use the same parser for a different trust model or
store a rich-text AST rather than Markdown source.

## Integration Guidance

### Editing

Keep the draft in local React state. TanStack Query should own loaded/saved
server state, not each keystroke. Save the exact string returned by CodeMirror.
Do not run it through remark stringify or a rich-text serializer.

Keep CodeMirror policy within the Prompt editing boundary and avoid importing
every fenced-code language up front. Derive the editor theme from Foundry
appearance state instead of hard-coding a third-party light or dark theme.

### Rendering

The Prompt workflow does not render Markdown. It exposes the exact source in
CodeMirror and a whitespace-normalized plain-text excerpt on each card.

If `SKILL.md` later receives a rendered view, parse YAML frontmatter and show
selected metadata in the page's own fields. Keep renderer configuration
domain-specific rather than silently applying it to Prompts.

### Security

- Do not enable raw HTML for the initial implementation. With
  `react-markdown`, leave out `rehype-raw` and consider `skipHtml` when HTML
  should disappear rather than display as source text.
- If a concrete requirement later needs raw HTML, use `rehype-raw` followed by
  `rehype-sanitize`, define a narrow schema, and add XSS fixtures. Never add
  `rehype-raw` alone.
- Do not compile or execute MDX/JSX from a Prompt or Skill preview. MDX syntax
  may be shown as text or handled by a non-executing editor mode only.
- Retain the renderer's safe URL transform. Add explicit handling for external
  links, and do not load remote images automatically from untrusted local
  packages; image requests can disclose network metadata even without script
  execution.
- Treat every remark/rehype plugin and component override as code in the trust
  boundary. A safe base renderer can be made unsafe by a plugin or custom URL
  transform.

## Dependency Decision

Prompt management adds `@uiw/react-codemirror` and
`@codemirror/lang-markdown` for source editing. It adds no renderer dependency.

Add `remark-frontmatter` or a renderer only with a concrete Skill requirement.
Do not install MDXEditor, BlockNote, Milkdown, Tiptap, Marked, markdown-it, or a
sanitizer until an accepted behavior requires it.

Before merging an implementation, verify:

1. React 19 Browser Mode tests for typing, undo/redo, keyboard navigation,
   controlled value updates, save errors, and light/dark mode.
2. Round-trip fixtures assert that opening and saving without edits preserves
   the exact Markdown string.
3. Card and dialog fixtures cover raw Markdown, HTML-like text, very long
   lines, and fenced code without executing or rendering content.
4. `pnpm --filter @dhzh/foundry-app typecheck`, `pnpm test`, and `pnpm build`.
5. The Prompt dialog opens on first use without an intermediate
   dependency-loading state.

## README Assessment

The Prompt implementation changes user-facing behavior, HTTP APIs, dependencies,
and stored data. `README.md` therefore documents the Prompt workflow, direct
deletion, Local Web UI route, import/export behavior, and HTTP endpoints in the
same change.

## Primary Sources

- [CodeMirror Markdown package documentation](https://github.com/codemirror/lang-markdown),
  [CodeMirror documentation](https://codemirror.net/docs/),
  [`@uiw/react-codemirror` npm metadata](https://registry.npmjs.org/%40uiw%2Freact-codemirror/latest),
  [`@codemirror/lang-markdown` npm metadata](https://registry.npmjs.org/%40codemirror%2Flang-markdown/latest)
- [MDXEditor documentation](https://mdxeditor.dev/editor/docs/getting-started),
  [source/diff mode](https://mdxeditor.dev/editor/docs/diff-source),
  [repository](https://github.com/mdx-editor/editor),
  [npm metadata](https://registry.npmjs.org/%40mdxeditor%2Feditor/latest)
- [Milkdown repository and documentation](https://github.com/Milkdown/milkdown),
  [`@milkdown/react` npm metadata](https://registry.npmjs.org/%40milkdown%2Freact/latest)
- [BlockNote Markdown import](https://www.blocknotejs.org/docs/features/import/markdown),
  [Markdown export](https://www.blocknotejs.org/docs/features/export/markdown),
  [`@blocknote/react` npm metadata](https://registry.npmjs.org/%40blocknote%2Freact/latest),
  [`@blocknote/shadcn` npm metadata](https://registry.npmjs.org/%40blocknote%2Fshadcn/latest)
- [Tiptap Markdown documentation](https://tiptap.dev/docs/editor/markdown),
  [`@tiptap/markdown` npm metadata](https://registry.npmjs.org/%40tiptap%2Fmarkdown/latest)
- [Lexical Markdown documentation](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown),
  [`@lexical/markdown` npm metadata](https://registry.npmjs.org/%40lexical%2Fmarkdown/latest)
- [`react-markdown` documentation and security notes](https://github.com/remarkjs/react-markdown),
  [`remark-gfm` repository](https://github.com/remarkjs/remark-gfm)
- [`markdown-to-jsx` documentation and security notes](https://github.com/quantizor/markdown-to-jsx/blob/ec06a54a71691305d58cb53e762e4a82814b6303/README.md),
  [npm metadata](https://registry.npmjs.org/markdown-to-jsx/latest)
- [Marked security warning](https://github.com/markedjs/marked#usage),
  [markdown-it documentation](https://github.com/markdown-it/markdown-it),
  [micromark documentation](https://github.com/micromark/micromark)
