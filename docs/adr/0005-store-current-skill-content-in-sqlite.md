---
status: accepted
supersedes: ADR-0001, ADR-0003, ADR-0004
---

# Store current Skill content in SQLite

Foundry stores exactly one current content payload for each Skill Package as a versioned, deterministic ZIP BLOB in the existing SQLite database. Foundry is the only supported writer: Store content has no editable filesystem representation, Local Packages are import snapshots, and Remote Packages change only through an explicit Update. This boundary prevents accidental edits but does not claim confidentiality or protection from a malicious process running as the same operating-system user.

The Store does not retain Skill Revisions, Distribution Record history, content observations, drift state, repair state, or persistent Update Candidates. A Skill Installation records only the Content Fingerprint most recently distributed by Foundry; Targets are treated as stable projections and are inspected only by explicit Import or filesystem mutations. Package listing is metadata-only, while content reads and Distribution decode the selected BLOB and fail with Store Corruption when its logical fingerprint does not match.

This replaces readable Store directories and content-addressed Revision designs because both require additional filesystem/database coordination without serving a current product requirement. Local encryption was rejected because a key available to Foundry is also recoverable by the same local user. The current corpus is small enough for one compressed BLOB per package: 214 active packages occupy 19.65 MiB uncompressed and approximately 4.2-5.2 MiB compressed, with a 2.11 MiB maximum package.

## Consequences

- Store writes are atomic SQLite replacements with last-write-wins semantics; there is no content rollback or local editing workflow.
- Standard ZIP remains recoverable and inspectable with ordinary tooling when explicitly extracted from SQLite; opacity, permissions, and integrity checks prevent accidental editing rather than supplying a security boundary.
- Distribution uses verified temporary staging but does not maintain a persistent rollback journal. A failed Target projection can be recreated from Store.
- Delete removes all associated Target projections before moving the Package to logical Trash. Remove from Foundry hides the row without physically deleting its BLOB.
- Store and Target scans leave page entry. `Import Existing` remains the explicit scan boundary, and Remote Update never distributes automatically.
