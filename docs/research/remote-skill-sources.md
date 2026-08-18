# Remote Skill Sources for Foundry

Research date: 2026-08-18. This report uses only first-party documentation,
specifications, public APIs, and source repositories. A behavior described by
implementation source rather than a published API is called out explicitly.

## Scope and terminology

Foundry's **Skill Store** is the canonical local collection. A remote service is
only a **Skill Source**: it helps a user discover or acquire content that
Foundry then copies into the Store. A remote source never distributes directly
to an agent runtime.

This is deliberately separate from filesystem **Distribution Targets** such as
`~/.agents/skills`, `~/.claude/skills`, `~/.codex/skills`, and
`~/.hermes/skills`. Those paths are local destinations derived from the Store;
they are not catalogs, package identities, or upstream update authorities.

The Agent Skills specification defines a package directory rooted by
`SKILL.md`, but it does not define a global registry, globally unique name,
version scheme, update protocol, authentication model, or provenance contract.
Foundry must therefore assign its own Skill ID and preserve source-native
coordinates separately. [Agent Skills specification][agent-skills-spec]

## Executive summary

The smallest viable Discover implementation has three acquisition paths:

1. **Git and GitHub** are the provenance core. A user can paste a repository or
   tree URL, and Foundry records the normalized remote, package path, requested
   ref, resolved commit, and Content Fingerprint.
2. **ClawHub** is the first true Registry adapter. It has documented public
   search, browse, version, download, ownership, rate-limit, and third-party
   reuse contracts.
3. **skills.sh** is a broad Directory adapter, but its search API is an
   unversioned implementation detail. Foundry should use it to locate an
   upstream Git package, then import through the Git acquisition path.

Claude, OpenAI, Cursor, and Gemini marketplaces distribute plugins or
extensions that may contain Skills together with hooks, MCP servers, agents,
and shared files. They should not be presented as standalone Skill registries.
Hermes Hub is an aggregator over other sources rather than an independent
package or version authority.

## Comparison matrix

| Source | Discovery contract | Canonical remote identity | Version and update model | Install artifact | Auth and limits | Third-party desktop integration | Foundry v1 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Agent Skills specification | None; package specification only | None; `name` is package-local | None | Directory rooted by `SKILL.md` | None | Clients may implement the specification | Validation baseline only |
| Well-known discovery draft | Domain-scoped JSON index | Origin + entry URL/name | Artifact SHA-256 digest | `SKILL.md`, ZIP, or tar archive | No auth or limit model specified | Draft protocol intended for clients | Experimental later |
| skills.sh | `skills find`; unversioned `/api/search` used by official CLI | Advisory `owner/repo/slug`, normalized to Git source | Git ref/tree/content hash; no registry semver | Git tree, direct file, ZIP, or tar archive | Git credentials/tokens; no skills.sh limit contract | No published API support promise | Search adapter with Git import |
| ClawHub | Documented public REST and OpenAPI | Owner-qualified slug | Immutable semver versions and mutable tags | Deterministic ZIP or GitHub source handoff | Public reads; documented per-minute limits | Explicitly permitted with conditions | Native Registry adapter |
| GitHub repositories | GitHub Code Search, `gh skill search`, repo/tree URL | Normalized Git remote + Skill path | Requested tag/ref and resolved commit/tree SHA | Repository subtree | Git/GitHub auth and published API limits | Supported through Git and public APIs | Native Git Source adapter |
| Claude marketplace | Marketplace JSON and Claude plugin commands | `plugin-name@marketplace-name` | Declared plugin version, Git ref/SHA, npm version, or archive digest | Whole plugin | Git/npm/source auth; no generic catalog limit | Format is documented; no public cross-client search API | Defer to Plugin Source |
| Hermes Hub | CLI search plus a large static aggregate index | `{source, identifier}` locator | Re-resolve upstream and compare content hash | Source-dependent | Source-dependent; GitHub limits often apply | No stable third-party package API promise | Do not add as an authority |
| OpenAI Plugins | Public Plugins Directory in supported OpenAI surfaces; repository marketplace JSON | Marketplace + plugin name | Manifest version plus Git SHA/ref or npm version | Whole plugin | Surface- and source-dependent | No public Directory search/install API | Defer to Plugin Source |
| Anthropic Skills API | Authenticated list/version APIs | Workspace `skill_id` | Immutable version IDs and `latest_version` | Version ZIP | Anthropic API key and beta header | API integration is documented, but it is not a public marketplace | Future authenticated Source |
| Cursor/Gemini catalogs | Product marketplace/gallery | Plugin or extension identity | Marketplace review/ref/release/commit rules | Whole plugin or extension | Product/source-dependent | No documented public catalog API | Defer |

