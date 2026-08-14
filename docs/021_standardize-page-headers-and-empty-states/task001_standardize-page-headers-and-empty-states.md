# Task 001: Standardize Page Headers and Empty States

## Status

`completed`

## Goal

Establish shared renderer components for compact page headers and display-only empty states, migrate every approved non-Dashboard consumer, and remove the superseded unavailable-page abstraction.

## Detail

Add a renderer-owned `PageHeader` component under the existing shared components boundary. Its public interface requires consumer-provided text and accepts an optional consumer-provided right-side action. Internally, use Astryx `Section`, `HStack`, and `Heading` to preserve the compact Runtimes header treatment: the existing horizontal and block padding, a stable medium-element minimum height, space between the title and action, centered cross-axis alignment, visual heading level three, and semantic heading level one. Do not add a bottom divider. Keep the component limited to page-heading presentation rather than navigation or page-shell ownership.

Migrate Runtimes, Providers, Skills, MCP Servers, Prompt Templates, and Sessions to `PageHeader`. Runtimes continues to provide its existing route-aware Manage Providers link as the right-side action. Providers continues to provide its existing Add Provider button. Skills, MCP Servers, Prompt Templates, and Sessions provide no action. Do not modify Dashboard or migrate its distinct header.

Add a renderer-owned `PageEmptyState` component under the same shared components boundary. Its public interface requires an Astryx-compatible icon component and a text string, with no description, children, or action slot. Internally, reuse Astryx `EmptyState` and `Icon` so the presentation follows the existing Providers empty state: a large secondary icon, one consumer-owned text value, semantic heading level two, and a StyleX-owned full-height minimum. Allow the text to wrap naturally when the available width cannot contain it; do not add truncation or forced overflow. Keep all domain language in consumers.

Migrate the Providers successful-empty state to `PageEmptyState`, retaining its runtime-specific `No <Runtime> Providers Yet` text and `ServerCog` icon. Remove the empty-content Add Provider button because the unchanged header action remains available. Preserve the Providers loading, error, populated-list, runtime navigation, dialog, mutation, and confirmation branches.

Replace `UnavailableFeaturePage` usage in Skills, MCP Servers, Prompt Templates, and Sessions with direct composition of a full-height Astryx page stack, `PageHeader`, a fill-sized content item, and `PageEmptyState`. Each page retains its existing feature icon and supplies its own existing `<Feature> Aren't Available Yet` text. Remove the explanatory descriptions and Return to Dashboard links. Delete the obsolete `UnavailableFeaturePage` module after all consumers are migrated.

Keep the change entirely in renderer presentation code. Use existing Astryx components, StyleX, design tokens, Lucide icons, and the renderer-owned MCP icon. Do not add dependencies, raw layout elements, standalone CSS, or cross-process behavior. Under repository policy, verify the change non-visually without launching the application or using browser, screenshot, accessibility-tree, or desktop automation.

## Findings

None.

## Dependencies

None.

## Deliverables

- A shared compact `PageHeader` with consumer-owned text and an optional right-side action.
- A shared display-only `PageEmptyState` with a consumer-owned icon and text.
- Runtimes and Providers migrated to the approved shared presentation components while retaining their header actions.
- Skills, MCP Servers, Prompt Templates, and Sessions directly composed from the shared page primitives.
- Removal of `UnavailableFeaturePage`, empty-state actions, and unavailable-page descriptions.
- Non-visual verification of behavior preservation, migration completeness, and renderer-only scope.

## Acceptance Criteria

- [x] Runtimes, Providers, Skills, MCP Servers, Prompt Templates, and Sessions use the shared page header, while Dashboard remains unchanged.
- [x] The shared header consistently renders consumer-provided text with the approved compact visual treatment and semantic level-one heading behavior.
- [x] Runtimes retains Manage Providers and Providers retains Add Provider as right-side header actions; the four unavailable feature pages provide no header action.
- [x] Providers, Skills, MCP Servers, Prompt Templates, and Sessions use the shared empty state.
- [x] The shared empty state accepts only a consumer-provided icon and text, renders no description or action, and preserves the approved full-height Providers presentation.
- [x] Empty-state text can wrap without clipping or overflowing when the content region is constrained.
- [x] The Providers empty state retains its runtime-specific text and icon but no longer contains a duplicate Add Provider button; all other Providers request and operation states remain behaviorally unchanged.
- [x] Each unavailable feature page retains its feature icon and consumer-owned unavailable text but no longer displays an explanatory description or Return to Dashboard link.
- [x] The `UnavailableFeaturePage` module and every active-source reference to it are removed.
- [x] The implementation adds no dependency, raw layout element, standalone CSS, route change, or main-process, preload, IPC, persistence, or database behavior.
- [x] Tests, type checking, linting, diff validation, and planned static inspections pass without automated visual verification.

## Out of Scope

- Any Dashboard code, header, content, presentation, or behavior change.
- Route, redirect, sidebar, or navigation-contract changes.
- Loading, error, populated-list, dialog, mutation, or confirmation redesign.
- Provider forms, persistence, runtime application, IPC, preload, main-process, or database changes.
- Implementing Skills, MCP Servers, Prompt Templates, or Sessions functionality.
- Additional shared page-shell, loading-state, error-state, or action abstractions.
- New dependencies, styling systems, component-test infrastructure, or visual-test infrastructure.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Completion leaves every approved non-Dashboard page using a stable compact header boundary and every current empty surface using a display-only shared empty state. Future pages can compose those primitives while retaining ownership of their text, icons, actions, and domain behavior.

## Verification

- `pnpm test` passed 15 test files and 99 tests under Vitest 4.1.10.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint deprecation notices.
- `git diff --check` passed.
- Static inspection confirmed that every approved page imports the shared components, no active source references `UnavailableFeaturePage`, and Dashboard has no diff.
- Static inspection confirmed that the shared empty state exposes only icon and text inputs and renders no description, children slot, or action.
- Static inspection confirmed that the changed renderer modules use Astryx, StyleX, design tokens, and approved icon ownership without raw layout elements or standalone CSS.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy. Final visual inspection remains with the user.
