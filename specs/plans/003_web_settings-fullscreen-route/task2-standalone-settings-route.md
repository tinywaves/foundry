# Task 2: Standalone Settings Route

## Status

Complete.

## Goal

Replace the route-backed fullscreen Dialog with a genuine standalone
`#/settings` page that occupies the viewport without rendering the main
application shell or a background route underneath it.

## Context

Task 1 moved Settings to the SideNav footer and retained `#/settings` while
rendering the existing Settings page inside a fullscreen Dialog. The confirmed
design now treats Settings as its own route page rather than an overlay.

The existing Settings page remains responsible for its heading, explanatory
copy, controls, loading and error states, and save/reset behavior.

## Confirmed Decisions

- Keep `#/settings` as the Settings URL.
- Keep the Astryx `wrench` icon on the SideNav footer trigger and render it
  with the inherited SideNav item foreground color so it matches the Settings
  label exactly.
- Use the small SideNav item size for the Settings footer trigger.
- Keep the same footer trigger in the mobile navigation drawer.
- Render Settings as a standalone route outside the Dashboard/Skills AppShell.
- Do not render Dashboard or Skills behind Settings.
- Do not use Dialog or emulate Dialog open/close behavior.
- Opening Settings from Dashboard or Skills records the source location.
- The top-left `Back to app` control returns through browser history when a
  recorded source location exists.
- Direct or refreshed `#/settings` views return to `#/dashboard` with history
  replacement when `Back to app` is activated.
- Browser back follows normal route history.
- Escape has no Settings-specific navigation behavior.
- Keep the built-in Astryx `chevronLeft` icon and use its `primary` color
  variant so it is not rendered as a muted gray icon.
- Keep the `Back to app` control small and visually quiet.
- Keep the Settings page's own title and all existing content unchanged.
- Do not add unsaved-change protection or automatic saving in this task.

## Expected File Scope

- `packages/web/src/app.tsx`
- `specs/plans/003_web_settings-fullscreen-route/index.md`
- `specs/plans/003_web_settings-fullscreen-route/task1-route-backed-fullscreen-settings.md`
- `specs/plans/003_web_settings-fullscreen-route/task2-standalone-settings-route.md`

No Settings API, service, storage, CLI, Skill, generated output, or dependency
files are expected to change.

## Implementation Boundaries

- Keep React Router as the only route and history owner.
- Use separate route elements for the standalone Settings page and the main
  Dashboard/Skills AppShell.
- Use an AppShell without navigation for the standalone full-page Settings
  route.
- Store only the source location needed by the Settings return control.
- Remove the Dialog and its background-route rendering state.
- Use Astryx components and semantic icons without custom CSS.
- Pass the built-in `wrench` icon as an `Icon` node with `inherit` color so it
  uses the Settings label color instead of SideNavItem's default unselected
  icon color.
- Keep the existing Settings query and mutation lifecycle unchanged.
- Do not add automatic saving or remove the current Save button.
- Do not edit generated files under `dist/`.

## Verification

- Run `pnpm run lint`.
- Run `pnpm run build:web`.
- Run `git diff --check`.
- Verify the desktop SideNav contains Dashboard and Skills in its main section
  and a small Settings item with a label-colored wrench at the bottom.
- Verify the mobile navigation drawer contains the same Settings trigger and
  closes when the route is activated.
- Verify `#/settings` renders without the main SideNav or a background page.
- Verify `Back to app` returns to Dashboard and Skills when opened from those
  routes.
- Verify browser back returns to the source route.
- Verify direct or refreshed `#/settings` returns to Dashboard from the
  top-left control.
- Verify Escape does not navigate away from the standalone Settings route.
- Verify the built-in chevron icon uses the primary color treatment.
- Verify the built-in wrench icon matches the Settings label color.
- Check desktop and mobile layouts for clipping, overlap, scroll failures, and
  keyboard focus regressions.

## Verification Results

- `pnpm run lint` passed with existing ESLint configuration deprecation
  warnings only.
- `pnpm run build:web` passed.
- `git diff --check` passed.
- Desktop verification confirmed that `#/settings` renders without the main
  SideNav, a background route, or an open Dialog.
- Dashboard and Skills source restoration passed through both the top-left
  control and normal browser history.
- Direct `#/settings` access returned to Dashboard through the top-left control.
- Escape remained on the standalone Settings route.
- Mobile verification confirmed that the navigation drawer closes on route
  activation and that the standalone page has no clipping or horizontal
  overflow.
- The built-in `chevronLeft` icon rendered at the small size with the
  `primary` color variant.
- Follow-up correction: the Settings footer trigger uses the small item size
  and renders its built-in `wrench` icon with the `inherit` color variant so
  the icon and Settings label use the same foreground color.
- Browser console inspection found no new errors.

## Dependency Changes

1. Dependencies to remove: None
2. Dev dependencies to remove: None
3. Dependencies to add: None
4. Dev dependencies to add: None
