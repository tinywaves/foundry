# Runtime Brand Icon Library Selection

Date: 2026-09-09

## Decision

Foundry's Runtime controls need product-specific icons for **Claude Code** and
**OpenAI Codex**, rather than the broader Anthropic, Claude, or OpenAI company
marks. Use the Lobe Icons static SVG package, `@lobehub/icons-static-svg`, with
`claudecode-color.svg` and `codex-color.svg`.

Both color SVGs are self-contained and require no runtime theme selection.
Claude Code uses its orange brand color. Codex uses a white backing shape and a
blue-purple gradient mark, so it remains legible on light and dark backgrounds.
The static package has no runtime or peer dependencies, which fits Foundry's
narrow requirement for two icons.

The package contains 908 files and is about 2.33 MB unpacked. The implemented
Rsbuild production build emits no standalone SVG files and includes the two
inlined assets in one application bundle, so it does not copy the full icon set
into `dist/app`.

Do not use the React package, `@lobehub/icons`, for this requirement. It provides
convenient `<ClaudeCode.Color />` and `<Codex.Color />` APIs and declares
`sideEffects: false`, but it also brings runtime dependencies such as
`antd-style`, `polished`, `es-toolkit`, and `lucide-react`, plus `antd` and
`@lobehub/ui` peer dependencies. Foundry does not otherwise use that UI stack.

## Measurement Method

Data was queried on **2026-09-09**. npm download counts use the most recent
complete shared window, **2026-08-30 through 2026-09-05**, from npm's official
downloads API. Versions, publish dates, file counts, unpacked sizes,
dependencies, and `sideEffects` values come from the npm registry. Stars,
recent pushes, and releases come from GitHub's official API.

Download counts include transitive installations and are only an ecosystem
footprint signal. Direct adoption is supported separately by current manifests
from adopting projects.

## Candidate Comparison

