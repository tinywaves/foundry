# Agent Runtime Skill Support

Research date: 2026-08-18. This report uses only first-party documentation,
specifications, and source repositories. "Unknown" means the runtime's public
contract does not state the behavior; Foundry should not infer it.

## Executive summary

`SKILL.md` is the common package entry point, but the filesystem contract is
not universal. The Agent Skills specification defines what is inside a Skill,
not where it is installed. Its implementation guide describes
`~/.agents/skills` and `<project>/.agents/skills` as a widely adopted
cross-client convention. It also recommends bounded scans and a project-trust
gate, rather than an unrestricted home-directory crawl. [Agent Skills
specification][agent-skills-spec] [implementation guide][agent-skills-guide]

The most important modeling consequence for Foundry is that an installation
root and a runtime are not the same object. `~/.agents/skills` is one physical
root consumed by Codex, Gemini CLI, OpenCode, Cursor, GitHub Copilot, goose,
and (in its default state) OpenClaw. Foundry must treat it as one physical
Generic Target rather than distributing independent copies for every runtime;
the product does not need to expose which runtimes consume that target.

## Common package baseline

A portable Skill is a directory whose exact entry filename is `SKILL.md`.
The file contains YAML frontmatter followed by Markdown. `name` and
`description` are required by the standard; `name` must match the parent
directory and use 1-64 lowercase alphanumeric or hyphen characters. Optional
standard fields are `license`, `compatibility`, `metadata`, and experimental
`allowed-tools`. Scripts, references, and assets are ordinary files inside the
same package. [Agent Skills specification][agent-skills-spec]

The ecosystem therefore permits two distinct compatibility questions:

- **Host-compatible**: accepted by the selected runtime.
- **Portable**: satisfies the Agent Skills specification and can be safely
  offered to other runtimes.

Claude Code, for example, accepts a local Skill with only `description`, using
the directory as its command name, while the portable standard requires
`name`. Foundry v1 deliberately does not classify packages as valid, portable,
compatible, trusted, or safe; it only recognizes a package by its root
`SKILL.md` and preserves runtime-specific content. [Claude Code
Skills][claude-skills]

## Runtime matrix

| Runtime | User/global roots | Project roots | Same-name behavior |
| --- | --- | --- | --- |
| OpenAI Codex | `~/.agents/skills`; deprecated `$CODEX_HOME/skills`; admin `/etc/codex/skills`; bundled system Skills | Every `.agents/skills` from CWD up to repository root | Does not merge; multiple entries may remain visible |
| Claude Code | `~/.claude/skills`; enterprise managed settings; plugins; synced account Skills | `.claude/skills` from CWD to repo root, plus lazy nested discovery | Enterprise > personal > project; local overrides bundled; nested collisions are qualified |
| Generic Agent Skills | Recommended `~/.agents/skills` | Recommended `<project>/.agents/skills` | Implementation guidance recommends project > user; the specification itself is silent |
| Hermes Agent | `<HERMES_HOME>/skills` (normally `~/.hermes/skills`); configured `external_dirs` | `<project>/.hermes/skills`, `<project>/.agents/skills` | Project > local profile > external directories |
| OpenClaw | `<state-dir>/skills` (normally `~/.openclaw/skills`); `~/.agents/skills` only in default state; extra/plugin roots | `<workspace>/skills`, then `<workspace>/.agents/skills` | Fully documented priority order; highest source wins |
| Gemini CLI | `~/.gemini/skills`, `~/.agents/skills`; extension and built-in tiers | `.gemini/skills`, `.agents/skills` | Workspace > user > extension > built-in; `.agents` wins within user/workspace tier |
| OpenCode | `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills` | `.opencode/skills`, `.claude/skills`, `.agents/skills`, walking CWD to worktree root | **Unknown contract**; current source warns and overwrites duplicate names |
| Cursor | `~/.cursor/skills`, `~/.agents/skills`, plus Claude/Codex compatibility roots | `.cursor/skills`, `.agents/skills`, plus Claude/Codex compatibility roots | **Unknown** |
| GitHub Copilot | `~/.copilot/skills`, `~/.agents/skills` | `.github/skills`, `.claude/skills`, `.agents/skills` | **Unknown** |
| goose | `~/.agents/skills`; legacy/platform roots; installed plugins | `.agents/skills`; legacy `.goose/skills`, `.claude/skills` | Current source uses project before global and first-found wins |

