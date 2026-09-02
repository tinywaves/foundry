# Foundry Agent Guide

## Active Modules

- `src/cli/` contains the Citty CLI and the `foundry ui` command.
- `src/server/` contains the loopback-only Hono server, HTTP handlers, static file serving, and shutdown lifecycle.
- `app/` is the private React and Rsbuild workspace for the local web interface.
- `packages/api-contract/` is the private workspace module shared by the server and app.
- `test/` contains the Vitest coverage for the CLI, server, contracts, and frontend health client.

Keep local web interface changes within these modules. The frontend consumes server contracts through `@dhzh/foundry-api-contract` and communicates with the server through relative `/api` requests.

## Development

- Run workspace commands from the repository root.
- Use `pnpm dev:server` to start the Hono server at `http://127.0.0.1:54321`.
- Use `pnpm dev:app` to start the React app at `http://localhost:3000`; Rsbuild proxies `/api` to the Hono server.
- Use `pnpm build` to build the server package followed by the React app in `dist/app`.
- Verify changes with `pnpm test`, `pnpm --filter @dhzh/foundry-app typecheck`, and `pnpm build` as relevant to the modified modules.

## Code Design

- Prefer the direct implementation when a wrapper only forwards arguments or returns one expression. Introduce a helper, factory, hook, class, or other abstraction only when it centralizes reusable behavior, enforces a policy, creates a meaningful test seam, or hides substantial complexity.
- Keep module APIs minimal. Export a symbol only when another module imports it; keep module-local implementation details unexported.
- Before adding or retaining an export, search its call sites. Remove the export when no external consumer exists, and remove the symbol entirely when it adds no local value.

## HTTP Contracts

- Define shared runtime constants and TypeScript response types in `packages/api-contract/`.
- Validate request input before handlers and preserve transport/business status semantics. Read [ADR 0001](docs/adr/0001-separate-transport-and-business-status.md) when adding or changing HTTP handlers or response envelopes.
- Keep `@dhzh/foundry-api-contract` private. The root tsdown build must bundle it into the published Foundry output.

## Library Selection

- Prefer a library over a custom implementation whenever a suitable library can satisfy the requirement.
- Select libraries that are both modern and broadly adopted. High historical usage alone is insufficient; do not choose a legacy library such as Commander solely because it has high download counts.
- Before selecting a library, delegate research to a subagent. Compare candidates using current npm download volume, GitHub stars, recent releases and maintenance activity, and direct adoption by current open-source projects.
- Base the decision on evidence from primary sources such as npm, the library's repository and releases, and first-party dependency manifests from adopting projects.

## Framework Documentation

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
