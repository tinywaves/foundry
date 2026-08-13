# Align Feature Page Titles and Empty States

## Status

`ready`

## Goal

Align the upper-left title treatment and empty-state expression of existing feature pages outside Prompt Templates so page titles follow the compact Runtimes and Providers convention and each empty state's terminology and primary icon correspond to its navigation destination while preserving page-specific functional meaning.

## Detail

Execute this plan after Plan 021 has replaced the Prompt Templates placeholder with its own page foundation. At that point the shared unavailable-feature component serves Skills, MCP Servers, and Sessions, so this plan can align those remaining placeholder pages without duplicating or overriding the Prompt Templates work.

Match the upper-left title treatment of Skills, MCP Servers, and Sessions to the established Runtimes and Providers pattern. Use the same visual heading level, semantic level-one page-heading behavior, spacing, and alignment, and remove the additional divider currently attached to the placeholder title region. Do not infer an empty Toolbar, disabled command, or other placeholder control from title consistency; controls and content remain determined by each page's actual functionality.

Preserve the existing feature-specific icons, unavailable explanations, and Return to Dashboard action for Skills, MCP Servers, and Sessions because those states already correspond to their navigation destinations and accurately describe the unavailable capabilities.

Audit every existing non-Prompt Templates Empty State for alignment with the navigation-owned feature concept. Require core terminology to identify the corresponding destination while allowing context-specific titles such as `No Codex Providers Yet` rather than mechanically copying the navigation label. Require the primary Empty State icon to match the icon used by that feature's navigation destination. Correct the current Providers mismatch by replacing its `ServerCog` Empty State icon with the navigation-owned `Plug` icon.

Keep descriptions and actions specific to the actual page and state instead of forcing uniform copy or commands. Do not invent Empty States for Dashboard or Runtimes, which do not currently have one. The audit does not alter data loading, error states, navigation behavior, or feature workflows. Add focused non-visual verification for title presentation and semantics, navigation-to-empty-state icon mappings, and core feature terminology.

## Scope

- Upper-left title alignment for Skills, MCP Servers, and Sessions.
- A focused update to the shared unavailable-feature page title structure.
- Removal of the extra divider from placeholder title regions.
- An audit of every existing non-Prompt Templates Empty State.
- Semantic alignment between navigation concepts and Empty State terminology.
- Exact alignment between navigation icons and primary Empty State icons.
- Replacement of the Providers Empty State `ServerCog` icon with `Plug`.
- Preservation of page-specific descriptions and functional actions.
- Focused static or automated non-visual verification.

## Out of Scope

- The Prompt Templates page or its empty states, which Plan 021 owns.
- Adding an Empty State to Runtimes, Dashboard, or any page that does not currently require one.
- Empty Toolbars, disabled commands, or controls without actual functionality.
- Requiring identical Empty State descriptions or actions across pages.
- Implementing Skills, MCP Servers, or Sessions functionality.
- Provider data, interaction, loading, or error-state changes.
- Navigation structure, labels, paths, or ordering changes.
- A global page-frame refactor or a new shared design-system layer.
- A mandatory abstraction for future pages.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for visual acceptance.

## Decisions

- Treat the current Runtimes and Providers upper-left title presentation as the established feature-page convention.
- Limit title consistency to the title region and do not infer common Toolbars or page content from it.
- Execute after Plan 021 so Prompt Templates is not adjusted twice through the shared placeholder component.
- Require Empty State terminology to align semantically with navigation without requiring exact duplicate wording.
- Require the primary Empty State icon to match the navigation-owned feature icon.
- Use `Plug` for the Providers Empty State to resolve its current mismatch with navigation.
- Keep descriptions and actions specific to their real state and workflow.
- Do not create Empty States solely for visual consistency.

## Tasks

- [ ] [Task 001: Align Unavailable Feature Page Titles](./task001_align-unavailable-feature-page-titles.md)
- [ ] [Task 002: Audit and Align Navigation-Owned Empty States](./task002_audit-and-align-navigation-owned-empty-states.md)
