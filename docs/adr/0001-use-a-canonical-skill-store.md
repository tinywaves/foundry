---
status: superseded by ADR-0005
---

# Use a canonical Skill Store

Foundry imports Skill Packages into a canonical local Skill Store and distributes physical copies to runtime-owned locations. This keeps package identity and revision history under Foundry's control while allowing runtimes and other tools to modify their local copies; Distribution Records connect successful synchronizations back to exact Skill Revisions while current Store and Target observations show whether the copies still match. Remote sources may only add packages to the Skill Store, and every runtime copy must be created through Foundry's internal distribution flow.
