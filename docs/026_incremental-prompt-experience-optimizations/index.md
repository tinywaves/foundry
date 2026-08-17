# Incremental Prompt Experience Optimizations

## Status

`completed`

## Goal

Coordinate a sequence of focused Prompt experience optimizations that improve visual clarity and density while preserving the established Prompt workflows and process boundaries.

## Detail

This plan records incremental optimizations to the existing Prompt library and related Prompt surfaces. Each requested round is implemented and verified before it is appended as a completed task, keeping every accepted refinement independently reviewable without predicting future work.

The first optimization simplifies the `New Prompt` card by removing the muted circular container around its plus sign. The card now presents a standalone accent-colored Lucide `Plus` icon while retaining the existing dashed boundary, centered content, navigation target, accessible card label, and supporting copy.

The second optimization removed the separate empty macOS drag row and established Prompt-owned window chrome. At that stage, New Prompt, Edit Prompt, and the Edit Prompt loading state rendered their existing `PageHeader` directly inside `WindowDragRegion`, with explicit no-drag wrappers around Back to Prompts and History.

The third optimization refined that composition into a compact two-row Prompt editor header. A 28px `WindowDragRegion` renders only the Prompt name, reserves 80px at the macOS start edge for native window controls, and lets its child fill the remaining row. The displayed name follows the trimmed Title field and falls back to `Untitled` when empty. Back to Prompts and History moved into a separate action row below the drag surface, the Header divider was removed, and the redundant footer Cancel action was removed so Back to Prompts owns return navigation and continues to use the existing unsaved-change blocker. The obsolete `WindowNoDragRegion` implementation was removed because no interactive controls remain inside the drag surface.

The fourth optimization consolidates normal editor actions into the fixed Prompt header. Back to Prompts remains at the start of the action row, while edit-only History and the small primary Save action align at the end with Save trailing. New Prompt therefore renders Back to Prompts and Save, while the current Edit Prompt renders Back to Prompts, History, and Save. At that stage, a selected historical version kept Back to Prompts and History while retaining Copy and Restore in its dedicated footer. The normal editor footer was omitted, and `FullWindowLayout` gained an explicit `100dvh` height so its main region constrains the nested editor and `LayoutContent` owns scrolling beneath the fixed `LayoutHeader`.

The fifth optimization removes resizing from the Prompt version-history panel. The panel no longer renders a `ResizeHandle`, creates `useResizable` state, or persists a user-selected width. It uses the former 320px default as a stable `LayoutPanel` width and lets `LayoutPanel` render the static divider that previously belonged to the drag handle. Version loading, selection, status, error feedback, scrolling, and closing behavior remain unchanged.

The sixth optimization simplified the Prompt history panel's information hierarchy. The redundant visible `Versions` list header and its `Text` import were removed, leaving `Version History` as the single panel title and, at that stage, `Version N` as each row's specific identity. The panel header now renders its action row directly inside `LayoutHeader` with 8px padding instead of nesting a 12px-padded `Section`, reducing header height and unused structure while preserving the close action, compact list density, status token, timestamps, selection, and all data states.

The seventh optimization replaced visible numeric version labels with their creation timestamps. At that stage, each history row used one localized date-time string as its primary label instead of rendering `Version N` above a duplicate timestamp description. A shared `Intl.DateTimeFormat` preserved the previous year, abbreviated month, day, hour, and minute presentation. Numeric versions remained internal keys and selection and query identifiers, while Current, pending, disabled, and click behavior stayed unchanged.

The eighth optimization replaces the dedicated historical-version content view with the editor's existing Title, Description, and Content inputs. Selecting a historical version maps the exact snapshot into those disabled fields, updates the drag-row title from the selected snapshot, and does not classify the selection itself as an unsaved edit. Save is replaced by a small primary Restore action in the fixed Header, while the historical Copy action and dedicated footer are removed. Restore keeps its existing confirmation and exact-snapshot persistence behavior. Selecting Current or closing History resets the form to the current-version baseline, and discard confirmation copy now describes loading rather than viewing a version.

The ninth optimization restores each history item's visible `Version N` name while retaining the localized creation time as secondary context. `ListItem.label` now carries the version name, `ListItem.description` carries the timestamp produced by the existing formatter, and the pending spinner refers to the same version name. Current status, selection, disabling, ordering, queries, and click behavior remain unchanged.

The tenth optimization removes the washed-out appearance from selected historical Prompt content without making it editable. The appearance came from Astryx field-level `isDisabled`, whose built-in wrapper style applies 0.5 opacity; no custom page-level style had been added. Historical selection now disables the shared `FormLayout` through a native `fieldset` instead of contributing to each field's `isDisabled` prop. Title, Description, and Content therefore retain their normal visual treatment while browser semantics prevent editing and focus. Save and version-loading states continue to use the existing field-level disabled behavior, and Header and History controls remain outside the disabled group.

## Scope

- Focused visual and interaction refinements within existing Prompt surfaces.
- Narrow component-local changes that preserve established Prompt behavior.
- Prompt-owned full-window header composition for New and Edit workflows.
- Compact Prompt window-title presentation synchronized with editor state.
- Fixed Prompt editor action placement and removal of redundant footer controls.
- Full-window viewport containment that leaves scrolling to nested page content.
- Fixed Prompt history-panel presentation without resize interaction or persistence.
- Compact Prompt history-panel hierarchy without redundant visible titles.
- Visible Prompt version names with localized creation-time descriptions.
- Historical Prompt snapshots rendered through the existing disabled editor inputs.
- Group-level historical form disabling without muted field opacity or color and opacity overrides.
- Historical Restore placement in the fixed Header without a Copy action or dedicated footer.
- Task-specific non-visual verification under the repository's renderer policy.
- Cumulative documentation for explicitly requested Prompt optimization rounds.

