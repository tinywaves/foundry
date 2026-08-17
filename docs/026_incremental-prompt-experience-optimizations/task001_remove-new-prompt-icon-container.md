# Task 001: Remove the New Prompt Icon Container

## Status

`completed`

## Goal

Simplify the `New Prompt` card by presenting its plus sign as a standalone icon without the surrounding circular background.

## Detail

The `NewPromptCard` in `src/renderer/src/pages/prompts/prompt-card-grid.tsx` previously wrapped its Lucide `Plus` icon in an Astryx `Center` sized container with a full-radius muted accent background. That wrapper made the icon read as a separate circular control even though the entire dashed card is the navigation target.

The card now renders the existing medium accent-colored Astryx `Icon` directly in its centered vertical stack. The unused `Center`, radius token, and container style were removed. The dashed card boundary, spacing, text, route, card-level accessible label, and loaded and loading placements remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- A standalone plus icon in the `New Prompt` card.
- Removal of the unused circular icon container and its styling dependencies.
- Preservation of the existing card interaction and content hierarchy.

## Acceptance Criteria

- [x] The `New Prompt` card displays the plus sign without a circular background or container.
- [x] The plus sign retains its existing medium size and accent color.
- [x] The entire card retains its existing navigation target and accessible label.
- [x] The dashed card boundary, text, spacing, and Prompt data states remain unchanged.
- [x] Type checking, linting, and diff validation pass without automated visual verification.

## Out of Scope

- Changing the card's dashed border, dimensions, spacing, typography, copy, route, or interaction behavior.
- Changing other Prompt cards, the Prompt editor, Trash surfaces, or Prompt persistence behavior.
- Adding renderer component or visual-output tests.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Handoff

Task 001 establishes the standalone `New Prompt` plus icon as the baseline. A later Prompt-focused optimization may be implemented and synchronized as Task 002 after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `git diff --check` passed.
- Static inspection confirmed that `NewPromptCard` renders `Icon` with Lucide `Plus` directly and no longer imports or renders the circular `Center` wrapper.
- Static inspection confirmed that the existing `ClickableCard` label, route, dashed border, text, spacing, and icon size and color remain unchanged.
- The application was not launched, and no browser, screenshot, accessibility-tree, or desktop automation was performed, as required by repository policy.
