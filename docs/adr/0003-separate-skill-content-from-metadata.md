---
status: superseded by ADR-0005
---

# Separate Skill content from metadata

Foundry stores current Skill Package content, immutable Skill Revisions, and recoverable Store deletions under `~/.foundry/skills-store/`, using stable Skill IDs for package directories. The existing SQLite database stores identities, sources, fingerprints, revision records, and distribution state rather than Skill file contents; Revision snapshots are created only at import, remote update, distribution, and promotion boundaries so external editor saves do not inflate history.