| Candidate | Product-specific coverage | Color and theme behavior | Integration and package size | Maintenance and adoption signals | Assessment |
| --- | --- | --- | --- | --- | --- |
| **`@lobehub/icons-static-svg`** | Includes `claudecode-color.svg` and `codex-color.svg`, plus corresponding mono and text assets | Both Color SVGs are self-contained; Codex has a white backing shape for cross-theme contrast; no theme API | No dependencies or peers; `1.95.0`, 908 files, 2.33 MB unpacked; usable as `<img>` sources or Rsbuild asset URLs | [88,104 downloads/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40lobehub%2Ficons-static-svg); shares the [2,488-star Lobe Icons repository](https://api.github.com/repos/lobehub/lobe-icons), with a release and push on 2026-09-05 | **Preferred**: exact scope and no runtime dependencies |
| **`@lobehub/icons`** | `ClaudeCode` and `Codex` each provide Mono, Color, Text, Combine, and Avatar variants | `.Color` uses fixed brand colors; Mono uses `currentColor`; no automatic light/dark prop | React 19 compatible and `sideEffects: false`, but has four runtime dependencies and `antd`/`@lobehub/ui` peers; `5.18.0`, 9.08 MB unpacked | [323,037 downloads/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40lobehub%2Ficons); the [LobeHub manifest](https://github.com/lobehub/lobehub/blob/main/package.json) directly declares it | Best icon API, but the dependency surface is excessive for two icons |
| **`simple-icons` / `@icons-pack/react-simple-icons`** | Simple Icons currently has Anthropic, Claude, and **Claude Code**, but **not Codex**. The React wrapper likewise provides `SiClaudecode` but no Codex component | Single-color path plus official hex `D97757`; the wrapper accepts `color`, including `currentColor`; not multicolor | `simple-icons` supports icon subpath imports; the wrapper supports React 16.13 through 19, icon subpaths, and `sideEffects: false`, but is 26.65 MB unpacked | Simple Icons: [783,318/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/simple-icons), [25,810 stars](https://api.github.com/repos/simple-icons/simple-icons), version `16.30.0` released 2026-09-06. Wrapper: [874,218/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40icons-pack%2Freact-simple-icons), [550 stars](https://api.github.com/repos/icons-pack/react-simple-icons), version `13.15.1` released 2026-08-16 | Mature ecosystem, but cannot satisfy Codex without mixing sources; the OpenAI company mark should not stand in for Codex |
| **Iconify (`@iconify/react` + `logos`)** | `logos:claude-code`, `logos:codex`, and `logos:codex-dark` exist; the Simple Icons collection still lacks Codex | `logos` is multicolor; Codex requires the app to switch between black and white variants; Claude Code remains orange | The React component is 211 KB unpacked. String icon names load from the public Iconify API by default. Offline use requires bundled icon data; `@iconify-icons/logos` supports icon subpaths but is about 7.95 MB unpacked | `@iconify/react`: [694,056/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40iconify%2Freact), [6,300-star repository](https://api.github.com/repos/iconify/iconify), version `6.0.2` published 2025-09-15, repository pushed 2026-09-07. `@iconify-icons/logos`: [10,399/week](https://api.npmjs.org/downloads/point/2026-08-30:2026-09-05/%40iconify-icons%2Flogos) | Broadest coverage, but too much machinery for two local icons; a local management UI should not fetch icons from a public runtime API |

## Icon Identity And Theme Findings

- Lobe Icons maintains separate [Claude Code](https://github.com/lobehub/lobe-icons/tree/master/src/ClaudeCode) and [Codex](https://github.com/lobehub/lobe-icons/tree/master/src/Codex) product entries. Its [static SVG directory](https://github.com/lobehub/lobe-icons/tree/master/packages/static-svg/icons) publishes separate `claudecode-*` and `codex-*` assets.
- The [Claude Code Color SVG](https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/claudecode-color.svg) uses `#D97757`. The [Codex Color component source](https://github.com/lobehub/lobe-icons/blob/master/src/Codex/components/Color.tsx) includes a white backing shape and a `#B1A7FF` to `#3941FF` gradient. Neither depends on the active theme color.
- The official npm data for Simple Icons `16.30.0` contains `claudecode` with brand color `D97757`, but no Codex icon. Iconify's [Simple Icons query](https://api.iconify.design/simple-icons.json?icons=claudecode,claude,anthropic,openai,codex) also reports Codex as `not_found` and marks the historical OpenAI company icon as `hidden`.
- Iconify's [`logos` query](https://api.iconify.design/logos.json?icons=claude-code,codex,codex-dark) shows an orange Claude Code icon and separate fixed black and white Codex variants. These are distinct assets, not a React component that automatically responds to theme changes.

## Foundry Integration

1. Pin `@lobehub/icons-static-svg@1.95.0` and import only
   `icons/claudecode-color.svg` and `icons/codex-color.svg`.
2. Render each decorative `<img>` with fixed `width` and `height`, an empty
   `alt`, and adjacent visible label text that supplies the control's accessible
   name.
3. Verify the production build does not copy the full package and inspect both
   icons on light and dark backgrounds. The color variants do not need to
   change with the theme.
4. Reconsider `@lobehub/icons` only if the Runtime UI grows to use many AI and
   LLM brand icons. Consider Iconify only if the entire application needs a
   unified interface across multiple icon collections.

## License And Trademark

The Lobe Icons source and asset repository is [MIT licensed](https://github.com/lobehub/lobe-icons/blob/master/LICENSE).
Simple Icons is [CC0-1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md),
the `@icons-pack/react-simple-icons` wrapper is MIT, Iconify React is MIT, and
individual Iconify assets retain their collection licenses; `logos` is CC0.

Open-source licenses do not grant trademark rights. The official
[Simple Icons disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md)
states that the project's CC0 license does not establish that every brand icon
is automatically CC0, and users remain responsible for checking brand
guidelines and obtaining permission when needed. CC0 itself also does not grant
trademark rights. Foundry should use these marks only to identify the Runtime
being managed, avoid implying endorsement by Anthropic or OpenAI, and retain
upstream provenance so assets can be replaced after a brand update or removal.

## Primary Sources

- [Lobe Icons README and package matrix](https://github.com/lobehub/lobe-icons/blob/master/README.md), [`@lobehub/icons` npm metadata](https://registry.npmjs.org/%40lobehub%2Ficons/latest), [`@lobehub/icons-static-svg` npm metadata](https://registry.npmjs.org/%40lobehub%2Ficons-static-svg/latest)
- [Simple Icons npm package data](https://registry.npmjs.org/simple-icons/-/simple-icons-16.30.0.tgz), [`@icons-pack/react-simple-icons` npm metadata](https://registry.npmjs.org/%40icons-pack%2Freact-simple-icons/latest), [wrapper repository and usage documentation](https://github.com/icons-pack/react-simple-icons)
- [Iconify React documentation](https://iconify.design/docs/icon-components/react/), [Iconify React npm metadata](https://registry.npmjs.org/%40iconify%2Freact/latest), [`@iconify-icons/logos` npm metadata](https://registry.npmjs.org/%40iconify-icons%2Flogos/latest), [`logos` upstream repository](https://github.com/gilbarbara/logos)
- [LobeHub package manifest](https://github.com/lobehub/lobehub/blob/main/package.json), [Dashy package manifest](https://github.com/lissy93/dashy/blob/master/package.json)
