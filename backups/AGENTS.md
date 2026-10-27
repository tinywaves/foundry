# AGENTS.md

Project-specific guidance for AI coding agents.

<!-- ASTRYX:START -->
Astryx v0.7.0 · 168 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Prefer Astryx component props; when they are insufficient, use `xstyle={styles.foo}`. Use `{...stylex.props(styles.foo)}` for native HTML elements. Do not use Tailwind utility classes or hardcoded native styles.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands, API reference, integration authoring
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

## Application conventions
- Use Astryx components at `size="sm"` by default for application controls (inputs, selectors, buttons, switches, and tokens); use a larger size only when accessibility or layout requires it.
- Keep server state in a query/mutation layer such as TanStack Query; avoid page-level `useEffect` for server-state fetching and synchronization.
- Put types and contracts shared by main, preload, and renderer in `src/shared/`; process-specific modules should not be the source of shared renderer contracts.
- Use TanStack Query for server-state fetching, caching, and mutations.
- Split components into focused files instead of placing many components in one file.
- Page-level and primary content containers must fill the available layout width. Do not cap them with numeric `maxWidth`; render full-width Markdown with `contentWidth="none"`. The surrounding `LayoutContent` owns the page width; use padding and component gaps elsewhere.
- After writing code, run `pnpm run lint` and `pnpm run lint-fix`.
- During every implementation, check for unused translation keys and remove any leftover multilingual entries that are no longer referenced.

## Dialog spacing
- Treat `Dialog` `padding` as the single source of outer inset. Use `padding={5}` for standard forms and multi-section dialogs; a compact utility dialog may use `padding={4}`.
- Do not use `padding={0}` on a dialog unless its design is intentionally full-bleed, and then add padding explicitly to every header, content, and footer region.
- When a dialog uses `Layout`, let the inherited `Dialog` padding align `DialogHeader`, `LayoutContent`, and `LayoutFooter`. Do not add competing outer padding to those regions; use stack `gap` for spacing between sections.
- Keep field validation attached to its `TextInput` through `status`; do not add detached error rows that compete with the form's vertical rhythm.