## 1. Agent Skills official ecosystem

### Package specification

The official specification defines the portable unit as a directory with a
root `SKILL.md`, YAML frontmatter, and optional supporting files. `name` is
required and must match the directory name, but it is not globally namespaced.
The optional `metadata` map may contain author-defined values such as a version,
but these are not a package-manager contract. [Agent Skills
specification][agent-skills-spec]

The client implementation guide recommends user and project `.agents/skills`
directories and bounded local discovery. These are filesystem conventions for
clients, not a remote marketplace. [Adding Skills support][agent-skills-guide]

Foundry consequence:

- Recognize imported content by a root `SKILL.md`; parse metadata on a
  best-effort basis without producing validity or compatibility judgments.
- Never use `SKILL.md` `name` or `metadata.version` as global identity.
- Keep Store identity, remote source identity, and Distribution Target name as
  separate fields.

### Well-known discovery

Cloudflare's Agent Skills Discovery RFC proposes domain-scoped discovery at
`/.well-known/agent-skills/index.json`. Version 0.2.0 entries describe a
`skill-md` or `archive` artifact by URL and SHA-256 digest. Archives may be ZIP
or tar-gzip and clients are required to verify the digest and extract them
safely. The draft provides no global search, authentication, rate-limit, or
publisher-identity system. [Agent Skills Discovery RFC][well-known-rfc]

The current `vercel-labs/skills-handler` README still documents the older
`/.well-known/skills/index.json` shape with a `files` array, while the RFC uses
the new `/agent-skills/` path and a single artifact digest. That incompatibility
makes well-known support unsuitable as a stable v1 contract. [skills-handler
README][skills-handler]

Smallest useful support: later add an experimental "Discover from website"
action that probes a user-supplied origin, records the schema version, verifies
the digest, and never executes package scripts during import.

## 2. skills.sh and the Vercel `skills` CLI

### Discovery and search

The public CLI documents `npx skills find [query]` and an optional `--owner`
filter. At the inspected source commit, the CLI calls
`GET https://skills.sh/api/search?q=...&limit=20&owner=...` and consumes fields
including `id`, `name`, `installs`, and `source`. [skills CLI
README][skills-readme] [search implementation][skills-find]

The same implementation has a blob download fast path at
`/api/download/{owner}/{repo}/{slug}`, returning files and a hash. Neither the
search nor download API has published versioning, authentication, rate-limit,
OpenAPI, or third-party integration guarantees. The site's `robots.txt` also
disallows `/api/`, so Foundry must treat these endpoints as a replaceable
implementation adapter rather than a durable public API. [download
implementation][skills-blob]

### Identity, versions, and provenance

Search results use an advisory `owner/repo/skill` style identifier. The source
of truth remains the underlying Git repository and package path. The CLI lock
model records source URL/type, optional ref, package path, Git tree SHA, and/or
a deterministic content hash. It does not provide registry semver. Update
checks re-resolve the upstream ref and compare content. [lock
implementation][skills-lock]

For Foundry, normalize a skills.sh result to:

```text
sourceUrl       = normalized Git remote
skillPath       = package path within the repository
requestedRef    = optional moving or pinned ref
resolvedRevision = immutable commit SHA
catalogLocator  = skills.sh owner/repo/slug
```

The skills.sh identifier helps return to the listing, but it must not become
the Foundry Skill ID or update authority.

### Install format, auth, and limits

The CLI accepts GitHub shorthand and tree URLs, GitLab, generic Git and SSH
URLs, local paths, direct `SKILL.md` URLs, and ZIP/tar archives. Direct downloads
are bounded by default to 10 MiB input, 25 MiB extracted content, and 1,000
files. Private Git uses configured Git credentials, GitHub CLI, SSH, or explicit
`GITHUB_TOKEN`/`GH_TOKEN`. [skills CLI README][skills-readme]

Foundry should implement its own bounded fetch and safe extraction. It must not
run `npx skills add`, because that command writes to runtime directories and
would bypass the Store.

