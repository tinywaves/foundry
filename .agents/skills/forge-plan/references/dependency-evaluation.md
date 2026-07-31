# Dependency Evaluation

Use this process before recommending any new third-party dependency in a task design.

## Mandatory Order

1. Confirm the requirement cannot be satisfied cleanly by the language, runtime, framework, or dependencies already present in the repository.
2. Identify current candidates from official ecosystem sources.
3. Research every serious candidate online using current information.
4. Compare candidates against the project runtime and the task's actual needs.
5. Record the selected dependency and rejected alternatives in the task document.

Do not rely on model memory for versions, release activity, download counts, compatibility, or security status.

## Required Sources

Prefer primary and authoritative sources:

- official package registry metadata and download statistics
- official repository, releases, tags, and issue tracker
- official documentation and migration guides
- official runtime or framework compatibility documentation
- authoritative security advisory databases
- official license metadata

Record the exact date the sources were checked. Use direct source links or citations when the environment supports them.

## Evaluation Criteria

Evaluate each serious candidate on:

- **Fit:** Solves the required problem without broad, unrelated capability.
- **Existing stack:** Integrates with the repository's package manager, runtime, module system, framework, and build pipeline.
- **Maintenance:** Recent releases, active maintainers, issue response, and a credible release history.
- **Adoption:** Downloads, repository stars, dependents, and ecosystem use compared with similar candidates.
- **Modern packaging:** ESM or a well-maintained dual package, explicit exports, modern runtime targets, and no reliance on deprecated platform behavior.
- **TypeScript:** Bundled, accurate types or clearly maintained declarations.
- **Compatibility:** Supports the repository's current Node.js, TypeScript, framework, bundler, desktop runtime, and target platforms.
- **Security:** No unresolved critical advisories or concerning install-time behavior.
- **License:** Compatible with the project.
- **Operational cost:** Bundle size, native modules, packaging complexity, transitive dependency weight, and upgrade burden.
- **API quality:** Clear documentation, stable contracts, and a migration path.

Treat stars and downloads as comparative evidence, not mechanical pass/fail thresholds. Require stronger technical justification for a niche dependency with lower adoption.

## Modernity Gate

For JavaScript and TypeScript projects, reject a CommonJS-only package when a maintained ESM or dual-package alternative can satisfy the requirement. High historical downloads do not compensate for obsolete packaging, abandoned maintenance, incompatible runtime assumptions, or deprecated APIs.

Do not reject an otherwise suitable package merely because it supports CommonJS in addition to ESM.

## Decision Record

For each selected dependency, record:

- purpose and exact capability used
- selected current version or compatible range
- latest release date
- module format and TypeScript support
- runtime and framework compatibility
- maintenance and adoption evidence
- security and license findings
- important packaging or performance costs
- alternatives considered and concrete rejection reasons
- official sources and access date

If no candidate passes, recommend implementing the narrow capability locally or changing the task design. Do not select the least-bad package merely to avoid writing code.

## Execution Guard

Execution approval covers only dependencies already evaluated and recorded in the approved task. If a new dependency becomes necessary during implementation, pause, perform this evaluation, update the task after confirmation, and request execution confirmation again.
