# Encrypted data export and import

Status: the earlier design is superseded by the current
[data export and import contract](../data-export.md).

The old implementation used `foundry.snapshot` version 3, a maintenance gate,
active-job blocking, and staged import previews. Those services and routes have
been removed. Their behavior is historical, not a compatibility promise for the
current import flow.

Current export and import use separate data-export and data-import features,
`foundry.data` version 2, direct transactional replacement, and shared archive
and encryption utilities. The AES-256-GCM envelope is preserved. CLI entry points
are `foundry settings export` and `foundry settings import`; there is no root
`data-transfer` command group.

The current payload contains normalized settings, including retained backend
feature settings, instruction records, and agent assignment profiles. External
agent instruction files, provider, capture, and job records are outside it. The
payload can grow with future supported application data; placing its controls in
Advanced does not restrict the architecture to the four visible settings fields.

The linked contract is authoritative for normalization, validation, temporary
files, replacement semantics, and Web reload behavior.