Smallest v1 support: offer skills.sh search in Discover, display its canonical
listing link, resolve the selected result to Git coordinates, and use the Git
Source adapter for `Add to Store`. If the undocumented endpoint changes, fall
back to opening the listing or accepting a Git URL.

## 3. ClawHub and OpenClaw

### Discovery and third-party support

ClawHub exposes a documented public REST API and OpenAPI description. Relevant
read operations include:

- `GET /api/v1/search?q=...`
- `GET /api/v1/skills` with cursor pagination and browse sorts
- `GET /api/v1/skills/{slug}`
- `GET /api/v1/skills/{slug}/versions`
- `GET /api/v1/skills/{slug}/versions/{version}`
- `GET /api/v1/download?slug=...&version=...` or `tag=latest`

The documentation explicitly permits third-party directories to use public
read endpoints if they cache results, honor `429` and `Retry-After`, link to the
canonical ClawHub listing, and do not imply ClawHub endorsement. [ClawHub HTTP
API][clawhub-api] [ClawHub OpenAPI][clawhub-openapi]

### Identity, versions, and provenance

Foundry must use the owner-qualified coordinate, effectively
`ownerHandle/slug`, because different publishers can own the same slug and old
slugs may redirect after rename or merge. A selected result should be resolved
through detail/version endpoints before import.

ClawHub stores immutable semver releases and mutable tags such as `latest`.
Hosted releases download as deterministic ZIP files. A GitHub-backed entry may
instead return a source handoff containing repository, commit, path,
`contentHash`, and archive URL. Foundry should preserve the exact semver and
artifact digest or commit, rather than recording only `latest`. [ClawHub HTTP
API][clawhub-api] [ClawHub format][clawhub-format]

The ClawHub CLI uses `.clawhub/lock.json` and per-package
`.clawhub/origin.json` for local provenance. Foundry does not need to reuse
those local files as its database model, but it should preserve them if they
are part of an imported package. [ClawHub CLI][clawhub-cli]

### Auth and rate limits

Public read endpoints require no authentication. Account and write operations
use `clh_...` Bearer tokens. Published limits are:

- Read: 3,000 requests/minute per IP or 12,000/minute per key.
- Download: 1,200 requests/minute per IP or 6,000/minute per key.
- Write: 300 requests/minute per IP or 3,000/minute per key.

Clients must honor the rate-limit headers and `Retry-After`. Foundry v1 only
needs anonymous reads and downloads; publishing is outside scope. [ClawHub HTTP
API][clawhub-api] [ClawHub auth][clawhub-auth]

Smallest v1 support: native search/browse/detail, exact-version `Add to Store`,
canonical ClawHub links, response caching, and correct retry behavior. Do not
install into `~/.openclaw/skills`; that path remains a Distribution Target.

## 4. GitHub repository installs

### Discovery and search

GitHub CLI 2.90.0+ exposes the public-preview `gh skill` command group. `gh
skill search` uses GitHub Code Search over public repositories for `SKILL.md`
and supports owner filtering, pagination, and structured fields such as
repository, path, namespace, Skill name, description, and stars. [GitHub Skills
management][github-skill-docs] [gh skill search][gh-skill-search]

GitHub also maintains the `github/awesome-copilot` community collection and a
searchable first-party site. It is useful as a curated Discover shortcut, but
its entries remain ordinary repository packages rather than a separate
registry identity. [awesome-copilot repository][awesome-copilot]

### Identity, refs, and updates

`gh skill install OWNER/REPO SKILL[@VERSION]` accepts a Skill name or exact
path. Without an explicit version, it resolves the latest tagged repository
release, then falls back to default-branch HEAD. `@VERSION` or `--pin` can
resolve a tag or commit SHA. Installed provenance includes repository, ref, and
tree SHA; update compares the tree SHA and skips pinned installations. [gh
skill install][gh-skill-install] [gh skill update][gh-skill-update]

Foundry should adopt the useful resolution semantics without depending on the
preview command's output schema:

- Canonical source identity: normalized Git remote + package path.
- User intent: requested tag, branch, or SHA.
- Resolved revision: immutable commit SHA.
- Content identity: Foundry Content Fingerprint of the imported package.

A moving ref may produce an update candidate, but Foundry never downloads or
distributes it automatically. A pinned SHA never advances.

### Install format, auth, and limits