## Out of Scope

- Unrequested changes to Prompt creation, current-version editing, trash, persistence, navigation, or copying outside the selected-history editor state.
- Broad renderer redesigns or optimizations outside the Prompt product area.
- New dependencies, process-boundary changes, or speculative future tasks.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation.

## Decisions

- Maintain this Prompt-focused optimization sequence separately from Plan 023.
- Persist each optimization only after implementation, verification, and explicit documentation synchronization approval.
- Render the `New Prompt` plus sign directly as an Astryx `Icon` backed by Lucide `Plus`, without a decorative surrounding container.
- Preserve the existing `ClickableCard` interaction target and accessible label.
- Task 002 established direct Prompt ownership by rendering `PageHeader` in `WindowDragRegion`; Task 003 preserves that ownership while limiting drag-region content to the Prompt name.
- Task 002 used explicit no-drag wrappers while controls occupied the drag surface; Task 003 moves those controls to a separate row and removes the now-unused wrapper.
- Keep `FullWindowLayout` domain-agnostic and let its child route own full-window window chrome.
- Keep both drag-region variants at the existing compact 28px token height; the Prompt header variant adds only an 80px macOS start inset, with no matching end inset.
- Derive the visible Prompt name from the trimmed Title field and display `Untitled` when it is empty.
- Render Back to Prompts and History below the drag surface, remove the Header divider, and let Back to Prompts replace the redundant footer Cancel action while preserving unsaved-change protection.
- Keep Back to Prompts at the start of the fixed action row; align edit-only History and the small primary Save action at the end with Save trailing.
- Task 004 omitted the normal editor footer after moving Save into the Header and, at that stage, preserved the historical-version Copy and Restore footer.
- Size `FullWindowLayout` to `100dvh` so the Prompt `LayoutHeader` remains fixed and only `LayoutContent` scrolls.
- Keep the Prompt history panel at its former 320px default width and remove drag resizing, resize persistence, and the interactive separator.
- Preserve the history panel boundary with `LayoutPanel.hasDivider` after removing `ResizeHandle`.
- Task 006 established `Version History` as the sole visible panel title and removed the intermediate `Versions` label; Task 007 preserved that hierarchy while replacing visible `Version N` row labels with timestamps.
- Render the history header action row directly in `LayoutHeader` with 8px padding instead of a nested 12px-padded `Section`.
- Format each history entry's creation time with the viewer's locale using year, abbreviated month, day, hour, and minute fields.
- Task 007 kept numeric Prompt versions internal for list keys, active and pending comparisons, version selection, and snapshot queries while hiding them from row labels.
- Task 009 restores `Version N` as each row's primary label, retains the localized creation time as its description, and keeps the same numeric value for all existing internal behavior.
- Task 008 renders current and selected historical Prompt content through one shared `FormLayout` and established non-editable historical inputs so Restore continues to operate on the exact immutable snapshot.
- Task 010 uses a native disabled `fieldset` around that `FormLayout` for historical selection instead of applying Astryx field-level `isDisabled`, preventing edits without triggering the built-in 0.5 wrapper opacity or adding custom styles.
- Continue using field-level `isDisabled` only for save and version-loading states, preserving their existing transient busy feedback.
- Replace Save with a small primary Restore action in the fixed Header for a selected historical version, and remove that state's Copy action and dedicated footer.
- Keep `copyPromptVersion` available through existing process contracts and shared copy logic while removing its invocation from the selected-history editor state only.
- Reset the form to the current-version baseline when Current is selected or History closes, without treating an unchanged historical selection as an unsaved edit.
- Continue using Astryx, StyleX, design tokens, and Lucide icons without adding dependencies.

## Tasks

- [x] [Task 001: Remove the New Prompt Icon Container](./task001_remove-new-prompt-icon-container.md)
- [x] [Task 002: Render Prompt Headers in the Window Drag Region](./task002_render-prompt-headers-in-window-drag-region.md)
- [x] [Task 003: Refine the Prompt Editor Window Header](./task003_refine-prompt-editor-window-header.md)
- [x] [Task 004: Place Save in the Fixed Prompt Editor Header](./task004_place-save-in-the-fixed-prompt-editor-header.md)
- [x] [Task 005: Remove Prompt History Panel Resizing](./task005_remove-prompt-history-panel-resizing.md)
- [x] [Task 006: Simplify the Prompt History Panel Layout](./task006_simplify-the-prompt-history-panel-layout.md)
- [x] [Task 007: Use Timestamps as Prompt Version Labels](./task007_use-timestamps-as-prompt-version-labels.md)
- [x] [Task 008: Load Historical Versions into Prompt Inputs](./task008_load-historical-versions-into-prompt-inputs.md)
- [x] [Task 009: Restore Version Names to History Items](./task009_restore-version-names-to-history-items.md)
- [x] [Task 010: Disable the Historical Prompt Form Without Muted Styling](./task010_disable-the-historical-prompt-form-without-muted-styling.md)
