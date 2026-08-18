# Separate Skill identity from sources

Foundry assigns every Skill Package a stable Skill ID that is independent of remote coordinates, names, and content fingerprints. Identical imported content may associate multiple Skill Sources with one package, each source tracks updates independently, and losing or removing every source leaves a manageable Local Package rather than deleting it; this avoids duplicating the same package while preserving exact provenance and local ownership.