## Runtime details

### OpenAI Codex

- **Manifest:** portable `SKILL.md` with required `name` and `description`;
  optional `agents/openai.yaml` adds OpenAI UI, policy, and dependency metadata.
- **Discovery:** repository ancestors, user, admin, then bundled/system scopes are
  all explicit. The public docs do not define one source as overriding another;
  they say same-name Skills are not merged and both can appear.
- **Symlinks:** explicitly supported for Skill directories.
- **Reserved/managed:** `/etc/codex/skills` is an administrator scope and bundled
  system Skills are runtime-owned. Foundry should discover them as read-only and
  never use either as its writable distribution target.
- **Compatibility:** the public recommendation is the shared
  `~/.agents/skills`, but current first-party source still reads the deprecated
  `$CODEX_HOME/skills` (normally `~/.codex/skills`). Its `.system` child is a
  runtime cache that Codex clears and replaces when bundled content changes.
  Foundry should inventory non-system legacy Skills for migration, never
  distribute there by default, and always exclude `.system`. Other clients
  scanning `.codex/skills` does not make it Codex's preferred user root.
  [Codex Skills][codex-skills] [Codex root source][codex-root-source]
  [Codex system cache source][codex-system-source]

### Claude Code

- **Manifest:** `SKILL.md` with YAML frontmatter and Markdown. Claude-specific
  extensions include invocation controls, subagent execution, and dynamic
  shell/context injection. Claude treats all frontmatter fields as optional
  and can derive the command from the directory, so a package missing the
  standard's required `name` can still be host-compatible.
- **Discovery and precedence:** enterprise > personal > project. Any of those
  overrides a bundled Skill; plugin Skills are namespaced. Parent project roots
  load at startup, while nested roots below CWD load after Claude accesses that
  subtree and receive directory-qualified names on collision.
- **Symlinks:** enterprise, personal, and project Skill entries may be symlinks;
  the same resolved target is loaded once.
- **Reserved/managed:** `synced` is reserved, case-insensitively, under
  enterprise, personal, and project Skill locations. Account-synced content is
  downloaded to `~/.claude/skills/synced` and is regenerated by sync. Bundled,
  synced, plugin, and enterprise roots should not be imported as ordinary
  Foundry-owned copies.
- **Security:** a Skill can execute dynamic `!` commands and include scripts.
  Claude's permissions documentation says project Skill hooks and
  `allowed-tools` participate before workspace trust, so Foundry must not treat
  that dialog as a general project-Skill trust gate. `--bare` disables project
  Skills; a Skill folder promoted to a plugin does require folder trust.
  Foundry must preserve these extensions, but v1 leaves review and trust
  decisions to the user and the target runtime.
  [Claude Code Skills][claude-skills] [Claude permissions][claude-permissions]

### Generic `.agents/skills` convention

- **Manifest:** exactly the portable Agent Skills package described above.
- **Roots:** the specification intentionally does not prescribe install roots.
  The official client implementation guide recommends both
  `~/.agents/skills` and `<project>/.agents/skills` as cross-client roots.
- **Precedence:** the implementation guide calls project-over-user the
  universal convention, but same-tier ordering is client-defined. This is
  guidance, not a normative specification rule.
- **Symlinks and reserved paths:** **unknown/not standardized**.
- **Security:** the guide recommends limiting traversal depth and directory
  count, skipping irrelevant trees, and requiring project trust before loading
  repository Skills. These are appropriate defaults for Foundry discovery.
  [Agent Skills implementation guide][agent-skills-guide]

