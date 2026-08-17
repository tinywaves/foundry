# Foundry Agent Guide

## Project Overview

Foundry is an Electron-based AI-native local developer runtime for tools, skills, agents, and workflows.
The project is currently in its early scaffolding stage.

## Stack and Runtime

- Package manager: `pnpm` `11.9.0`
- Node.js: `24.18.0`
- Desktop runtime: Electron
- Build tool: `electron-vite`
- UI: React 19 and TypeScript
- Linting: ESLint with `@dhzh/eslint-config`
- Packaging: `electron-builder`

Do not replace the existing framework, build tool, package manager, or TypeScript configuration without a clear need. Prefer the dependencies and scripts already used by the repository.

## Directory Structure

- `src/main/`: Electron main-process code, including window creation and application lifecycle.
- `src/preload/`: Preload scripts and type declarations for safe `contextBridge` APIs.
- `src/renderer/`: React renderer entry point and UI code.
- `resources/`: Runtime packaging assets such as the application icon.
- `build/`: `electron-builder` resources and macOS entitlements.
- `.agents/`: Repository-local agent skills; do not treat generated skill content as application source.
- `.claude/`: Claude Code project configuration.
- `.github/workflows/`: Release workflows.
- `dist/` and `out/`: Generated build artifacts; do not edit them manually.

The renderer uses the `@renderer/*` path alias. Prefer it for imports inside `src/renderer/src`.

## Documentation

- Write all project documentation in English, including plans, task documents, architecture notes, and repository guides.
- Preserve package names, API names, code identifiers, and other technical terms exactly as written in source code or upstream documentation.

## Development Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

Platform packaging:

```bash
pnpm build:mac
pnpm build:win
pnpm build:linux
```

After code changes, run checks appropriate to the affected area. At minimum, run `pnpm typecheck` and `pnpm lint`; run `pnpm build` when changing build configuration, main-process code, preload code, or packaging behavior.

For UI changes, do not launch the application or use browser, screenshot, accessibility-tree, or desktop automation to verify visual correctness. The user performs final visual inspection and acceptance. Continue to run applicable non-visual checks such as type checking, linting, builds, and automated behavior tests.

Renderer automated tests must cover functional behavior and pure logic only, such as models, validation, state transitions, query helpers, and other independently testable functions. Do not import or render React components, pages, layouts, route trees that load UI modules, or StyleX styling in renderer tests, and do not assert DOM structure, layout, styling, screenshots, or other visual output. When route-related behavior needs automated coverage, extract and test pure route constants or functions instead of importing the rendered route configuration. Verify renderer UI changes through type checking, linting, production builds, and user-performed visual acceptance.

## Coding Conventions

- Use TypeScript and avoid introducing untyped `any`. If an Electron API is not accurately represented by the current types, add a type declaration or a narrow local type.
- Keep the main-process, preload, and renderer boundaries explicit. Renderer code must not directly import Node.js or Electron main-process modules.
- When renderer code needs native capabilities, expose the smallest required API through `contextBridge` in `src/preload/index.ts` and update `src/preload/index.d.ts`.
- Do not expose full Node.js, Electron, or arbitrary IPC access through preload. Every exposed API must have a specific purpose and constrained inputs.
- Use `node:path` and the existing `import.meta.dirname` pattern for main-process paths. Do not depend on the current working directory.
- Follow the existing ESLint and formatting style. Use `pnpm lint-fix` for mechanical fixes when appropriate.
- Before adding a dependency, verify that the existing dependencies cannot satisfy the requirement, then update `pnpm-lock.yaml`.
- Install new dependencies without specifying a version so pnpm resolves the current latest release: use `pnpm add <package>` for runtime dependencies and `pnpm add <package> -D` for development dependencies.
- Add comments only when they explain intent or a non-obvious constraint.

## Reuse and Shared Definitions

- Before introducing a component, helper, utility, constant, type, or validation rule, search the relevant code paths for an existing implementation with the same or closely related responsibility.
- When the semantics, ownership, lifecycle, dependencies, and trust boundary align, reuse the existing implementation or extract the smallest stable shared definition as part of the current change.
- Prefer sharing domain constants, pure types, and genuinely identical behavior from the narrowest appropriate module. Do not create a broad common module or speculative generic abstraction for possible future reuse.
- Do not force reuse based only on similar appearance, naming, or syntax. Keep implementations separate when their interaction semantics, process ownership, security responsibilities, or change cadence differ.
- Preserve renderer, preload, and main-process boundaries when evaluating reuse. Renderer-side user-experience validation and authoritative main-process validation may intentionally remain separate unless a shared pure definition preserves both responsibilities.
- When no safe and meaningful reuse opportunity exists, keep the new implementation local and focused rather than weakening module boundaries to remove superficial duplication.

## Styling

- Use StyleX as the project's styling system.
- Prefer StyleX styles and design tokens for renderer UI. Do not introduce standalone CSS files, CSS modules, Tailwind, or other styling systems unless explicitly required by an existing third-party integration.
- Keep style definitions close to the component that owns them and use typed StyleX APIs rather than ad hoc string-based class names.
- Use `lucide-react` for application-authored icons. When Lucide provides a suitable icon, do not use Astryx semantic icon strings or hand-authored SVGs. Icons rendered internally by unmodified Astryx components remain owned by Astryx.

## Electron Security

- Preserve the existing context-isolation and preload architecture. Do not disable security isolation for convenience.
- Handle external links through the main process with `shell.openExternal`, keeping window-opening behavior controlled.
- When adding IPC or filesystem capabilities, validate inputs, limit permission scope, and do not give the renderer arbitrary path or command execution access.
- When changing CSP, window permissions, sandbox settings, or `electron-builder.yml`, consider both development and production packaging paths.

## Change Workflow

1. Read the target file and its direct callers before editing. Confirm whether the change belongs in main, preload, or renderer.
2. Keep the change focused. Do not refactor unrelated code or overwrite existing user changes.
3. Add the smallest necessary type or behavior verification. The project currently has no dedicated test script.
4. Run relevant checks and report any checks that could not be run.
5. Never manually edit `dist/` or `out/`; regenerate them with the appropriate build command.

## Release

The release workflow is in `.github/workflows/release.yml`. Pushing a `v*` tag builds a macOS Universal package and creates a GitHub Release.
When changing release configuration, keep the pnpm version, Node.js version, build targets, and `electron-builder.yml` compatible.

## Git Rules

- Do not use destructive commands to overwrite existing workspace changes.
- Do not commit build artifacts, dependency directories, or local environment files.
- Before committing, inspect `git status` and `git diff` and confirm that only task-related changes are included.
- Commit messages must use `<type>(<scope>): <concrete behavior or outcome>`. Subjects must contain at least three words and 12 characters. `feat`, `fix`, and `perf` commits require a scope because their subjects become grouped GitHub Release notes. Avoid vague subjects such as `fix issue`, `update code`, or `wip`.

<!-- ASTRYX:START -->
Astryx v0.2.0 · 154 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: use component props first; otherwise use StyleX with the project's design tokens. Do not use raw hex/px values or xstyle/utility classes.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   154 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
