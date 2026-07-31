# Hide the macOS Default Title Bar

## Status

`completed`

## Goal

Make Foundry hide Electron's default title bar on macOS while preserving the red, yellow, and green window controls.

## Detail

When the application starts, it will no longer display the default gray title bar or the centered “Foundry” title. The native macOS window controls will remain available. Windows and Linux will retain their current window behavior.

The implementation will use Electron's macOS hidden title bar capability, preserve the existing main/preload/renderer boundaries, and introduce no third-party dependencies.

## Scope

- Update the main-process window creation configuration.
- Enable the hidden title bar only on macOS.
- Preserve the native macOS window controls.
- Run type checking, linting, and build verification.
- Check behavior in both development mode and production builds.

## Out of Scope

- Build a complete custom title bar.
- Draw custom red, yellow, and green window controls.
- Add IPC for minimizing, maximizing, or closing the window.
- Change the window styling on Windows or Linux.
- Change existing page content or layout behavior.
- Introduce third-party dependencies.

## Decisions

- The target platform is macOS.
- Hide the default title bar while preserving the native macOS window controls.
- Keep Windows and Linux unchanged.
- Complete this goal as one independent task.

## Tasks

- [x] [Task 001: Configure the macOS Hidden Title Bar](./task001_configure-macos-hidden-titlebar.md)
