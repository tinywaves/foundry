# Modern CLI Library Selection

## Decision

Use [`citty`](https://github.com/unjs/citty) for Foundry's CLI.

It is the best match for the current scope: an ESM-only Node.js 24 executable with root help/version output, one `ui` subcommand, a `--port` value, and a negatable `--open` option. Citty is declarative, typed, dependency-free, built on Node's `util.parseArgs`, supports nested commands, generates usage, and handles `--help`/`-h`, `--version`/`-v`, and `--no-*` boolean forms itself. These are explicit features in the [current official README](https://github.com/unjs/citty/blob/3e342fe7b3f67575faf51df8361d502be6fe32e8/README.md). Its [published manifest](https://registry.npmjs.org/citty) is ESM-only and ships `.d.mts` types.

Citty does not have a numeric argument type. Define `port` as a string and keep Foundry's integer and `1..65535` validation in a small application-owned parser. A CLI library should parse syntax; the application's port contract should remain explicit.

`cac` is the credible runner-up. Version 7 is actively maintained, ESM-only, dependency-free, and requires Node 20.19+, so it is not technically obsolete. Citty wins because its typed declarative command tree and built-in flags align more directly with a new small CLI, while CAC's imperative API mainly offers familiarity.

## Measurement Method

Queried on **2026-08-31**. npm counts use one shared completed window, **2026-08-23 through 2026-08-29**, from npm's official downloads API. GitHub stars were read from each official repository page on the query date. Publish metadata comes from the npm registry; repository activity comes from the official GitHub commit and release feeds.

npm downloads measure package installations, including installations caused by dependency trees. They are useful as an ecosystem-footprint signal, but they do not prove deliberate direct adoption. The adoption column therefore uses downstream projects' own current manifests or source separately.

## Candidate Comparison

| Candidate | npm downloads/week | GitHub stars | Latest package and activity | Runtime and feature fit | Verified direct adoption |
| --- | ---: | ---: | --- | --- | --- |
| **citty** | [30,487,718](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/citty) | [1,311](https://github.com/unjs/citty) | `0.2.2`, published 2026-04-01; [latest commit 2026-08-20](https://github.com/unjs/citty/commits/main.atom) | ESM, TypeScript declarations, zero dependencies; typed commands, lazy subcommands, generated usage, built-in help/version, boolean negation. No numeric type. | Current [`@nuxt/cli`](https://registry.npmjs.org/%40nuxt%2Fcli) and [`nitropack`](https://registry.npmjs.org/nitropack) manifests directly declare `citty ^0.2.2`. Nitro has [11,161 stars](https://github.com/nitrojs/nitro). |
| **cac** | [49,399,783](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/cac) | [3,127](https://github.com/cacjs/cac) | `7.0.0`, published 2026-02-27; [latest commit 2026-08-28](https://github.com/cacjs/cac/commits/main.atom) | ESM, TypeScript, zero dependencies, Node `>=20.19`; subcommands, generated help/version, command options, negated options. Imperative API and string-oriented option declarations. | [`tsdown`](https://github.com/rolldown/tsdown/blob/main/package.json) directly declares CAC and has [4,240 stars](https://github.com/rolldown/tsdown). This is deliberate adoption, not just Foundry receiving CAC transitively through tsdown. |
| **cleye** | [474,246](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/cleye) | [690](https://github.com/privatenumber/cleye) | Stable `2.6.0`, published 2026-04-18; `3.0.0-beta.1` released 2026-07-12; [latest commit 2026-04-18](https://github.com/privatenumber/cleye/commits/master.atom) | Dual ESM/CJS with types; strongly typed flags, numeric conversion, commands, generated help/version, optional boolean negation. Two runtime dependencies. | [`tsx`](https://github.com/privatenumber/tsx/blob/master/package.json) directly declares and imports Cleye and has [12,124 stars](https://github.com/privatenumber/tsx), but it currently uses the older `^1.3.2` line. |
| **@stricli/core** | [1,100,907](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/%40stricli%2Fcore) | [1,087](https://github.com/bloomberg/stricli) | `1.3.0`, published 2026-07-16; [latest commit 2026-08-07](https://github.com/bloomberg/stricli/commits/main.atom) | ESM/CJS with types and zero dependencies; excellent typed parsing, route maps, automatic help/version integrations, negation, lazy loading, completion, and documentation. More framework ceremony than this two-command CLI needs. | No notable external direct adopter was verified from the checked first-party manifests. The download count should not be treated as proof of broad intentional adoption. |
| **clipanion** | [5,281,909](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/clipanion) | [1,256](https://github.com/arcanis/clipanion) | npm `latest` is `4.0.0-rc.4`, published 2024-09-06; [latest commit 2024-09-06](https://github.com/arcanis/clipanion/commits/master.atom) | Typed conditional ESM/CJS exports; sophisticated nested routing, validation, proxying, help, and version commands. Class-based command model and state-machine routing are unnecessary here; current stable-line status and inactivity are concerns. | Yarn 4's [`@yarnpkg/cli`](https://github.com/yarnpkg/berry/blob/master/packages/yarnpkg-cli/package.json) directly declares `clipanion ^4.0.0-rc.2`; Yarn Berry has [8,102 stars](https://github.com/yarnpkg/berry). Strong evidence for complex CLIs, not for Foundry's small initial surface. |

Feature claims above come from the candidates' current first-party documentation and manifests: [Citty](https://github.com/unjs/citty/blob/3e342fe7b3f67575faf51df8361d502be6fe32e8/README.md), [CAC](https://github.com/cacjs/cac/blob/165e613c42bef727d5734fd540935465d9a26cba/README.md), [Cleye](https://github.com/privatenumber/cleye/blob/711f3b18300f14e257445cdf686661ee581e5f38/README.md), [Stricli](https://bloomberg.github.io/stricli/llms-full.txt), and [Clipanion](https://github.com/arcanis/clipanion/blob/434b5a6e0063c58b5e2f0a62498a7de0b308308f/README.md).

## Implementation Consequences

- Add `citty` as a runtime dependency.
- Put the executable in a separate CLI entry and point the package `bin.foundry` field to its built output. Keep the library export and CLI entry independent.
- Supply the package version to Citty's root command metadata. This does not couple the CLI to the placeholder `getVersion()` library API; both can read the same package metadata independently.
- Model `ui` as a subcommand with `port` as a string argument and `open` as a boolean defaulting to `true`. Citty will expose the required `--no-open` form.
- Handle an empty argument list before `runMain` and render root usage with exit status `0`. Citty's default for a command tree without a selected subcommand is to print usage, report `No command specified.`, and exit `1`, which does not match Foundry's `foundry`-means-help contract. Keep unknown command/option handling under `runMain`, with focused tests for both paths.
- Revisit the choice only if the CLI grows into a large, deeply nested command system needing completion or highly customized documentation. Stricli would then deserve a new evaluation.

Commander was intentionally excluded from the shortlist because the selection requirement favors a current-generation API rather than installed-base longevity.