### Hermes Agent

- **Manifest:** Agent Skills-compatible `SKILL.md`, with Hermes-specific fields
  such as categories, platform requirements, environment requirements, and
  config settings. Category-level `DESCRIPTION.md` files are not Skill package
  manifests.
- **Roots and precedence:** the active profile's `<HERMES_HOME>/skills` is
  Hermes' own source of truth. At the nearest ancestor containing `.git`,
  project `.hermes/skills` and `.agents/skills` override it; configured
  `skills.external_dirs` are lower priority. Named profiles change
  `HERMES_HOME`, so discovery cannot assume only `~/.hermes/skills`.
- **Mutation behavior:** Hermes explicitly allows its agent to modify or delete
  local Skills and to update Skills in external directories in place. A
  Foundry-distributed Hermes copy must therefore be treated as externally
  writable and monitored for drift.
- **Symlinks:** **unknown** as a supported public contract.
- **Reserved/managed:** `.hub/`, `.bundled_manifest`, `.usage.json`, and audit
  logs under the Skill root, plus `.no-bundled-skills` under the profile, are
  runtime metadata rather than Skill packages. Bundled sync preserves
  user-modified copies rather than blindly overwriting them.
- **Security:** project Skills require an explicit `hermes skills trust`
  decision and trusted roots are persisted in configuration. Hub installs are
  scanned for prompt injection, destructive commands, data exfiltration, and
  supply-chain risks. [Hermes Skills][hermes-skills]
  [profile path source][hermes-path-source]

### OpenClaw

- **Manifest:** Agent Skills `SKILL.md` plus OpenClaw-specific invocation,
  direct-tool dispatch, gating, binary/environment/config requirements, and
  `{baseDir}` semantics.
- **Precedence:** workspace `skills` > workspace `.agents/skills` > personal
  `.agents/skills` (default state only) > managed `<state-dir>/skills` > bundled
  > extra/plugin directories. Roots support grouped layouts, with discovery
  bounded to six levels.
- **Profiles/state:** when `OPENCLAW_STATE_DIR` is non-default, home-scoped
  compatibility roots such as `~/.agents/skills` are excluded. The adapter
  must resolve the active state directory instead of assuming `~/.openclaw`.
- **Symlinks:** managed and personal roots may contain symlinked Skill folders.
  Workspace, project, and extra roots reject targets outside the configured
  root unless `skills.load.allowSymlinkTargets` explicitly trusts them.
- **Reserved/managed:** bundled and plugin roots are runtime-owned;
  `.clawhub/origin.json` is install provenance and must be preserved.
- **Security:** official docs call third-party Skills untrusted code, provide
  verification/security scanning, and warn that a Skill allowlist is not a
  shell authorization boundary. [OpenClaw Skills][openclaw-skills]

### Gemini CLI

- **Manifest:** portable `SKILL.md`; `name` and `description` are required.
- **Precedence:** workspace > user > extension > built-in. Within either the
  workspace or user tier, `.agents/skills` overrides `.gemini/skills`.
- **Symlinks:** the documented `gemini skills link` workflow is implemented as
  a directory symlink (a junction on Windows), so linked Skill directories are
  a supported workflow. [Gemini Skills][gemini-skills]
  [link implementation][gemini-link-source]
- **Reserved/managed:** built-in and extension Skill tiers belong to Gemini or
  the extension manager, not Foundry's writable target.
- **Security:** remote installation requires source consent, and activation
  requires consent before the Skill directory is added to allowed file paths.
  A Foundry import must not imply either trust decision. [Gemini Skills][gemini-skills]

### OpenCode

- **Manifest:** Agent Skills-compatible `SKILL.md`; only `name`, `description`,
  `license`, `compatibility`, and string-map `metadata` are recognized.
