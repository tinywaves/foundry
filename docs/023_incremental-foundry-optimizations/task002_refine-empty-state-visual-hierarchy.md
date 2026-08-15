# Task 002: Refine Empty-State Visual Hierarchy

## Status

`completed`

## Goal

Improve the shared full-page empty state's visual hierarchy so the empty region has a clear, intentional boundary without adding unnecessary copy, actions, or heavy container chrome.

## Detail

The current compact empty state places a small secondary icon directly above a semibold title in a large blank content region. Without any boundary around the empty region, the composition feels sparse rather than deliberately minimal.

Keep the Astryx `EmptyState` component, its compact title treatment, full-height centering, semantic heading, and display-only API. Wrap it in a transparent Astryx `Section` that provides consistent content inset, then style the Empty State root as a full-height rounded dashed panel using the same border token pattern as Astryx's dashed Dropzone treatment. Use the standard low-contrast border token with no additional panel fill and retain the existing secondary destination icon. Slightly increase the internal gap with the spacing scale so the icon and title read as a balanced group.

Apply the refinement in the shared `PageEmptyState` component so Providers, Skills, MCP Servers, Prompts, Prompt Trash, and Sessions remain visually consistent without page-specific styling.

## Findings

- The screenshot's primary weakness is the lack of a visible boundary around the otherwise blank content region.
- An initial circular accent icon treatment did not provide the requested structure and was replaced after user review.
- The initial emphasized dashed border and muted panel fill competed too strongly with the message, so the final treatment uses the standard border token on a transparent surface.
- A Card would add unnecessary elevation and solid container chrome, while a dashed panel establishes a lightweight boundary appropriate for empty content.
- Astryx `Section` provides the page-region inset, and the existing Astryx border, color, radius, and spacing tokens provide a theme-safe dashed treatment.

## Deliverables

- An inset, rounded dashed panel around the shared empty state.
- A low-contrast transparent treatment with a neutral secondary destination icon.
- Token-driven border width, border color, radius, and spacing without raw values or new styling systems.
- Consistent presentation across every `PageEmptyState` consumer.

## Acceptance Criteria

- [x] The empty content region has a subtle rounded dashed boundary that does not compete with the message.
- [x] The panel treatment uses Astryx and StyleX design tokens and adapts to the active theme.
- [x] The shared title remains compact, concise, and semantically rendered as the existing level-two heading.
- [x] Empty-state text, actions, routing, loading behavior, and page-specific operations remain unchanged.
- [x] All `PageEmptyState` consumers receive the visual refinement without page-specific duplication.
- [x] Type checking, linting, and diff validation pass without automated visual verification.

## Out of Scope

- Adding descriptions, onboarding guidance, illustrations, buttons, or links.
- Wrapping the full-page state in a Card or changing the application-level page background.
- Changing navigation icons, empty-state text, page headers, routes, or provider workflows.
- Main-process, preload, IPC, persistence, build, packaging, or dependency changes.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 002 establishes the refined dashed-panel empty-state presentation. Add the next requested optimization to Plan 023 as Task 003.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `git diff --check` passed.
- Static inspection confirmed that the shared panel uses Astryx `Section`, Astryx `EmptyState`, Astryx `Icon`, StyleX, and theme-safe border, spacing, radius, and icon color tokens without an additional panel fill.
- Static inspection confirmed that no page-specific consumer, copy, action, route, loading state, error state, or provider workflow changed.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
