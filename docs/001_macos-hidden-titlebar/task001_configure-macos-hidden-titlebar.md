# Task 001: Configure the macOS Hidden Title Bar

## Status

`completed`

## Goal

Configure the Electron main window to hide the default macOS title bar while preserving the native red, yellow, and green window controls.

## Detail

Update `src/main/index.ts` inside the existing `BrowserWindow` options.

Use a platform-conditional `titleBarStyle: 'hidden'` configuration:

- macOS: hide the default title bar and keep the native traffic-light controls.
- Windows/Linux: preserve the current default window behavior.
- Keep the existing window frame, preload configuration, security settings, menu behavior, and window lifecycle unchanged.
- Do not add preload APIs, IPC handlers, renderer components, or third-party dependencies.

## Dependencies

None.

## Deliverables

- Updated macOS-specific `BrowserWindow` configuration.
- No changes to preload or renderer boundaries.
- Verified development and production builds.

## Acceptance Criteria

- [x] On macOS, the default gray title bar and centered “Foundry” title are no longer visible.
- [x] On macOS, the native red, yellow, and green window controls remain visible and usable.
- [x] On Windows/Linux, the existing default title bar behavior remains unchanged by the platform-conditional configuration.
- [x] Existing external-link handling, preload loading, and window lifecycle behavior remain unchanged.
- [x] Type checking, linting, and production build pass through the available direct verification commands.

## Out of Scope

- Custom title bar UI.
- Custom window control buttons.
- New preload or IPC APIs.
- Changes to existing renderer content or page layout.

## Handoff

The completed main-process window configuration provides the requested hidden macOS title bar behavior while preserving the native traffic-light controls.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm exec tsc --noEmit -p tsconfig.node.json --composite false` — passed.
- `pnpm exec tsc --noEmit -p tsconfig.web.json --composite false` — passed.
- `pnpm exec eslint src/main/index.ts src/renderer/src/app.tsx` — passed with existing deprecation warnings.
- `pnpm exec electron-vite build` — passed.
- `pnpm dev` — macOS development window visually verified.
- `pnpm start` — production preview window visually verified.
- `git diff --check` — passed.
- The project wrapper commands `pnpm typecheck` and `pnpm build` are currently blocked by the repository's `npm`/`devEngines` mismatch; `pnpm lint` is blocked when it scans generated `out/` files because of the existing typed-linting configuration.
