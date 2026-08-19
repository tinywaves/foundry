# Task 007: Use Selectable Distribution Target Cards

## Status

`completed`

## Goal

Make Distribution Target selection more recognizable and direct by replacing checkbox-led rows with icon-led selectable cards.

## Detail

The distribution Dialog previously rendered a compact divided List. Each row placed a checkbox before the Target name and separated the selection control, filesystem path, and status feedback across the row. This made every Target visually similar and constrained recognition to reading its label.

The selection surface now uses an Astryx `Grid` containing controlled `SelectableCard` options. Each card introduces the existing `SkillTargetIcon`, keeps the Target name and path together, and retains the live status dot and label used before selection, during preflight, while applying, and after completion. The complete card toggles membership in the existing selected-ID Set, while the top-level select-all checkbox continues to support bulk selection.

The Dialog keeps two columns at its existing width. Cards use Astryx spacing props and a consistent internal hierarchy so Target identity receives primary emphasis and operational feedback remains scannable. Long paths wrap within the card instead of widening the Dialog.

This task changes only the renderer selection surface. Preflight remains required before confirmation, replacement and blocked states remain authoritative, and distribution continues through the existing constrained preload and main-process APIs.

## Findings

- Target brand and fallback icons already exist in the shared renderer-side `SkillTargetIcon` component.
- Astryx `SelectableCard` supports controlled multi-selection directly and does not require nested checkbox inputs.
- The existing selected-ID Set, select-all behavior, and mutation reset rules can be reused without a new state model.
- Distribution feedback must remain visible inside each option because selection alone does not describe disabled, blocked, replacement, applying, or result states.
- A two-column Grid reduces Dialog height while keeping each option wide enough for names, statuses, and filesystem paths.

## Dependencies

- Astryx `SelectableCard`, `Grid`, `Stack`, `Text`, and `StatusDot`.
- Existing renderer-side `SkillTargetIcon` brand and fallback icon mapping.
- Existing distribution selection, preflight, confirmation, and result state.

## Deliverables

- A two-column selectable-card grid for Distribution Targets.
- Target icons displayed with names and configured paths.
- Whole-card multi-selection with the existing select-all control.
- Existing per-Target feedback retained inside each card.
- Unchanged preflight, confirmation, mutation, and result behavior.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] Distribution Targets render as `SelectableCard` options rather than checkbox-led List rows.
- [x] Each card displays the Target icon, display name, path or current feedback message, status dot, and status label.
- [x] Selecting and deselecting a card updates the existing selected-ID Set.
- [x] Select all continues to select or clear every configured Target.
- [x] Busy and completed states prevent selection changes as before.
- [x] Preflight and result feedback continue to update each Target option.
- [x] Long Target names and paths remain bounded within the Dialog.
- [x] The implementation adds no persistence, IPC, preload, main-process, dependency, or Astryx changes.
- [x] Renderer verification does not render React UI or assert card structure or styling.

## Out of Scope

- Distributing directly from the Store table.
- Bypassing preflight or confirmation.
- Changing Target ordering, availability, policy, or filesystem behavior.
- Adding, replacing, or recoloring Target brand assets.
- Changing distribution result semantics or persistence.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 007 establishes an icon-led, whole-option selection pattern for Distribution Targets. Future distribution refinements should preserve preflight and mutation boundaries while keeping option feedback local to the corresponding card.

## Verification

- `pnpm exec vitest run` passed all 60 test files and 304 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that the Dialog no longer imports Astryx List rows, reuses `SkillTargetIcon`, and preserves the existing select-all, preflight, confirmation, and result state paths.
- The application will not be launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation will be performed, as required by repository policy.
