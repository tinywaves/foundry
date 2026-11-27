# Encrypted data export and import

Status: superseded by the current [data export and import design](../data-export.md).

The earlier design used `foundry.snapshot` version 3, a workspace maintenance
gate, active-job blocking and staged import previews. Those services and routes
have been removed. Web and CLI now use `data-export` and `data-import` with
`foundry.data` version 1, direct transactional replacement and shared archive /
encryption utilities. The authenticated AES-256-GCM envelope is preserved.

The CLI retains `data-transfer export/import` as command names. There are no
status or inspect commands. The current data contract contains settings and
will expand as current application features are implemented.
