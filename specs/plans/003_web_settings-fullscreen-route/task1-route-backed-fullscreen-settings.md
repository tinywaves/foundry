# Task 1: Route-Backed Fullscreen Settings Interaction

## Status

Complete.

## Goal

Replace the Settings primary navigation item and content route with a
sidebar-bottom trigger that opens the existing Settings page in an Astryx
fullscreen Dialog while retaining `#/settings` as the browser URL.

## Context

Plan 1 established Dashboard, Skills, and Settings as primary hash routes in an
Astryx AppShell. Plan 2 replaced the Settings placeholder with the current
Settings page and its API-backed form.

This task changes only how the Web application enters and leaves Settings. The
existing Settings page remains responsible for its heading, explanatory copy,
controls, loading and error states, and save/reset behavior.

Task 2 supersedes this task's Dialog architecture with a standalone fullscreen
route while retaining the completed sidebar-trigger and return-path behavior.

## Confirmed Decisions

- Keep `#/settings` as a route-backed Settings state.
- Remove Settings from the primary navigation section.
- Add a `Settings` trigger with the Astryx `wrench` icon to the SideNav footer.
- Render the same footer trigger at the bottom of the mobile navigation drawer.
- Opening Settings from Dashboard or Skills records that route as the
  background location.
- Render the recorded background route behind the fullscreen Dialog.
- Render Dashboard behind the Dialog when `#/settings` is opened without a
  recorded background location.
- Close Settings back to the recorded route when one exists.
- Close Settings to `#/dashboard` with history replacement when no recorded
  route exists.
- Use the Astryx fullscreen Dialog as a clean viewport-sized page rather than a
  header/content/footer dialog composition.
- Put one ghost `Back to app` control with a left chevron at the top-left of
  the fullscreen page.
- Use the small Button size for the compact Settings navigation control.
- Keep the Settings page's own title and all existing content unchanged.
- Allow Escape to use the same close behavior.
- Do not add an unsaved-changes confirmation in this task.

## Expected File Scope

- `packages/web/src/app.tsx`
- `specs/plans/003_web_settings-fullscreen-route/index.md`
- `specs/plans/003_web_settings-fullscreen-route/task1-route-backed-fullscreen-settings.md`

No Settings API, service, storage, CLI, Skill, generated output, or dependency
files are expected to change.

## Implementation Boundaries

- Keep React Router as the only route and history owner.
- Store the background route in React Router location state when the Settings
  trigger is activated.
- Do not introduce a second general-purpose navigation state.
- Use Astryx SideNav, SideNavItem, Dialog, Button, Icon, Stack, and StackItem
  components rather than custom navigation or dialog primitives.
- Keep the existing Settings query and mutation lifecycle unchanged.
- Do not add automatic saving or remove the current Save button.
- Do not add custom CSS unless Astryx component props cannot express the
  confirmed layout.
- Do not edit generated files under `dist/`.

## Verification

- Run `pnpm run lint`.
- Run `pnpm run build:web`.
- Run `git diff --check`.
- Verify the desktop SideNav contains Dashboard and Skills in its main section
  and Settings at the bottom.
- Verify the mobile navigation drawer contains the same Settings trigger at the
  bottom and closes when the trigger is activated.
- Verify opening Settings from Dashboard and Skills uses `#/settings`.
- Verify `Back to app`, Escape, and browser back return to the recorded route.
- Verify a direct or refreshed `#/settings` view falls back to Dashboard when
  `Back to app` is activated without a recorded route.
- Verify the fullscreen surface covers the application viewport and shows only
  the top-left back control plus the unchanged Settings page content.
- Check desktop and mobile layouts for clipping, overlap, scroll failures, and
  keyboard focus regressions.

## Verification Results

- `pnpm run lint` passed with existing ESLint configuration deprecation
  warnings only.
- `pnpm run build:web` passed.
- `git diff --check` passed.
- Desktop verification passed for the SideNav footer trigger, route-backed
  fullscreen rendering, source-route restoration, Escape, browser back, and
  direct-route Dashboard fallback.
- Mobile verification passed for the navigation drawer footer trigger, drawer
  closure, viewport coverage, content fit, and focus containment.
- Browser console inspection found no new errors.

## Dependency Changes

1. Dependencies to remove: None
2. Dev dependencies to remove: None
3. Dependencies to add: None
4. Dev dependencies to add: None
