# Task 002: Separate Skill Store Search and Actions

## Status

`completed`

## Goal

Clarify the Skill Store control hierarchy by making the gap between Search and the action group larger than the gap between the two related actions.

## Detail

The Skill Store action bar contains a full-width Search field followed by a trailing group with Discover and Import Existing. The shared `SkillActionBar` previously used spacing step 1 between its start and end slots, while the trailing button group used spacing step 2. That relationship placed distinct Search and Actions groups closer together than the two related actions inside the trailing group.

`SkillActionBar` now accepts an optional `slotGap` typed from Astryx `HStack` spacing. Its default remains spacing step 1 so existing action bars do not change. Skill Store passes spacing step 4 for the Search-to-Actions boundary, while the Discover-to-Import gap remains spacing step 2. The resulting hierarchy uses only the Astryx spacing scale and keeps the layout responsive through the existing fill behavior.

No control size, label, route, loading state, disabled state, mutation, or action behavior changed. Other Skills action bars retain their previous spacing.

## Findings

None.

## Dependencies

None.

## Deliverables

- A configurable token-based gap between `SkillActionBar` start and end slots.
- A larger Search-to-Actions gap in the Skill Store controls.
- Preservation of the tighter Discover-to-Import group spacing.

## Acceptance Criteria

- [x] Skill Store uses spacing step 4 between the Search field and the trailing action group.
- [x] Discover and Import Existing retain spacing step 2 within their shared group.
- [x] The Search-to-Actions gap is larger than the gap between the two buttons.
- [x] Other `SkillActionBar` consumers retain the default spacing step 1.
- [x] Search continues to fill the available start region without changing control sizes or action behavior.
- [x] The implementation uses Astryx spacing props without raw CSS dimensions or new styling dependencies.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing button labels, variants, sizes, order, routes, loading states, or mutations.
- Changing Search width, filtering behavior, icon, clear behavior, or placeholder.
- Changing spacing in Skills Detail, Discover, Targets, Sources, Trash, or top-level navigation.
- Adding responsive breakpoints, wrapping behavior, custom CSS, dependencies, or renderer visual tests.

## Handoff

Task 002 establishes a stronger grouping hierarchy for Skill Store controls. Add the next explicitly requested Skills refinement as Task 003 after its scope is defined.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that Skill Store passes `slotGap={4}` while its trailing button `HStack` retains `gap={2}`.
- Repository search confirmed that no other `SkillActionBar` consumer passes `slotGap`, so they retain the default spacing step 1.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
