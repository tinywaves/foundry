# Refine Renderer Navigation and Pages

## Status

`completed`

## Goal

Refine Foundry's renderer into a cohesive operational interface by simplifying sidebar navigation, replacing placeholder pages with meaningful states, tightening Provider runtime controls, and improving Provider form clarity and safeguards.

## Detail

Keep `Providers` as the product entity name and retain its existing `/agents-switch/providers` route. Replace the collapsible Agents Switch navigation item with a static `SideNavSection` so the section label establishes context while the Providers destination remains visible. Preserve the resizable, non-collapsible application sidebar and the existing route-derived selected state.

Replace the Dashboard demonstration content with Provider connection metrics and per-runtime health derived from the existing TanStack Query Provider lists. Give Skills an explicit unavailable state instead of a title-only placeholder. Both pages use consistent compact page headers and provide direct navigation to the next relevant destination.

Place the Providers title, icon-only runtime tabs, and Add Provider action in one compact toolbar. Use official Codex and Claude Code assets from `@lobehub/icons-static-svg`, retain accessible tab labels and tooltips, and synchronize the selected runtime with the `runtime` URL query parameter so the view is linkable and restorable.

Improve Provider dialogs without changing Provider persistence or IPC contracts. Add stable field names, focus the first invalid field, confirm before discarding unsaved values or avatar intent, clarify action labels and feedback, and preserve the existing TanStack Query ownership and sensitive-data lifetimes.

Complete the pass with renderer metadata, shared router-aware Astryx links, an accessible main-content landmark, a keyboard skip link, and explicit image dimensions. Continue to use Astryx, StyleX, design tokens, and Lucide icons for application-authored interface icons.

## Scope

- Replace the collapsible Agents Switch navigation group with a static section and an always-visible Providers destination.
- Preserve the resizable, non-collapsible sidebar, route paths, selected states, macOS drag region, and cross-platform behavior.
- Replace Dashboard sample content with Provider totals, connection metrics, runtime health, loading states, failure recovery, and a Manage Providers link.
- Replace the Skills title-only placeholder with an unavailable empty state and a return path to Dashboard.
- Place the Providers title and runtime tabs together in a compact toolbar with the Add Provider action aligned opposite them.
- Render Codex and Claude Code runtime tabs with official static icons, hidden accessible labels, and visible tooltips.
- Synchronize Provider runtime selection to `?runtime=codex` or `?runtime=claude-code` and canonicalize missing or invalid values to Codex.
- Preserve Provider list, reveal, copy, connection-test, edit, and delete behavior while refining labels and state communication.
- Add field names, first-error focus, and unsaved-change confirmation to Provider forms.
- Add document language and viewport metadata, router-aware Astryx links, a main landmark, a skip link, and explicit local image dimensions.

## Out of Scope

- Changing Provider persistence, SQLite schema, preload APIs, IPC contracts, or main-process behavior.
- Applying a Provider to Codex, Claude Code, or an Agent.
- Adding Skills discovery, installation, execution, or management behavior.
- Adding new Dashboard data sources beyond existing Provider queries.
- Changing sidebar resize bounds or persisting its width.
- Adding runtime discovery or allowing arbitrary Provider runtimes.
- Changing API-key storage, reveal duration, clipboard behavior, or query-cache policy.
- Adding browser, screenshot, accessibility-tree, or desktop automation verification.

## Decisions

- Keep `Provider` and `Providers` as the user-facing entity terminology.
- Use a static `SideNavSection` for Agents Switch because a single always-visible destination does not need disclosure behavior.
- Keep the Agents Switch label as section context rather than a navigable page.
- Derive Dashboard data from the existing runtime-scoped Provider query layer without adding a new renderer or preload data contract.
- Treat Skills as unavailable in the current build and communicate that state explicitly.
- Use icon-only runtime tabs in the compact Provider toolbar while preserving labels for assistive technology and tooltips for sighted users.
- Use `@lobehub/icons-static-svg` for official runtime marks and continue using Lucide for application-authored semantic icons.
- Store runtime selection in the URL rather than duplicate it in local React state.
- Confirm dialog dismissal only when form values or avatar intent differ from their initial state.
- Focus the first field error after local or API validation so correction begins at the relevant control.
- Preserve Astryx, StyleX, existing tokens, Electron security boundaries, and non-visual verification policy.

## Tasks

- [x] [Task 001: Refine Application Shell and Sidebar](./task001_refine-application-shell-and-sidebar.md)
- [x] [Task 002: Build Operational Dashboard and Skills States](./task002_build-operational-dashboard-and-skills-states.md)
- [x] [Task 003: Refine Provider Runtime Navigation](./task003_refine-provider-runtime-navigation.md)
- [x] [Task 004: Improve Provider Form and Feedback](./task004_improve-provider-form-and-feedback.md)