- **Discovery:** all three user roots above are scanned. Project roots are
  searched while walking upward from CWD to the Git worktree.
- **Precedence:** **unknown as a stable public contract**. The current source
  logs duplicate names and assigns the later-loaded record; loading is
  concurrent, so Foundry should surface a collision instead of trying to model
  a reliable winner.
- **Symlinks:** current first-party source scans with symlink following enabled,
  but public docs do not promise this as a compatibility guarantee.
- **Reserved/managed:** the built-in `customize-opencode` Skill is runtime-owned.
- **Security:** per-Skill permission patterns support `allow`, `deny`, and
  `ask`, including per-agent overrides. [OpenCode Skills][opencode-skills]
  [OpenCode source][opencode-source]

### Cursor

- **Manifest:** Agent Skills `SKILL.md` with YAML frontmatter; Cursor also
  documents invocation-control extensions and recursive category directories.
- **Roots:** native `.cursor/skills` and shared `.agents/skills` at project and
  user scope. Cursor additionally scans `.claude/skills` and `.codex/skills`
  at both scopes. It can discover nested Skill roots inside a repository.
- **Precedence, symlink support:** **unknown** in the official documentation.
- **Reserved/managed:** built-in Cursor Skills are runtime-managed and appear
  beside user Skills; they are not a writable filesystem target.
- **Compatibility:** because Cursor scans several other clients' roots, a
  Skill distributed for Claude or the shared convention may also become visible
  in Cursor. Foundry must show that cross-runtime exposure before applying a
  distribution. [Cursor Skills][cursor-skills]

### GitHub Copilot

- **Manifest:** Agent Skills `SKILL.md` with required `name` and `description`;
  GitHub additionally documents `allowed-tools`. Scripts and resources live in
  the package directory.
- **Roots:** project `.github/skills`, `.claude/skills`, and `.agents/skills`;
  personal `~/.copilot/skills` and `~/.agents/skills`.
- **Precedence, symlink support:** **unknown** in official docs.
- **Reserved/managed:** Copilot built-in Skills are runtime-owned. `gh skill`
  adds upstream repository/ref/tree provenance to `SKILL.md` frontmatter;
  Foundry must preserve unknown/provenance keys during import and export.
- **Security:** GitHub warns that Skills are unverified and may contain prompt
  injection or malicious scripts. Pre-approving `shell`/`bash` via
  `allowed-tools` can remove execution confirmation; Foundry v1 preserves this
  metadata without making a safety judgment.
  [Copilot Skills overview][copilot-skills] [add Skills][copilot-add-skills]

### goose

- **Manifest:** Agent Skills `SKILL.md` with `name` and `description`.
- **Roots:** goose recommends global/project `.agents/skills`; it also supports
  project `.goose/skills` and `.claude/skills`, global `~/.claude/skills`,
  platform-specific config roots, and installed plugin roots for compatibility.
- **Precedence:** current first-party source scans project roots before global
  roots and keeps the first same-name Skill. Within a project the order is
  `.agents`, `.goose`, `.claude`; within user roots it begins with `.agents`.
- **Symlinks:** public docs are silent. Current source canonicalizes traversed
  directories and avoids revisiting a resolved target, which makes symlinked
  directories work in the present implementation; Foundry should not treat
  this as a permanent public guarantee.
- **Reserved/managed:** plugin and built-in Skill sources are runtime-owned.
  Plugin Skill names are namespaced.
- **Security:** supporting scripts become accessible through goose file tools;
  the Skills page does not document an install-time trust gate. Mark imported
  executable content untrusted by default. [goose Skills][goose-skills]
  [goose discovery source][goose-source]

## Recommended v1 adapter set

Implement physical targets directly and present generic versus native targets
separately:

1. **Generic Agent Skills target**: writable `~/.agents/skills`, presented with
   neutral Agent Skills branding. This is one physical target regardless of
   which runtimes consume it.
