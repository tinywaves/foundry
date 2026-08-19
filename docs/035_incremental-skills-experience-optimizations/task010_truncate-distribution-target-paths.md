# Task 010: Truncate Distribution Target Paths

## Status

`completed`

## Goal

Keep configured paths to one line within equal-width Distribution Target cards so long filesystem locations change neither card height nor column width.

## Detail

Distribution Target paths previously allowed two lines and used word breaking. A long Custom Target path could therefore wrap midway through a directory name and make its card taller than neighboring options in the two-column grid.

Configured paths now use Astryx `Text` with `maxLines={1}`. The component applies single-line truncation with an ellipsis and automatically exposes the complete value in a hover tooltip when truncation occurs. No custom overflow CSS or tooltip implementation is needed.

Single-line text truncation alone is insufficient inside a CSS Grid. A long path still contributes an intrinsic minimum width that can make one `1fr` track wider than the other. The two-column Astryx `Grid` therefore uses a scoped StyleX `repeat(2, minmax(0, 1fr))` track template, while each `SelectableCard` sets `minWidth: 0`. Both columns now receive half of the available width and long content contracts inside its own card before truncation.

Path presentation is separated from operational error detail. Normal installation, loading, preflight-ready, applying, and success states show the configured path on one line. `Blocked` and `Failed` feedback can still replace the path with an actionable message of up to two lines, preserving useful failure context without changing the normal card dimensions.

This task changes only renderer presentation and feedback composition. It does not change Target paths, selection, installation observation, preflight, distribution, persistence, IPC, preload, or main-process behavior.

## Findings

- Astryx `Text maxLines={1}` provides ellipsis truncation and a full-content tooltip after its containing card is allowed to contract.
- Equal `1fr` tracks can still honor intrinsic minimum content widths; `minmax(0, 1fr)` is required to prevent a long path from widening one column.
- A Grid item also needs `minWidth: 0` so its own automatic minimum width does not overflow the constrained track.
- Applying the same single-line limit to operation errors would hide useful context unrelated to the path request.
- Most feedback states repeated `target.configuredPath` in the feedback model even though the card already owns the Target and can render its path directly.

## Dependencies

- Existing Distribution Target card layout.
- Astryx `Text` truncation behavior.
- Existing operational feedback messages.

## Deliverables

- Single-line configured paths in every Distribution Target card state that shows a path.
- Equal, shrinkable two-column tracks that cannot be widened by a long Target name or path.
- Automatic ellipsis and full-path hover tooltip for truncated values.
- Preserved two-line operational error messages.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] Configured paths render on one line.
- [x] The two Distribution Target columns remain equal width when a Target name or path has a large intrinsic width.
- [x] Paths exceeding the available card width truncate with an ellipsis.
- [x] Truncated paths retain access to the complete value through Astryx's tooltip behavior.
- [x] Normal state and successful operation feedback do not duplicate the path inside the feedback model.
- [x] Blocked and failed operation messages may still use up to two lines.
- [x] Target selection and installation-status behavior remain unchanged.
- [x] The implementation uses only scoped StyleX layout constraints and adds no custom tooltip, dependency, persistence, IPC, preload, or main-process changes.
- [x] Renderer verification does not render UI or assert layout or styling.

## Out of Scope

- Changing Target path values or directory selection behavior.
- Truncating Target names or status labels differently.
- Changing the established two-column count, card spacing, or selection interaction.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 010 establishes equal shrinkable columns and one-line truncation as the normal path treatment in Distribution Target cards. Future card content must preserve `minmax(0, 1fr)` tracks and zero minimum item width so intrinsic content cannot take space from the neighboring column. Feedback changes should continue to distinguish bounded filesystem identity from actionable operation detail.

## Verification

- `pnpm exec vitest run` passed all renderer-independent automated tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that the Grid uses two zero-minimum equal tracks, cards permit intrinsic-width contraction, configured paths use single-line Astryx truncation, and Blocked and Failed messages retain the existing two-line treatment.
- The application will not be launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation will be performed, as required by repository policy.
