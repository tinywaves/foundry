# Task 001: Align Empty-State Icons and Density

## Status

`completed`

## Goal

Ensure every renderer page using the shared empty state presents the same icon as its selected sidebar destination and make the message below the icon slightly smaller and more compact.

## Detail

Audit every `PageEmptyState` consumer against the icon shown by its corresponding `SideNavItem`. Skills, MCP Servers, Prompts, and Sessions already used matching icons, while Providers used `ServerCog` instead of the sidebar's `Plug`, and the Prompt Trash page used `Trash2` instead of the selected Prompts destination's `FileText`.

Move the sidebar destination icons into a focused renderer-owned `navigation-icons.ts` definition. Update the sidebar and every shared empty-state consumer to reference those definitions so matching behavior is structural rather than dependent on duplicated imports.

Enable the Astryx `EmptyState` compact variant in `PageEmptyState`. This changes the single message line from the large text token to the label text token and reduces the component's spacing while preserving its full-height centered layout, icon size, consumer-owned text, and semantic heading level.

## Findings

- Providers and Prompt Trash were the only empty-state consumers whose icons differed from the currently selected sidebar item.
- The Astryx `EmptyState` API exposes `isCompact` as the supported way to reduce title size and spacing without introducing custom descendant styling.

## Deliverables

- Shared renderer navigation icon definitions used by the sidebar and empty states.
- Matching empty-state icons for Skills, MCP Servers, Prompts, Prompt Trash, Providers, and Sessions.
- A slightly smaller and tighter shared empty-state presentation through the Astryx compact variant.

## Acceptance Criteria

- [x] Every `PageEmptyState` consumer uses the icon definition owned by its corresponding sidebar destination.
- [x] Providers uses the same `Plug` icon as the Providers sidebar item.
- [x] Prompt Trash uses the same `FileText` icon as the selected Prompts sidebar item.
- [x] Existing matching pages remain aligned through the shared icon definitions.
- [x] Empty-state message text uses the Astryx compact visual treatment without custom CSS or raw typography values.
- [x] Existing empty-state text, icon size, centering, and heading semantics remain unchanged.
- [x] Type checking, linting, and diff validation pass without automated visual verification.

## Out of Scope

- Changing empty-state copy or adding descriptions and actions.
- Changing sidebar labels, routes, selection behavior, resizing, or layout.
- Changing page headers, loading states, error states, tables, cards, or dialogs.
- Main-process, preload, IPC, persistence, build, packaging, or dependency changes.
- Automated visual inspection or application launch.

## Handoff

Task 001 establishes shared icon ownership for navigation-related empty states. Add the next requested optimization to Plan 023 as Task 002 and keep the top-level plan in progress while the optimization sequence continues.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `git diff --check` passed.
- Static inspection confirmed that all `PageEmptyState` consumers reference the shared sidebar icon definitions and that `PageEmptyState` uses the Astryx `isCompact` prop.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
