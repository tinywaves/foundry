# Replace Data with About Settings

## Status

`completed`

## Goal

Replace the unfinished Data destination in Settings with a complete About experience where users can identify Foundry, inspect the installed application version, find project and license information, and contact the author.

## Detail

Keep the existing full-window `/settings` experience, source-aware Back behavior, shared sidebar sizing, platform-aware window-drag regions, and Appearance behavior. Replace Data as the second page-local Settings destination with About. Appearance remains the default whenever Settings mounts, and switching between Appearance and About continues without nested routes, navigation-state changes, or persisted section selection.

Present Foundry's existing application icon, product name, and the description `An AI-native local developer runtime for tools, skills, agents, and workflows.` in the About content. Show the version of the installed application through a narrow, read-only Electron application-metadata boundary rather than duplicating the current package version in renderer content. Also show the author `tinywaves`, the contact email `dhzhme@gmail.com`, and the `Apache-2.0` license.

Provide fixed links to the Foundry GitHub repository and Releases page, plus a clickable email address. Open the project links through the system default browser and the email link through the system default mail application while keeping native external-link handling controlled by the main process. If the operating system cannot handle an external destination, leave the user on About without adding task-specific failure feedback.

Use the existing Astryx Settings frame, Astryx content components, StyleX design tokens, Lucide iconography, and packaged application asset. Preserve renderer, preload, and main-process boundaries and introduce no new dependency or styling system.

## Scope

- Complete removal of the Data navigation destination and its placeholder content.
- About as the second page-local Settings destination, with Appearance remaining the mount-time default.
- Foundry product identity using the existing packaged icon, product name, and approved description.
- The actual installed application version supplied through a constrained read-only native boundary.
- Visible author, contact email, and Apache-2.0 license information.
- Fixed GitHub Repository, Releases, and email links opened by the appropriate system application.
- Preserved `/settings` ownership, Back behavior, sidebar behavior, Appearance behavior, theme persistence, and platform-specific drag regions.
- Existing Astryx, StyleX, design-token, and Lucide conventions without new dependencies.
- Type checking, linting, automated behavior tests, production build verification, static integration inspection, and user-performed visual acceptance.

## Out of Scope

- Data import, export, cleanup, backup, database administration, or any other Data settings.
- Automatic or manual application update checks.
- Copy actions for the application version, author, email, or links.
- Privacy policies, third-party license inventories, standalone legal pages, or copyright text.
- Additional contact methods or social accounts.
- A separate Apache-2.0 license link.
- Nested Settings routes, section deep links, or persisted Settings section selection.
- Changes to Appearance, color-mode persistence, Settings Back behavior, sidebar resizing, or the application-update subsystem.
- New dependencies, another styling system, application launch, browser automation, screenshots, accessibility-tree inspection, desktop automation, or renderer component tests.

## Decisions

- Replace Data completely because its functionality is intentionally deferred and its current content is only a placeholder.
- Keep Appearance as the default and keep section selection local so the established Settings navigation contract remains unchanged.
- Use English for all About labels and content to match the existing application UI.
- Show the existing product description exactly as `An AI-native local developer runtime for tools, skills, agents, and workflows.`.
- Display the installed application version from an authoritative runtime source instead of hardcoding `0.2.1` into the page.
- Display the author as `tinywaves` and the contact email as `dhzhme@gmail.com` without exposing additional contact information.
- Make the email address a `mailto:` destination and omit a separate copy action.
- Provide GitHub Repository and Releases as the only project links.
- Display `Apache-2.0` as license text without adding a separate license destination.
- Delegate fixed external destinations to the system browser or mail application through controlled native link handling and add no About-specific failure UI.
- Reuse existing Astryx, StyleX, Lucide, and application assets with no new dependency.

## Tasks

- [x] [Task 001: Replace Data with the About Settings Experience](./task001_replace-data-with-the-about-settings-experience.md)
