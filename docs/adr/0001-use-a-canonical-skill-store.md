# Use a canonical Skill Store

Foundry imports Skill Packages into a canonical local Skill Store and distributes physical copies to runtime-owned locations. This keeps package identity and revision history under Foundry's control while allowing runtimes and other tools to modify their local copies; Distribution Records connect those copies back to exact Skill Revisions so Foundry can detect drift without treating runtime directories as authoritative. Remote sources may only add packages to the Skill Store, and every runtime copy must be created through Foundry's internal distribution flow.