The acquired unit is a repository subtree whose root contains `SKILL.md`.
Public Git can use anonymous HTTPS. Private sources use the user's Git
credential helper, SSH, or GitHub CLI credentials; tokens must remain in the
main process or OS credential flow and must never be exposed through preload.

GitHub REST allows 60 requests/hour for unauthenticated public requests and
normally 5,000/hour for authenticated users. Search has stricter endpoint
limits; code search requires authentication and is limited separately. Foundry
must cache repository metadata and provide a normal Git clone/fetch fallback.
[GitHub REST rate limits][github-rate-limits] [GitHub Search rate
limits][github-search-limits]

Smallest v1 support: paste a public or private Git/GitHub URL, choose a detected
Skill path when multiple packages exist, optionally select a ref, resolve to a
commit, and `Add to Store`. GitHub search can be added using official API
semantics, but direct URL import is the required foundation.

## 5. Anthropic and Claude sources

### Claude plugin marketplaces

Claude Code marketplaces are Git or JSON catalogs whose entries install whole
plugins. The catalog file is `.claude-plugin/marketplace.json`; commands include
`claude plugin marketplace add/list/update/remove` and plugin
install/update/uninstall workflows. Canonical plugin identity is
`plugin-name@marketplace-name`, while contained Skills are namespaced by the
plugin. [Claude discover plugins][claude-discover] [Claude marketplace
contract][claude-marketplaces]

Plugin sources may be relative paths, GitHub, generic Git, `git-subdir`, npm,
archives, or commands. Git plugin entries can declare a ref and exact SHA, with
SHA taking precedence. A declared plugin version drives update/cache behavior;
otherwise source-specific rules derive it, such as a resolved Git commit or
archive digest. Claude copies installations into a versioned plugin cache.
[Claude marketplace contract][claude-marketplaces] [Claude plugin
reference][claude-plugin-reference]

The official and community repositories are real catalogs, and Anthropic's
`anthropics/skills` repository is a useful Git source. However, a plugin Skill
may depend on plugin-root files, hooks, MCP servers, or other components.
Extracting only `skills/<name>` would silently change the package contract.
[Claude official marketplace][claude-official-marketplace] [Anthropic Skills
repository][anthropic-skills]

Smallest v1 support: accept `anthropics/skills` through the normal Git Source
adapter. Defer generic Claude marketplace ingestion until Foundry has a
separate Plugin Source and can preserve whole-plugin lifecycle. A simple "Open
in Claude" link is safer than claiming cross-client installation support.

### Anthropic Skills API

Anthropic also provides a beta authenticated Skills API. `GET /v1/skills`
lists Anthropic or custom workspace Skills; each has a generated `skill_id` and
`latest_version`. Version endpoints list and download exact ZIP versions.
Custom version IDs are timestamp-based, and custom API Skills are workspace
resources that do not sync with Claude Code or claude.ai. Requests require an
Anthropic API key and the `skills-2025-10-02` beta. [Anthropic Skills
guide][anthropic-skills-guide] [Anthropic Skills list API][anthropic-skills-api]

This is a legitimate future authenticated Skill Source, but it is not a public
Discover marketplace and should not block v1.

## 6. Hermes Hub

Hermes documents `hermes skills browse`, `search`, `inspect`, `install`, and
`update`. Its Hub aggregates bundled optional Skills, skills.sh, well-known
endpoints, direct URLs, GitHub repositories and taps, ClawHub, LobeHub, and
browse.sh. The identifiers are source-specific, for example
`skills-sh/owner/repo/skill`, `well-known:<URL>`, or a GitHub repo/path.
[Hermes Skills Hub][hermes-hub]

Hermes publishes a large static aggregate index rather than a query REST API.
Its lock file stores the source identifier and exact content hash, and update
re-runs the appropriate upstream adapter. Locally modified content is skipped
unless the user forces replacement. GitHub-backed operations inherit GitHub's
limits; the docs recommend `GITHUB_TOKEN` to move from 60 to 5,000 requests per
hour. [Hermes Skills Hub][hermes-hub] [Hermes aggregate index][hermes-index]

Hermes is therefore a client and discovery aggregator, not a package/version
authority. Foundry should integrate ClawHub, skills.sh, and Git directly so it
can preserve each source's native identity. In particular, it must not reduce
a ClawHub package to an unqualified slug.

