# Task 005: Align the Skills UI and Complete Verification

## Status

`completed`

## Goal

Expose the current-content model without presenting removed Store, Revision, observation, drift, or review concepts.

## Dependencies

Tasks 001 through 004.

## Work

Remove obsolete shared contracts, IPC channels, preload methods, query keys, mutations, routes, pure models, and renderer copy for Skill Revisions, Store and Target observations, Watch Sessions, persisted Update Candidates, Distribution Records, Store repair, local editing or refresh, Promote, Import as New Skill, drift resolution, and Target recovery. Preserve constrained IDs and relative file paths across the renderer boundary.

Make Store listing a metadata-only query and remove its content-health Status presentation. Keep the existing manual `Import Existing` action. Update Package detail to present Overview, read-only Files, Installations, and Sources without a Revisions view or Store filesystem reveal. Files decode the selected BLOB on demand. Source update checks retain the candidate only in current renderer memory and require an explicit Update action; successful Update refreshes Package and Installation fingerprint relationships without distributing.

Present each Target as not installed, distributed current content, or needing Distribution based only on Installation and Store fingerprints. Do not show Missing, Unreadable, Different, Drift, or live observation timestamps. Keep distribution selection and result feedback but remove content review and replacement-conflict flows that depended on reading Target bytes.

When a BLOB-backed operation returns `store-corrupt`, show one renderer-owned dialog with Delete and Dismiss. Delete loads the Store Deletion preflight into the same workflow, lists every Target that will be removed, and requires explicit confirmation before apply. Report partial Target failures and keep the Package active. Trash Restore returns to Store only; Remove from Foundry uses that exact label and never claims physical deletion.

Run `pnpm exec astryx build` and inspect every Astryx component used before changing renderer code. Use the current design system, StyleX tokens, and Lucide icons. Keep renderer tests pure and do not launch Electron or use browser, screenshot, accessibility-tree, or desktop automation.

Update Plans 033 through 036 and affected completed task indexes with concise supersession pointers rather than rewriting historical task records. Mark this plan and each task completed only after the implementation and full verification actually pass.

## Acceptance Criteria

- [x] No renderer route or query starts Store reconciliation, Target observation, or a Watch Session.
- [x] Store list renders from metadata without BLOB or filesystem work.
- [x] Package detail and Target presentation contain no removed domain terms or actions.
- [x] Remote Update Candidate state is ephemeral and successful Update leaves Target distribution explicit.
- [x] Store Corruption offers Delete or Dismiss, and Delete confirmation lists every affected Target before mutation.
- [x] Trash and Remove from Foundry copy match logical-retention behavior; Restore does not imply Target restoration.
- [x] Shared, preload, main, and renderer contracts compile with no obsolete Skill state surface remaining.
- [x] Historical documentation points to ADR 0005 and Plan 037 as the current model.
- [x] All required non-visual verification passes, and visual acceptance is handed to the user.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `git diff --check`
- Static searches for removed tables, contracts, statuses, coordinators, actions, and user-facing terms.
