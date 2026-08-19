# Task 005: Auto-Hide the Import Result Banner

## Status

`completed`

## Goal

Remove the manual close control from completed import feedback and clear that feedback automatically without interrupting warning inspection.

## Detail

The Skill Store presents the latest completed import as an Astryx `Banner`. Its previous `isDismissable` configuration added a close button even though this result is short-lived workflow feedback. Astryx `Banner` has no auto-dismiss contract, so the page now owns an eight-second result lifecycle and clears only the current result when its timer completes.

The timer is suspended while the import-warning Dialog is open. This keeps the Dialog and its transient issue data mounted for as long as the user is inspecting them. Closing the Dialog starts a fresh eight-second interval. Replacing the import result or unmounting the page clears the previous timer through the React effect cleanup.

This behavior applies only to `Import Finished`, including both success and warning states. `Import Couldn't Finish` and Skill Store loading or refresh failures remain persistent because disappearing error feedback could hide required recovery information.

## Findings

- Astryx `Banner` exposes manual dismissal but does not provide an auto-dismiss duration.
- Removing `isDismissable` removes the close control without affecting the warning detail action in `endContent`.
- Import warning details are derived from the transient import result, so clearing that result while the Dialog is open would also close the Dialog.
- A result-identity guard prevents an older timer from clearing a newer import result.

## Dependencies

- React `useEffect` for the bounded result lifecycle and cleanup.
- Existing Skill Store import-result state and warning-details Dialog state.
- Existing Astryx `Banner` and warning detail action.

## Deliverables

- No close control on the completed import Banner.
- An eight-second auto-hide interval for completed import feedback.
- Timer suspension while warning details are open.
- Persistent import and Store error Banners.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] `Import Finished` renders without a close control.
- [x] Success and warning result Banners clear automatically after eight seconds.
- [x] Opening `View Details` prevents the result and Dialog from disappearing during inspection.
- [x] Closing warning details starts a fresh eight-second interval.
- [x] A new import result replaces the previous timer safely.
- [x] Import and Store error Banners remain persistent.
- [x] Effect cleanup prevents a timer from updating an unmounted page.
- [x] The implementation adds no persistence, IPC, preload, dependency, or Astryx changes.
- [x] Renderer verification does not render React UI or assert timing or visual output.

## Out of Scope

- Converting completed import feedback from Banner to Toast.
- Adding hover, focus, or page-visibility pause behavior.
- Persisting completed import feedback or warning history.
- Auto-hiding error Banners.
- Changing warning detection, details, import behavior, or Skill queries.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 005 establishes a transient lifecycle for completed import feedback while preserving uninterrupted warning inspection. Future changes to the interval or pause conditions should remain local to this result lifecycle and must not make actionable errors transient.

## Verification

- `pnpm exec vitest run` passed all 60 test files and 304 tests.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that only the completed import Banner loses manual dismissal and receives the bounded timer lifecycle; error Banners remain unchanged.
- The application will not be launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation will be performed, as required by repository policy.