Smallest v1 support: recognize Hermes as a Distribution Target through its
runtime adapter, but do not add "Hermes Hub" as a remote Registry adapter.

## 7. OpenAI Plugins and Codex

OpenAI's current distribution model is Plugins; the former `openai/skills`
repository is deprecated. OpenAI and Codex expose a public Plugins Directory
inside supported OpenAI surfaces, but official documentation does not publish
a third-party search or install API for that universal directory. [OpenAI
Skills and Plugins][openai-skills-plugins] [deprecated OpenAI Skills
repository][openai-skills-repo]

Repository and user marketplaces use `.agents/plugins/marketplace.json`.
Codex supports marketplace add/list/upgrade/remove commands, while plugin
entries can use local paths, Git/Git-subdirectory sources with refs or SHAs,
and npm packages with versions or ranges. A plugin has a
`.codex-plugin/plugin.json` manifest and can contain `skills/` alongside other
capabilities. Installed plugins are cached by marketplace, plugin name, and
version. [OpenAI plugin packaging][openai-plugin-build] [OpenAI plugin
marketplaces][openai-plugin-marketplaces]

As with Claude, the stable package boundary is the plugin rather than each
contained Skill. Foundry must not scrape the public Directory or build a new
adapter for deprecated `openai/skills`.

Smallest v1 support: optional curated Git shortcuts to public repositories.
Defer OpenAI marketplace parsing until Foundry models plugins as first-class
packages.

## 8. Other official catalogs

### Cursor Marketplace and Agent Plugins

Cursor's Marketplace distributes reviewed plugins, and team marketplaces can
track GitHub repositories. Plugins may include Skills together with MCP,
rules, hooks, and other resources. No public third-party Marketplace search or
install API is documented. [Cursor plugins][cursor-plugins]

The Agent Plugins specification defines a package layout and optional manifest
version, but its current 1.0.0 text is a Working Draft and explicitly leaves
distribution, installation, updates, authentication, and UX to clients. It is
a parser contract, not a remote catalog. [Agent Plugins
specification][agent-plugins-spec]

### Gemini CLI Extension Gallery

Gemini CLI's gallery discovers tagged public GitHub repositories with a root
`gemini-extension.json`. Installation accepts a GitHub URL or local path and
optional ref; update behavior compares commits, release tags, or local manifest
versions depending on source. Extensions can include Skills plus MCP servers,
hooks, policies, and agents. The gallery has no documented public third-party
search API. [Gemini extensions][gemini-extensions] [Gemini extension
releases][gemini-extension-releases]

Both sources belong in a future plugin/extension model. For v1, Foundry may
accept their underlying Git repository URL only when the user chooses an
independently recognizable Skill Package rooted by `SKILL.md`.

## Foundry source and provenance model

Catalog identity, source identity, Store identity, and content identity must
remain independent. A practical Source record is:

| Field | Meaning |
| --- | --- |
| `provider` | Adapter kind such as `git`, `github`, `clawhub`, or `skills-sh` |
| `catalogLocator` | Optional search/listing coordinate used to return to a catalog |
| `sourceUrl` | Canonical Git remote or artifact origin |
| `sourceNativeId` | Owner-qualified registry ID when the source defines one |
| `skillPath` | Skill Package path within a repository or larger artifact |
| `requestedRef` | User-selected branch, tag, range, or channel such as `latest` |
| `resolvedRevision` | Immutable commit SHA, semver release, or source version ID |
| `artifactDigest` | Source-provided digest of downloaded bytes, when available |
| `observedContentFingerprint` | Foundry fingerprint after safe extraction and normalization |
| `canonicalWebUrl` | Source-owned page shown in Discover and package details |
| `fetchedAt` | Time Foundry resolved and fetched this revision |

The Foundry Skill ID remains a UUID independent of every field above. Equal
Content Fingerprints can be deduplicated during import without collapsing
distinct provenance records. Same-name packages remain distinct in the Store
and become a conflict only when distributed to the same target.

The remote acquisition flow is:

```text
Discover result or Git URL
  -> resolve source-native coordinates
  -> pin an immutable remote revision
  -> fetch with size and path-containment limits
  -> verify source digest when provided
  -> recognize a package rooted by SKILL.md
  -> compute Foundry Content Fingerprint
  -> Add to Store and create the initial Skill Revision
  -> let the user separately distribute a Revision to local targets
```

