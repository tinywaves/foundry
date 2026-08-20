---
status: superseded by ADR-0005
---

# Treat Distribution as target synchronization

Foundry treats a user's explicit Distribution command as authorization to make the selected Skill Package's destination match its current Store Working Copy. An absent destination is copied, an identical destination requires no file replacement, and every other existing destination is atomically replaced regardless of prior Installation identity, unmanaged content, or readability; containment, Store readability, Target writability, verified staging, backup, and compensation remain mandatory safety boundaries. Distribution Records preserve history but do not decide whether synchronization may proceed or classify which side changed.
