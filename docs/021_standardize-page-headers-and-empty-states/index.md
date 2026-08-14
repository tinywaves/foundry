# Standardize Page Headers and Empty States

## Status

`completed`

## Goal

Standardize Foundry's non-Dashboard renderer pages with a shared compact page header and a display-only empty state, removing duplicated page-level implementations while preserving page-specific meaning and behavior outside those presentation boundaries.

## Detail

Extract a renderer-owned page header based on the existing compact treatment used by Runtimes and Providers. The shared header presents consumer-provided text on the left and accepts optional consumer-provided actions on the right. Migrate Runtimes, Providers, Skills, MCP Servers, Prompt Templates, and Sessions to the shared header while leaving Dashboard unchanged. Runtimes retains its Manage Providers action, Providers retains its Add Provider action, and the four unavailable feature pages provide no header action.

Extract a renderer-owned display-only empty state based on the existing Providers empty-state treatment. The shared empty state presents a consumer-provided icon and one line of consumer-provided text. It does not define feature-specific language or accept descriptions, children, buttons, links, or other actions.

Migrate Providers and all four unavailable feature pages to the shared empty state. Providers retains its runtime-specific empty-state text but removes the duplicate Add Provider action from the empty content because that command remains available in the page header. Each unavailable feature page supplies its own existing unavailable text while removing its explanatory description and Return to Dashboard link.

Remove `UnavailableFeaturePage` after Skills, MCP Servers, Prompt Templates, and Sessions compose the shared page header and empty state directly. Keep the work within the renderer and continue using Astryx, StyleX, design tokens, and Lucide or existing renderer-owned icon components without adding a dependency.

## Scope

- Add a shared compact page header for non-Dashboard renderer pages.
- Support consumer-provided header text and an optional consumer-provided right-side action.
- Migrate Runtimes, Providers, Skills, MCP Servers, Prompt Templates, and Sessions to the shared header.
- Add a display-only shared empty state with a consumer-provided icon and single line of text.
- Migrate Providers, Skills, MCP Servers, Prompt Templates, and Sessions to the shared empty state.
- Remove the obsolete `UnavailableFeaturePage` abstraction and its unused description and navigation behavior.
- Preserve existing page-specific operations in their approved header locations.

## Out of Scope

- Any Dashboard code, presentation, or behavior change.
- Route, redirect, sidebar, or navigation-contract changes.
- Loading, error, data, dialog, or mutation-state redesign.
- Provider persistence, forms, runtime behavior, IPC, preload, main-process, or database changes.
- Implementing Skills, MCP Servers, Prompt Templates, or Sessions functionality.
- New dependencies or styling systems.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Decisions

- Treat every routed page except Dashboard as the shared page-header migration scope.
- Base the shared header on the compact Runtimes and Providers treatment rather than the existing unavailable-page heading treatment.
- Keep header text consumer-owned and allow an optional consumer-owned action on the right.
- Give the four unavailable feature pages no header action for now.
- Make the shared empty state presentation-only, with exactly a consumer-provided icon and one line of consumer-provided text.
- Do not embed `Aren't Available Yet` or any other domain language in the shared empty-state component.
- Keep all empty-state actions outside the shared empty state; Providers uses its existing header action, and the unavailable pages no longer provide Return to Dashboard.
- Remove `UnavailableFeaturePage` instead of retaining a feature-specific wrapper over the shared primitives.
- Leave Dashboard unchanged even though it retains a separate header implementation.
- Preserve Astryx, StyleX, design-token, icon-ownership, renderer-boundary, and non-visual verification constraints.

## Tasks

- [x] [Task 001: Standardize Page Headers and Empty States](./task001_standardize-page-headers-and-empty-states.md)
