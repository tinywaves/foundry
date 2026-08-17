# Task 010: Disable the Historical Prompt Form Without Muted Styling

## Status

`completed`

## Goal

Keep a selected historical Prompt non-editable without applying Astryx's muted field-level disabled appearance to the editor body.

## Detail

The washed-out historical editor appearance was caused by the existing Astryx `TextInput` and `TextArea` `isDisabled` behavior rather than any custom page-level style. Astryx applies its shared disabled wrapper style when that prop is true, including `opacity: 0.5`. Because Task 008 passed the historical-selection state into all three fields, the combined Title, Description, and Content surfaces made the editor body appear faded.

Historical selection no longer contributes to the `isEditorDisabled` value passed to individual Astryx fields. Instead, the existing `FormLayout` is wrapped in a native `fieldset` whose `disabled` attribute follows whether `selectedVersion` exists. Native fieldset semantics disable the descendant input and textarea controls together without causing their Astryx wrappers to render the field-level disabled style. No new StyleX rule, raw color, opacity override, or other custom visual treatment was added.

The field-level `isDisabled` props remain connected to save and version-loading activity, preserving their existing transient busy behavior. The Header, History panel, Restore action, and version selection controls remain outside the disabled fieldset and therefore remain interactive according to their existing state rules. Historical snapshots remain immutable before confirmed Restore, and current-version editing, validation, submission, and unsaved-change behavior remain unchanged.

## Findings

None.

## Dependencies

None.

## Deliverables

- Native group-level disabling for the selected historical Prompt form.
- Removal of historical selection from Astryx field-level disabled styling.
- Preservation of existing save and version-loading disabled feedback.

## Acceptance Criteria

- [x] Selecting a historical version prevents editing and focus within its Title, Description, and Content controls.
- [x] Historical selection does not apply Astryx's 0.5-opacity disabled wrapper style to each field.
- [x] No custom color, opacity, or other visual override is introduced for the historical form.
- [x] Header, History, version selection, and Restore controls remain outside the disabled form group.
- [x] Save and version-loading states continue to disable individual fields through their existing Astryx props.
- [x] Current-version editing, historical snapshot loading, and exact-snapshot Restore behavior remain unchanged.
- [x] Type checking, linting, production build, and diff validation pass without automated visual verification.

## Out of Scope

- Making historical Prompt content editable before Restore.
- Changing Astryx's shared disabled styles or swizzling its input components.
- Changing current-version Save, validation, navigation, cache, toast, or unsaved-change behavior.
- Changing version persistence, Restore confirmation, History layout, version labels, or selection semantics.
- Adding dependencies, renderer component tests, DOM assertions, screenshots, or visual automation.

## Handoff

Task 010 establishes native group-level disabling without muted field styling as the cumulative selected-history form baseline. A later Prompt-focused optimization may be implemented and synchronized as the next sequential task after separate approval.

## Verification

- `pnpm typecheck` passed the Node and Web TypeScript projects.
- `pnpm lint` passed with only the repository's existing upstream ESLint configuration deprecation notices.
- `pnpm build` passed the main, preload, and renderer production builds.
- `git diff --check` and `git diff --cached --check` passed.
- Static inspection of Astryx `inputWrapperStyles.disabled` confirmed that field-level `isDisabled` applies `opacity: 0.5`.
- Static inspection confirmed that historical selection now controls a native disabled `fieldset` around `FormLayout` and no longer participates in field-level `isEditorDisabled`.
- Static inspection confirmed that save and version-loading states remain connected to the individual field `isDisabled` props.
- Repository diff inspection confirmed that no StyleX or other visual override was added for this optimization.
- No renderer component test was added because repository policy excludes rendered UI and DOM assertions from renderer tests.
- The user accepted the completed optimization by confirming documentation synchronization.
- The application was not launched, and no browser, screenshot, accessibility-tree inspection, or desktop automation was performed, as required by repository policy.
