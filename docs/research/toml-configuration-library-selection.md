# TOML Configuration Library Selection

Date: 2026-09-05

## Decision

Use **`@decimalturn/toml-patch`** to update Codex `config.toml`.

It is the only evaluated candidate whose primary API is designed for surgical TOML mutation while retaining unrelated source text. That directly matches Foundry's requirement to own a small set of Codex fields without rewriting user-managed fields, comments, ordering, whitespace, or surrounding formatting.

Do not use `smol-toml` or `js-toml` as the writer for this feature. Both are credible general TOML parsers/stringifiers, but an object parse/mutate/stringify round trip is the wrong abstraction for preserving a user-edited configuration document. They remain reasonable choices when canonical serialization is acceptable.

Before integrating `@decimalturn/toml-patch`, add focused fixture tests covering the exact Codex shapes Foundry will update. Its ecosystem is substantially smaller than `smol-toml`, so Foundry should verify the behavior it depends on rather than infer safety from adoption volume.

## Evaluation Criteria

The required operation is not merely "parse TOML and write valid TOML." Foundry must:

- update only its managed top-level fields and one selected `[model_providers.<key>]` table;
- preserve unrelated fields, tables, comments, ordering, quoting, whitespace, and formatting as much as possible;
- support ESM on Node.js 24;
- correctly represent TOML values used by Codex;
- support previewing the exact changes before applying them;
- remain maintainable in a modern TypeScript codebase.

Metrics below were retrieved from the npm registry/download API and GitHub API on 2026-09-05. The npm download interval was 2026-08-23 through 2026-08-29.

## Comparison

| Criterion | `@decimalturn/toml-patch` | `smol-toml` | `js-toml` |
| --- | --- | --- | --- |
| Latest version | `3.0.5`, published 2026-08-30 | `1.8.0`, published 2026-08-11 | `2.0.1`, published 2026-08-04 |
| Node.js / modules | Pure ESM; declares Node `>=16` | ESM and CommonJS exports; declares Node `>=18` | ESM and CommonJS conditional exports; no `engines` declaration |
| Node.js 24 fit | Explicitly within supported range | Explicitly within supported range | Packaging is compatible in principle, but Node 24 support is not explicitly promised |
| Primary API fit | TOML-aware patching of source text | Parse to JS values and stringify a document | Parse to JS values and stringify a document |
| Comment/format preservation | Strongest fit; patch-first design avoids serializing the entire document | Poor fit for surgical writes; full stringify normalizes source representation | Poor fit for surgical writes; full stringify normalizes source representation |
| Parse/stringify role | Specialized editor rather than the strongest general-purpose serializer | Strong general parser/stringifier and the broadest-adopted candidate | General parser/stringifier backed by Chevrotain |
| Weekly npm downloads | 116,442 | 34,053,544 | 29,952 |
| GitHub stars | 9 | 305 | 66 |
| Latest repository activity observed | Pushed 2026-09-01 | Pushed 2026-08-23 | Pushed 2026-08-05 |
| Latest GitHub release | `v3.0.5`, 2026-08-30 | `v1.8.0`, 2026-08-11 | `v2.0.1`, 2026-08-05 |
| Active adopter evidence | Cloudflare Flagship declares it in its first-party package manifest | Deepnote's first-party repository records it in its dependency manifest/lockfile | DeltaMod declares it in its first-party package manifest |
| Overall fit for Foundry | **Best** | Good parser, unsuitable writer | Good parser alternative, unsuitable writer |

## Candidate Analysis

### `@decimalturn/toml-patch`

`@decimalturn/toml-patch` is purpose-built for updating TOML source rather than regenerating the complete document. That distinction is decisive for Foundry: a patch can target `model`, `review_model`, `model_provider`, and selected provider-table members while leaving unrelated source ranges untouched.

The current package is ESM-only, publishes TypeScript declarations through its export map, and declares Node.js `>=16`; Node.js 24 is therefore directly supported by the package contract. Version `3.0.5` was published on 2026-08-30, and the repository was pushed again on 2026-09-01. This is current maintenance activity rather than a dormant package.

Its adoption footprint is much smaller than `smol-toml`: 116,442 downloads in the measured week and 9 GitHub stars. The evidence is nevertheless stronger than raw popularity alone because an active first-party adopter, Cloudflare's Flagship repository, declares the package directly. That is relevant evidence for production use, although it does not prove compatibility with every Codex TOML construct.

The main risk is ecosystem size and the narrower implementation surface. Foundry should lock the version and test the exact operations it requires:

- insert absent top-level scalar fields;
- replace existing top-level fields regardless of their prior TOML value type;
- discover existing `[model_providers.<key>]` tables;
- insert or replace managed values in the selected table;
- retain unmanaged keys in that table;
- retain other provider tables and direct values under `[model_providers]`;
- remove only Foundry-managed top-level fields for Official Default;
- preserve comments, blank lines, quoting, table order, CRLF/LF style, and a final newline;
- handle quoted and dotted provider keys correctly;
- produce valid TOML after every patch.

