# Foundry

Foundry is an AI-native local personal workbench distributed as a CLI.

Running `foundry` starts a local Hono server that serves the Web UI and API,
then opens the Web UI in the default browser.

## Requirements

- Node.js 24.22.1 or newer
- pnpm 12

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the API and Web UI in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

- Web UI: `http://localhost:33333`
- API: `http://localhost:22222`

Rsbuild proxies `/api` requests from the Web UI dev server to the Hono API
server. Both ports are currently fixed.

## Build

```bash
pnpm build
```

The build produces:

```text
dist/
|-- index.mjs
`-- web/
    |-- index.html
    |-- favicon.png
    `-- static/
```

`tsdown` builds the CLI first and cleans `dist`. Rsbuild then writes the Web UI
directly to `dist/web`.

Run the production build locally:

```bash
pnpm start
```

The CLI serves the Web UI and API at `http://localhost:11111`.

## CLI

After installing the package:

```bash
foundry
foundry --no-open
foundry --help
foundry --version
```

The CLI always binds to localhost and uses the fixed entry port `11111`.

## Project Structure

```text
app/
`-- web/                 React + Rsbuild Web UI
src/
|-- cli/                 CLI parsing and browser integration
`-- server/
    |-- api.ts           Hono API routes
    |-- app.ts           API and static Web UI composition
    |-- start.ts         Production server
    |-- dev.ts           API development server
    `-- web-root.ts      Bundled Web UI resolution
```

The published package contains only `dist`, so the CLI and its Web UI assets
are installed together.

## License

[Apache-2.0](LICENSE)
