# Task 001: Build the Versioned Skill Package Codec

## Status

`completed`

## Goal

Create one bounded codec that converts a Recognized Skill Package between its filesystem tree and the versioned ZIP BLOB used by the Skill Store.

## Work

Add a main-process codec with explicit operations to encode a package root, inspect or read a validated BLOB, and materialize a validated BLOB into an empty destination. Resolve a symbolic-link package root to its physical directory before traversal. Traverse that directory with `lstat`: retain internal symbolic links as links, never follow them, include empty directories, and reject sockets, devices, invalid UTF-8 paths, duplicate normalized paths, traversal, and a missing root `SKILL.md`.

Use `yazl` as a runtime dependency for ZIP writing and the existing `yauzl` dependency for reading. Add entries in byte-sorted path order, use a fixed timestamp, omit comments, normalize directory and link modes, and retain only the regular-file executable bit as meaningful permission data. Encode links as link-target bytes with the Unix symbolic-link file type. Fingerprint the logical entry stream rather than ZIP bytes and introduce an explicit v2 serialized fingerprint so legacy v1 values cannot compare equal accidentally.

Enforce the Store bounds before and during encoding and decoding: at most 20,000 entries and 64 MiB of total uncompressed regular-file and link-target bytes. Validate ZIP CRCs, declared and emitted sizes, external Unix file types, path containment, and the total output before materializing content. Source-specific acquisition policies may impose smaller bounds.

Replace duplicated package-tree framing in the existing fingerprint helper with the codec's canonical logical-entry representation. Keep the APIs independent of SQLite, Electron, renderer modules, and Store lifecycle policy.

## Acceptance Criteria

- [x] Encoding the same logical tree twice produces byte-identical ZIP payloads and the same v2 Content Fingerprint.
- [x] Round trips preserve file bytes, empty directories, internal symbolic-link targets, and executable bits.
- [x] A symbolic-link package root encodes the resolved entity tree rather than the root link.
- [x] Paths, duplicates, unsupported types, malformed modes, CRC failures, and size or entry limit violations fail before an unsafe tree is materialized.
- [x] Fingerprint v2 changes for path, entry-kind, bytes, link-target, or executable-bit changes and ignores timestamps and non-executable permission bits.
- [x] Focused tests cover deterministic encoding, all supported entries, every rejection class, and boundary values.

## Verification

- `pnpm test -- src/main/skills/skill-package-codec.test.ts src/main/skills/skill-package-fingerprint.test.ts`
- `pnpm typecheck:node`
- `pnpm lint`
