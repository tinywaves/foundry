# Foundry

Foundry provides a CLI-managed local web interface backed by a loopback-only Hono server. It is distributed as an ESM-only Node.js package.

## Usage

Start the local web interface with:

```bash
pnpm dlx @dhzh/foundry ui
```

The server listens on `http://127.0.0.1:54321` and opens the interface in the default browser. Use a different port or keep the browser closed when needed:

```bash
pnpm dlx @dhzh/foundry ui --port 61234 --no-open
```

## Development

The repository is a pnpm workspace containing the published server and CLI package, a private React app, and a private API contract package.

Install dependencies from the repository root:

```bash
pnpm install
```

Start the Hono server:

```bash
pnpm dev:server
```

In another terminal, start the React app at [http://localhost:3000](http://localhost:3000):

```bash
pnpm dev:app
```

Rsbuild proxies `/api` requests to the Hono server at `http://127.0.0.1:54321`.

## Health Endpoint

`GET /api/health` returns HTTP 200 with the shared response envelope:

```json
{
  "status": "SUCCESS",
  "data": true,
  "message": "Service is healthy."
}
```

Unexpected query parameters are rejected with HTTP 400.

## Workspace Layout

- `src/cli/` - CLI entry point and the `foundry ui` command.
- `src/server/` - Hono server, health handler, static app serving, and lifecycle management.
- `app/` - React and Rsbuild local web interface.
- `packages/api-contract/` - Shared response constants and TypeScript types.
- `test/` - Vitest test suite.

## Verification

```bash
pnpm test
pnpm --filter @dhzh/foundry-app typecheck
pnpm build
```

## License

Foundry is licensed under the [Apache License 2.0](./LICENSE).