Checking a moving source later may produce an **update candidate**. It does not
download, accept, or distribute the update automatically. Existing
installations can intentionally remain Outdated.

## Recommended v1 boundary

Implement:

1. **Git Source adapter** for repository/tree URLs, multiple Skill selection,
   requested refs, immutable commit resolution, private Git credentials, and
   bounded subtree import.
2. **ClawHub Registry adapter** for documented search/browse/detail, exact
   versions, deterministic download or GitHub handoff, caching, canonical
   links, and rate-limit handling.
3. **skills.sh Directory adapter** for search and listing only. Resolve every
   selection to its Git upstream and keep the adapter replaceable because its
   API is not a published integration contract.

Defer:

- Well-known discovery until the draft and deployed handler shape converge.
- Hermes Hub because it aggregates the same underlying sources and weakens
  source-native identity.
- Claude, OpenAI, Cursor, and Gemini marketplaces until Foundry has a
  first-class plugin/extension package model.
- Anthropic Skills API until authenticated workspace Sources are in scope.
- LobeHub and browse.sh as first-class sources: their entries are transformed
  agents or browser-task content rather than a general portable Skill registry.

This boundary gives Discover useful search and remote acquisition without
turning Foundry into a second plugin manager or allowing any remote provider to
bypass the canonical Store.

[agent-skills-spec]: https://agentskills.io/specification.md
[agent-skills-guide]: https://agentskills.io/client-implementation/adding-skills-support.md
[well-known-rfc]: https://github.com/cloudflare/agent-skills-discovery-rfc
[skills-handler]: https://github.com/vercel-labs/skills-handler
[skills-readme]: https://github.com/vercel-labs/skills/blob/c6f69c631292444cc541ac6d91e2226b0ff247da/README.md
[skills-find]: https://github.com/vercel-labs/skills/blob/c6f69c631292444cc541ac6d91e2226b0ff247da/src/find.ts
[skills-blob]: https://github.com/vercel-labs/skills/blob/c6f69c631292444cc541ac6d91e2226b0ff247da/src/blob.ts
[skills-lock]: https://github.com/vercel-labs/skills/blob/c6f69c631292444cc541ac6d91e2226b0ff247da/src/skill-lock.ts
[clawhub-api]: https://docs.openclaw.ai/clawhub/http-api
[clawhub-openapi]: https://clawhub.ai/api/v1/openapi.json
[clawhub-format]: https://docs.openclaw.ai/clawhub/skill-format
[clawhub-cli]: https://docs.openclaw.ai/clawhub/cli
[clawhub-auth]: https://docs.openclaw.ai/clawhub/auth
[github-skill-docs]: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills#managing-skills-with-github-cli
[gh-skill-search]: https://cli.github.com/manual/gh_skill_search
[gh-skill-install]: https://cli.github.com/manual/gh_skill_install
[gh-skill-update]: https://cli.github.com/manual/gh_skill_update
[awesome-copilot]: https://github.com/github/awesome-copilot
[github-rate-limits]: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
[github-search-limits]: https://docs.github.com/en/rest/search/search
[claude-discover]: https://code.claude.com/docs/en/discover-plugins
[claude-marketplaces]: https://code.claude.com/docs/en/plugin-marketplaces
[claude-plugin-reference]: https://code.claude.com/docs/en/plugins-reference
[claude-official-marketplace]: https://github.com/anthropics/claude-plugins-official
[anthropic-skills]: https://github.com/anthropics/skills
[anthropic-skills-guide]: https://platform.claude.com/docs/en/build-with-claude/skills-guide.md
[anthropic-skills-api]: https://platform.claude.com/docs/en/api/beta/skills/list.md
[hermes-hub]: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills#skills-hub
[hermes-index]: https://hermes-agent.nousresearch.com/docs/api/skills-index.json
[openai-skills-plugins]: https://developers.openai.com/codex/skills-and-plugins.md
[openai-skills-repo]: https://github.com/openai/skills
[openai-plugin-build]: https://developers.openai.com/plugins/build/plugins.md
[openai-plugin-marketplaces]: https://developers.openai.com/codex/plugins.md
[cursor-plugins]: https://cursor.com/docs/plugins.md
[agent-plugins-spec]: https://agent-plugins.org/specification
[gemini-extensions]: https://geminicli.com/docs/extensions.md
[gemini-extension-releases]: https://geminicli.com/docs/extensions/releasing.md
