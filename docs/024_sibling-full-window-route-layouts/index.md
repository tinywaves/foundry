# Adopt Sibling Full-Window Route Layouts

## Status

`completed`

## Goal

Establish sibling standard-shell and full-window route layouts, then use the full-window layout for Prompt creation and editing so those workflows fill the Foundry application window without coupling Prompt behavior to the application root.

## Detail

Foundry will register two mutually exclusive layout branches at the router boundary. `AppShellLayout` will own the standard `AppShell`, `SideNav`, and an outlet for ordinary application pages. `FullWindowLayout` will own only the reusable full-window boundary, the Astryx surface background shared with standard content areas, a macOS-only full-width `WindowDragRegion`, and an outlet for routes that require the complete application window.

The layouts will be selected by route registration rather than by Prompt-specific checks or visual hiding inside the application root. Entering a full-window route will unmount `AppShellLayout` and `SideNav`. The resizable SideNav will use a stable `autoSaveId` so its user-adjusted width is restored when the standard layout mounts again and across application restarts.

New Prompt and Edit Prompt will become the first children of `FullWindowLayout`. Prompt-owned page composition will continue to provide editor-specific controls, including the History action and a left-aligned return-arrow trigger labeled Back to Prompts. Back to Prompts and the Create/Edit Cancel actions will use replacement navigation to the canonical Prompts list. Existing unsaved-change protection will continue to guard those exits, while save, validation, History, version viewing, restore behavior, and Prompt detail navigation retain their current semantics.

This plan establishes a reusable route-layout boundary, not a root-level workspace host, drawer system, or dynamic registration framework. Future full-window routes can be registered as additional children of `FullWindowLayout` without modifying the application root or adding domain-specific activation conditions.

## Scope

- Sibling `AppShellLayout` and `FullWindowLayout` branches at the renderer router boundary.
- Migration of standard application routes into the `AppShellLayout` branch.
- A generic full-window route layout with the Astryx surface background, a macOS-only full-width `WindowDragRegion`, and an outlet.
- Mutually exclusive route rendering with one active layout branch for each URL.
- Stable SideNav width persistence through its resizable `autoSaveId` across layout unmounts and application restarts.
- Migration of Prompt New/Edit routes into the full-window branch.
- A Prompt-owned Back to Prompts trigger and consistent Prompts-list navigation for Create/Edit Cancel.
- Preservation and verification of Prompt save, validation, History, version, restore, loading, and unsaved-change behavior.
- Focused Prompt navigation and pure-function tests, static route-layout verification, and non-visual project checks.

## Out of Scope

- Keeping `AppShell` or `SideNav` mounted while a full-window route is active.
- A root-level `FullWindowWorkspaceHost` or Prompt-specific application-root activation logic.
- A global drawer host, overlay-based routing, drawer animation, or gesture behavior.
- A plugin, registry, or dynamic discovery system for future full-window routes.
- Migration of Prompt detail, Prompt Trash, or any non-editor route into the full-window layout.
- Changes to Prompt fields, validation rules, persistence, save semantics, History, version viewing, restore behavior, or internal confirmation dialogs.
- Operating-system native fullscreen behavior.
- New dependencies or styling systems.
- Application launch, browser automation, screenshots, accessibility-tree inspection, or desktop automation for visual acceptance.

## Decisions

- Register `AppShellLayout` and `FullWindowLayout` as sibling route layouts rather than conditionally switching content inside `App`.
- Render exactly one layout branch for the active URL; do not mount duplicate route trees or hide an inactive shell behind another layer.
- Let full-window routes unmount `AppShellLayout` and `SideNav`, while preserving the SideNav width with a stable `autoSaveId`.
- Keep `FullWindowLayout` domain-agnostic: it owns only full-window structure, the shared Astryx surface background, macOS window dragging, and an outlet.
- Keep Back to Prompts, History, Cancel, form state, and other Prompt-specific behavior in Prompt-owned pages.
- Reuse the existing `WindowDragRegion` as a full-width top row on macOS and omit it on Windows and Linux.
- Make Back to Prompts and both Create/Edit Cancel actions navigate with replacement to `/agent-extensions/prompts`.
- Reuse the existing unsaved-change confirmation for both Prompt editor exit controls.
- Keep exit controls unavailable during existing unsafe save, version-loading, or restore mutation states.
- Keep Save navigation targeting the saved Prompt detail route.
- Preserve existing Astryx components, StyleX, design tokens, Lucide icons, and renderer process boundaries.

## Tasks

- [x] [Task 001: Establish Sibling Route Layouts](./task001_establish-sibling-route-layouts.md)
- [x] [Task 002: Move Prompt Editors to the Full-Window Layout](./task002_move-prompt-editors-to-the-full-window-layout.md)
