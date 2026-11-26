# Foundry Web UI

Foundry is an operational local workbench. Preserve its existing routes, page
composition, responsive behavior, content, and business interactions.

Use shadcn/ui preset `b27GcrRo`, generated with the official CLI. The resolved
preset is `base-rhea`, neutral base and theme, neutral charts, Inter Variable,
Lucide icons, default radius, subtle menu accent, and default menu color.
`components.json` records the generator configuration. Component appearance
follows the preset rather than the previous Astryx implementation.

Use generated primitives in `src/components/ui`; these files and the generated
`src/hooks/use-mobile.ts` are excluded from ESLint. Application and feature
components are linted. Use Tailwind CSS v4 for application styles and the preset
CSS variables from `src/styles/globals.css`; do not add a second styling runtime.

Keep the main navigation at 200px expanded and 48px collapsed. Use a mobile
navigation sheet below the sidebar's 768px breakpoint. Keep standalone routes
for settings, provider forms, capture details, and jobs, with their back button
and titlebar actions.

Settings retain a 260px navigation column, switching to a panel picker and
search dialog at 680px. Setting controls stack below labels at that breakpoint.
Theme cards use three columns and switch to a single column below a 335px panel
container width. Settings hide static secondary descriptions; runtime paths,
errors, and transfer blocking messages remain visible.

Session directory groups and nested subagents start collapsed. Session rows
stack at 600px. Capture tables scroll horizontally and retain sticky action
columns. Data transfer actions stack and reverse at 480px. Preserve keyboard
search, focus handling, disabled and pending states, deletion confirmation,
provider model discovery, and import/export state transitions.

Light, dark, and system appearance follow persisted settings. Theme previews
show both schemes independently of the current page scheme. System appearance
tracks the operating system. All application strings remain in the existing
i18n system.
