# Task 011: Remove the Skill Store Fingerprint Column

## Status

`completed`

## Goal

Keep the Skill Store inventory focused on identifying Skills and acting on them without exposing a technical Content Fingerprint in every row.

## Detail

The metadata-only Skill Store table previously displayed `Skill`, `Fingerprint`, and `Actions`. The Fingerprint value was a shortened presentation of each Package's current Content Fingerprint, but it did not support a repeated list-level decision and consumed a full column in the primary inventory.

The Store table now displays only `Skill` and `Actions`. `SkillStoreRow` no longer carries the renderer-only shortened fingerprint, and the column definition no longer declares or renders `Fingerprint`. The existing proportional widths remain attached to the two retained columns so Skill identity receives most of the available space and Actions remains aligned to the row end.

This is a renderer presentation change only. `SkillStorePackageView.fingerprint`, persisted Content Fingerprints, Package detail metadata, Installation fingerprints, comparison semantics, and distribution behavior remain unchanged.

## Findings

None.

## Dependencies

- Existing metadata-only Skill Store Table and row action workflow.
- Existing Astryx `Table` proportional column widths.

## Deliverables

- A two-column Skill Store inventory containing only `Skill` and `Actions`.
- Removal of the shortened fingerprint field from the renderer-owned Store row projection.
- Preserved Content Fingerprint contracts and operational behavior outside the Store list.
- Task-specific documentation synchronized with the cumulative Skills optimization plan.

## Acceptance Criteria

- [x] The Skill Store table headers are `Skill` and `Actions`.
- [x] Store rows no longer display shortened Content Fingerprints.
- [x] Skill links and Distribute actions retain their existing behavior.
- [x] Skill identity retains more proportional width than Actions.
- [x] Shared contracts, Package detail metadata, Installation state, and distribution logic retain their fingerprint fields and behavior.
- [x] The implementation adds no persistence, IPC, preload, main-process, dependency, or Astryx changes.
- [x] Renderer verification does not render UI or assert table structure, layout, or styling.

## Out of Scope

- Removing Fingerprint metadata from Skill detail or Installation presentation.
- Changing Content Fingerprint generation, storage, comparison, or distribution semantics.
- Changing Store sorting, filtering, row actions, density, or empty states.
- Adding renderer component, DOM, layout, screenshot, or accessibility-tree tests.

## Handoff

Task 011 establishes `Skill` and `Actions` as the complete Skill Store list surface. Content Fingerprints remain implementation and detail metadata and should return to the inventory only if a future repeated list-level workflow requires users to compare or act on them directly.

## Verification

- `pnpm exec astryx build "remove Fingerprint column from Skill Store table"` identified the existing Astryx Table pattern without requiring a new component or dependency.
- `pnpm exec astryx component Table` confirmed explicit proportional widths remain appropriate for the retained columns.
- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed type checking and the main, preload, and renderer production builds.
- `git diff --check` passed.
- Static inspection confirmed that `skill-store-page.tsx` no longer maps or renders a fingerprint while shared contracts, detail presentation, and Skills operations retain their existing fingerprint usage.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