2. **Claude Code**: writable `~/.claude/skills`; discover `synced`, enterprise,
   and plugin content as read-only/foreign-managed.
3. **Hermes Agent**: resolve every profile's `<HERMES_HOME>/skills`; preserve
   Hermes metadata and expect in-place runtime edits.
4. **OpenClaw**: resolve the active `<state-dir>/skills`; model default versus
   custom state and its strict symlink containment.
5. **Native opt-in roots**: `~/.gemini/skills`,
   `~/.config/opencode/skills`, `~/.cursor/skills`, and
   `~/.copilot/skills`. These provide per-runtime distribution when the shared
   root would expose a Skill too broadly.
6. **Codex Legacy target**: discover `$CODEX_HOME/skills`, always exclude its
   `.system` child, place it last in target selection, and label it with an
   official Legacy hint linking to the [Codex Skills documentation][codex-skills].

Project adapters should follow later. Their discovery and trust behavior is
substantially different across runtimes and should not be approximated by one
recursive scanner.

## Foundry compatibility rules implied by the evidence

- Key Store packages by Foundry UUID, but parse and validate the runtime-facing
  `name` separately. Block same-name distribution into one physical target.
- De-duplicate physical roots by resolved path before scanning or distributing.
- Preserve the entire package tree and unknown frontmatter. Do not reduce a
  Skill to `SKILL.md`.
- Treat built-in, plugin, enterprise/admin, synced, and registry-provenance
  content as foreign-managed until the user explicitly imports a copy.
- Hash resolved regular-file content with an explicit containment policy.
  Record symlink metadata separately; never follow an untrusted link outside a
  discovery root merely to compute a fingerprint.
- A runtime's trust/consent decision is not transferable. Importing or
  distributing a Skill through Foundry must not silently mark it trusted in
  Gemini, Hermes, OpenClaw, Claude Code, or Copilot.
- Preserve runtime-specific fields and package files without claiming that a
  package is portable or compatible. OpenClaw, Hermes, Claude, and other
  extensions must survive round trips even when other runtimes ignore them.

[agent-skills-spec]: https://agentskills.io/specification
[agent-skills-guide]: https://agentskills.io/client-implementation/adding-skills-support
[codex-skills]: https://developers.openai.com/codex/skills
[codex-root-source]: https://github.com/openai/codex/blob/main/codex-rs/ext/skills/src/host_roots.rs
[codex-system-source]: https://github.com/openai/codex/blob/main/codex-rs/skills/src/lib.rs
[claude-skills]: https://code.claude.com/docs/en/skills
[claude-permissions]: https://code.claude.com/docs/en/permissions#project-allow-rules-and-workspace-trust
[hermes-skills]: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
[hermes-path-source]: https://github.com/NousResearch/hermes-agent/blob/acc614e72fa6b635a19e5eddbc29ed147147a090/hermes_constants.py#L53-L74
[openclaw-skills]: https://docs.openclaw.ai/tools/skills
[gemini-skills]: https://geminicli.com/docs/cli/skills
[gemini-link-source]: https://github.com/google-gemini/gemini-cli/blob/24cc26ccb15522b55c4f8a63b2f894fb99b8e82a/packages/cli/src/utils/skillUtils.ts#L208-L283
[opencode-skills]: https://opencode.ai/docs/skills
[opencode-source]: https://github.com/anomalyco/opencode/blob/4e81a0b73f6e614afebf9c7ff8862904a3674455/packages/opencode/src/skill/index.ts#L104-L163
[cursor-skills]: https://cursor.com/docs/context/skills
[copilot-skills]: https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
[copilot-add-skills]: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
[goose-skills]: https://goose-docs.ai/docs/guides/context-engineering/using-skills
[goose-source]: https://github.com/block/goose/blob/7c4ba2219166700becb68d6db35989ebcaa52f69/crates/goose/src/skills/mod.rs#L318-L495
