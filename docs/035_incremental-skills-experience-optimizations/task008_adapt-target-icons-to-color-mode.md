# Task 008: Adapt Target Icons to Color Mode

## Status

`completed`

## Goal

Keep every Distribution Target icon recognizable and legible in both light and dark application themes by using available specific branding and adapting only monochrome artwork.

## Detail

The selectable Distribution Target cards introduced in Task 007 exposed both branding and contrast limitations. Agent Skills and Hermes Agent still used generic Lucide symbols even though specific artwork was available. OpenCode, Cursor, GitHub Copilot, and Hermes Agent provide black monochrome SVG files, so those marks become difficult to distinguish from a dark card surface. Colored assets and the self-contained Agent Skills avatar do not share this problem.

Agent Skills now uses the provided GitHub avatar as a bundled local PNG so it remains available under the renderer's local-only image policy and does not depend on a runtime network request. Its square image is clipped with the restrained Astryx inner-radius token so the compact mark keeps subtle rounded corners in every theme. Hermes Agent uses the `hermesagent.svg` asset already included in the installed static icon package.

The shared `SkillTargetIcon` records whether each URL asset is monochrome. It reads the effective color mode from the nearest Astryx Theme, including the resolved operating-system preference when the application uses system mode. In effective dark mode, only monochrome assets are normalized to a light mark through a StyleX filter. Light mode retains the source artwork.

Colored Claude Code, Gemini CLI, OpenClaw, and Codex assets keep their brand colors in every mode. The Agent Skills PNG retains its own foreground and background treatment. Custom Targets use the Lucide `Blocks` icon instead of a generic folder and retain an Astryx semantic color prop.

This task changes only renderer icon presentation and adds the single provided Agent Skills image as a local resource. It adds no dependencies, persistence, IPC, preload, main-process, or distribution behavior.

## Findings

- The installed static icon package exposes a Hermes Agent brand SVG but no specific Agent Skills asset.
- The provided Agent Skills avatar is a 60 by 60 PNG and must be bundled locally because the renderer Content Security Policy does not allow remote image origins.
- The installed static icon package exposes only one non-color SVG for OpenCode, Cursor, GitHub Copilot, and Hermes Agent rather than separate light and dark variants.
- Astryx `useTheme` returns the effective `light` or `dark` mode, including resolution of system preference.
- Applying a dark-mode filter to every image would incorrectly alter colored brand assets.
- Lucide `Blocks` gives Custom Targets a more distinctive modular identity than a generic folder while retaining Astryx semantic color behavior.

## Dependencies

- Existing `@lobehub/icons-static-svg` Target assets.
- Provided Agent Skills avatar stored as a local application resource.
- Astryx `useTheme` and the existing application Theme provider.
- Existing StyleX renderer styling.

## Deliverables

- Specific Agent Skills and Hermes Agent artwork in place of generic symbols.
- Token-based rounded corners for the Agent Skills image.
- A modular Lucide `Blocks` symbol for Custom Targets.
- Explicit monochrome metadata for URL-backed Target icon assets.
- Dark-mode contrast adaptation for OpenCode, Cursor, GitHub Copilot, and Hermes Agent.
- Unchanged rendering for colored brand assets and the self-contained Agent Skills image, with a token-driven Custom Target symbol.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] Agent Skills uses the provided avatar from a bundled local resource.
- [x] The Agent Skills image uses the restrained Astryx inner-radius token for rounded corners.
- [x] Hermes Agent uses the available static brand SVG.
- [x] OpenCode, Cursor, GitHub Copilot, and Hermes Agent use light marks in effective dark mode.
- [x] The same monochrome assets retain their source appearance in light mode.
- [x] System theme preference is resolved through Astryx rather than a direct media-query branch.
- [x] Colored and self-contained image assets are not filtered or recolored.
- [x] Custom Targets use Lucide `Blocks` with an Astryx semantic color.
- [x] The implementation adds no new dependencies or runtime remote-image requirement.
- [x] Renderer verification does not render React UI or assert icon styling.

## Out of Scope

- Replacing brand artwork or changing icon dimensions.
- Replacing the user-provided Agent Skills avatar or adding separate light and dark files to the static icon dependency.
- Changing Target card layout, selection, status, or distribution behavior.
- Adding renderer component, DOM, screenshot, or accessibility-tree tests.

## Handoff

Task 008 makes specific branding and theme adaptation explicit properties of Target icon assets. Future icons should use a specific local or dependency-provided asset where available, retain native brand color, and opt into monochrome adaptation only when their source artwork cannot provide sufficient dark-surface contrast.

## Verification

- `pnpm exec vitest run` passed all renderer-independent automated tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that Agent Skills and Hermes Agent use their specific assets, only monochrome URL assets receive the effective-dark-mode filter, and Custom Targets use the semantic-color Lucide `Blocks` symbol.
- The application will not be launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation will be performed, as required by repository policy.
