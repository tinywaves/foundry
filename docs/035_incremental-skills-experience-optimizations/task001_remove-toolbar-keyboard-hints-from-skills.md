# Task 001: Remove Toolbar Keyboard Hints from Skills

## Status

`completed`

## Goal

Remove unintended Toolbar keyboard-navigation hints from passive Skills action regions while preserving their layout, controls, and business behavior.

## Detail

Foundry previously rendered nine Skills action and navigation regions with Astryx `Toolbar`. Although the Foundry components did not declare keyboard event handlers, `Toolbar` internally enables roving tabindex through `useListFocus` and displays an ephemeral `← → to navigate` layer through `useKeyboardHint` when keyboard-visible focus first enters the composite. The Skill Store search input was therefore treated as part of a toolbar focus group and displayed the hint shown in the reported behavior.

Skills now uses the local `SkillActionBar` in those nine regions. It composes Astryx `Section`, `SizeProvider`, `HStack`, and `StackItem` to retain the transparent section treatment, compact child sizing, accessible group label, and start and end content layout. It declares no key, focus, tab-stop, or hint behavior.

The existing inputs, buttons, links, tabs, headings, loading states, actions, and route transitions remain in their original owning pages. Astryx source and package files remain unchanged. Semantic controls such as `TabList`, dialogs, menus, inputs, and buttons retain their component-owned interaction contracts.

## Findings

- The hint text originates from Astryx `Toolbar` through its unconditional `useKeyboardHint` integration.
- Astryx `Toolbar` version 0.2.0 does not expose a prop that disables only its focus management or keyboard hint.
- Searching only Foundry-authored key and focus handlers cannot detect behavior activated inside a dependency component.

## Dependencies

None.

## Deliverables

- A passive Skills-owned action bar with no keyboard or focus management.
- Replacement of all nine Skills `Toolbar` usages.
- Skill Store search focus outside an Astryx Toolbar composite.
- Preservation of existing Skills controls, actions, and compact sizing.

## Acceptance Criteria

- [x] Skills renderer source does not import or render Astryx `Toolbar`.
- [x] Skills renderer source does not invoke `useKeyboardHint`, `useListFocus`, or custom key and focus handlers for its action regions.
- [x] The Skill Store search input is not a descendant of an Astryx `Toolbar` and cannot trigger the Toolbar-owned hint.
- [x] `SkillActionBar` preserves start-only, end-only, and start-and-end action-region composition.
- [x] Interactive children continue to inherit the established small element size.
- [x] Existing Skills inputs, buttons, links, tabs, headings, loading states, routes, and mutations remain unchanged.
- [x] Astryx source and component-owned interaction behavior remain unchanged.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Changing the layout or business behavior of Skills Store, Discover, Targets, Detail, Sources, or Trash workflows.
- Replacing semantic `TabList`, dialog, menu, input, button, table, list, or tree behavior.
- Removing native-control interaction or modifying Astryx packages.
- Changing Skills contracts, queries, mutations, preload, IPC, main-process services, persistence, or filesystem behavior.
- Changing Toolbar usage outside the Skills module.
- Adding renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 001 establishes passive action-region layout as the cumulative Skills baseline. Add the next explicitly requested Skills refinement as Task 002 in this plan after its scope is defined.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Repository search confirmed no `Toolbar`, `useKeyboardHint`, or `useListFocus` reference remains in `src/renderer/src/pages/skills` or `src/renderer/src/pages/skills-page.tsx`.
- Static inspection confirmed that `SkillActionBar` contains no key, focus, tab-stop, or hint handler and preserves the compact size context and accessible group label.
- Static inspection confirmed that the existing Skills controls and business callbacks remain in their original pages.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