### `smol-toml`

`smol-toml` has by far the strongest adoption signal: 34,053,544 downloads in the measured week, 305 GitHub stars, a release on 2026-08-11, and repository activity on 2026-08-23. Its package publishes ESM and CommonJS builds, TypeScript declarations, and an explicit Node.js `>=18` requirement, making Node.js 24 support straightforward.

It is the strongest candidate here for conventional parse/stringify correctness and ecosystem confidence. Deepnote's active first-party repository also records the dependency. For applications that own the entire TOML file and accept canonical reserialization, it would be the conservative choice.

It is not the right writer for Codex `config.toml`. Its public abstraction converts TOML into JavaScript values and serializes values back to TOML. Comments, exact whitespace, original quoting, ordering decisions, and other source-level details are not represented by that value model. Therefore a parse/mutate/stringify flow necessarily cannot promise preservation of those details. This conclusion is an inference from the API shape, not a claim that its generated TOML is invalid.

### `js-toml`

`js-toml` is an actively maintained TypeScript parser/stringifier and a useful third comparison point. Version `2.0.1` was published on 2026-08-04, its repository was pushed on 2026-08-05, and it had 29,952 downloads in the measured week and 66 GitHub stars. DeltaMod's active repository declares it directly.

The package provides both ESM and CommonJS conditional exports and TypeScript declarations. It does not declare a Node.js engine range, so Node.js 24 compatibility is plausible from the packaging and current toolchain but weaker as a documented support commitment than the other two candidates. Its parser is implemented with Chevrotain, which gives it a structured grammar foundation.

Like `smol-toml`, its value-oriented parse/stringify API does not provide the source-preserving edit model Foundry needs. Even if its serialization is TOML-correct, whole-document output can replace the user's formatting and comments. It offers no compelling advantage over `smol-toml` for this feature and no compelling advantage over `@decimalturn/toml-patch` for surgical updates.

## Recommended Integration Shape

Adopt `@decimalturn/toml-patch` behind a small module-local adapter that exposes Foundry's domain operation, not the library's general API. For example, the server-side module should accept the original TOML text, the selected provider key, and the proposed managed values, then return the patched text and structured preview changes.

The adapter should enforce these boundaries:

1. Parse or inspect the original document before applying changes.
2. Calculate preview rows from the original managed values and proposed values.
3. Patch only the explicitly managed paths.
4. Re-parse the resulting text to verify that it remains valid TOML.
5. Verify that unmanaged fixture values and comments remain present.
6. Keep the existing file-hash check, backup, and atomic replacement logic outside the TOML library adapter.

Do not introduce a generic repository-wide TOML abstraction. Foundry's meaningful seam is "apply Codex provider configuration while preserving user content," not "wrap a TOML package."

## Recommendation

Choose **`@decimalturn/toml-patch`** for Codex configuration mutation.

It is the best match for the non-negotiable requirement: preserve unrelated fields and human-authored comments/formatting while changing a narrow set of TOML paths. `smol-toml` is considerably more popular and is the preferred fallback if Foundry later decides that canonical full-file serialization is acceptable, but it should not be used for this surgical-update workflow. `js-toml` is active and modern but does not improve the key preservation requirement.

Proceed only with fixture-based verification of `@decimalturn/toml-patch` against representative Codex files, especially dotted/quoted provider keys and removal behavior. If those tests expose unsupported syntax or unacceptable formatting churn, the fallback should be a CST/AST-based editor or a narrowly scoped source editor—not a silent switch to full-document stringify.

## Primary Sources

### npm

- [`@decimalturn/toml-patch` registry metadata](https://registry.npmjs.org/@decimalturn%2Ftoml-patch)
- [`@decimalturn/toml-patch` download count](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/@decimalturn/toml-patch)
- [`smol-toml` registry metadata](https://registry.npmjs.org/smol-toml)
- [`smol-toml` download count](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/smol-toml)
- [`js-toml` registry metadata](https://registry.npmjs.org/js-toml)
- [`js-toml` download count](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/js-toml)

### Library repositories and releases

- [`DecimalTurn/toml-patch`](https://github.com/DecimalTurn/toml-patch)
- [`toml-patch v3.0.5`](https://github.com/DecimalTurn/toml-patch/releases/tag/v3.0.5)
- [`squirrelchat/smol-toml`](https://github.com/squirrelchat/smol-toml)
- [`smol-toml v1.8.0`](https://github.com/squirrelchat/smol-toml/releases/tag/v1.8.0)
- [`sunnyadn/js-toml`](https://github.com/sunnyadn/js-toml)
- [`js-toml v2.0.1`](https://github.com/sunnyadn/js-toml/releases/tag/v2.0.1)

### First-party adopter manifests

- [Cloudflare Flagship package manifest](https://github.com/cloudflare/flagship/blob/main/package.json)
- [Deepnote dependency manifest](https://github.com/deepnote/deepnote/blob/main/pnpm-lock.yaml)
- [DeltaMod package manifest](https://github.com/deltamodders/deltamod/blob/develop/package.json)
