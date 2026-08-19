# Task 001: Simplify Installation Synchronization State

## Status

`completed`

## Goal

Replace Distribution-baseline state derivation with a direct current Store-to-Target synchronization relationship.

## Work

Replace `SkillInstallationFacts`, `SkillInstallationStateResult`, and `deriveInstallationState` with a current synchronization contract that consumes Store and Target content observations only. Its derived `syncStatus` distinguishes `synced`, `different`, and `unknown`; missing and unreadable target facts remain available through the existing Target observation rather than becoming change-origin categories.

Keep each `SkillInstallationView` self-contained by exposing the current Store observation, current Target observation, latest Distribution Record when one exists, and derived synchronization state. A Distribution Record remains presentation history and does not participate in current state derivation.

Update pure shared tests for equal, different, missing, and unavailable observations. Update the main service mapping and service tests so a Store change makes the Installation `different` without consulting the historical baseline.

## Acceptance Criteria

- [x] Installation synchronization compares only current Store and Target observations.
- [x] `outdated`, `drifted`, `diverged`, and baseline-unavailable results leave the shared contract.
- [x] Missing and unreadable observations remain explicit facts.
- [x] Distribution Records remain available as immutable history.
- [x] Pure tests cover every synchronization result.

## Verification

- `pnpm test` passed with 60 test files and 304 tests.
- `pnpm typecheck` passed for the Node and renderer projects.
