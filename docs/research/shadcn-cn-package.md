# shadcn `cn` package adoption

Date: 2026-09-08

## Conclusion

`cn` is now the official shadcn/ui default, not merely a package published by
the project's author. Since `shadcn` CLI 4.21.0, `shadcn init` installs `cn`,
generates `lib/utils.ts` as a one-line re-export, and registry components import
`cn` directly from the package. The live Base Mira registry also declares `cn`
as a dependency and emits `import { cn } from "cn"`.

For existing Tailwind CSS v4 projects, shadcn explicitly supports and documents
`npx shadcn@latest migrate cn`. This is a recommended and supported migration,
but it is not mandatory: the official changelog says existing local helpers
continue to work.

Foundry is eligible for the migration: the app currently uses Tailwind CSS
4.3.3, `tailwind-merge` 3.6.0, `clsx` 2.1.1, and the traditional local helper in
`app/src/lib/utils.ts`. There are currently 27 imports from `#/lib/utils`, all
under `app/src/components/ui`. If the project wants to follow the current
shadcn default, it should migrate the whole app coherently rather than
rewriting one newly generated component at a time.

## Evidence

### Package ownership and maturity

- The package source is hosted under the `shadcn-ui` GitHub organization. Its
  README says it is built and maintained by Aiden Bai and shadcn, replaces
  `clsx` plus `tailwind-merge`, and can be used immediately as a drop-in
  replacement.
- npm lists `shadcn` as the maintainer. The current release is 0.2.6, published
  2026-09-06. The current implementation is therefore official but still a
  young 0.x package with several patch releases in its first week.
- The repository is separate from the main `shadcn-ui/ui` repository. That
  distinction does not make it an unofficial personal package: the official
  CLI and registry now depend on it.

### Official default generation

- The `shadcn` 4.21.0 changelog states that `init` now installs `cn`, generates
  `export { cn } from "cn"` in `lib/utils`, and makes registry components import
  from `cn`.
- The September 2026 official changelog says: “Every shadcn component now
  imports `cn` from the `cn` package.” It also explains that registry items
  declare the dependency so `shadcn add` installs it in older projects.
- The live `base-mira/button` registry response declares `cn` in its
  dependencies and imports it directly. This is the same style configured by
  Foundry.

### Existing-project migration

- The official CLI documentation provides `npx shadcn@latest migrate cn`. It
  rewrites supported imports and standard helpers, installs `cn`, and removes
  old packages only when no references remain.
- The migration is scoped to Tailwind CSS v4 and `tailwind-merge` v3. Official
  documentation tells Tailwind CSS v3 projects to remain on
  `tailwind-merge` v2.
- The official changelog explicitly says existing projects do not break and
  can keep their local helper. Therefore “officially recommended/supported”
  should not be read as a forced migration or deprecation deadline.

## Recommendation for Foundry

Adopt `cn`, preferably by running the official migration and then reviewing its
diff. Keep `app/src/lib/utils.ts` as `export { cn } from "cn"` if preserving the
existing `#/lib/utils` project import boundary is desirable; newly generated
registry components may import from `cn` directly. Remove `clsx` and
`tailwind-merge` only after confirming there are no remaining direct imports.

The main trade-off is maturity rather than official status: `cn` is at 0.2.x
and has received rapid fixes. Projects prioritizing dependency stability over
alignment with current shadcn output can reasonably wait, because the old
helper remains supported.

## Primary sources

- [`cn` repository and README](https://github.com/shadcn-ui/cn)
- [`cn` 0.2.6 release](https://github.com/shadcn-ui/cn/releases/tag/cn%400.2.6)
- [`cn` npm package](https://www.npmjs.com/package/cn)
- [shadcn September 2026 `cn` changelog](https://ui.shadcn.com/docs/changelog/2026-09-cn)
- [shadcn CLI `migrate cn` documentation](https://ui.shadcn.com/docs/cli#migrate-cn)
- [shadcn 4.21.0 source changelog](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/CHANGELOG.md#4210)
- [shadcn change making `cn` the init/registry default](https://github.com/shadcn-ui/ui/commit/c257f688cf4de7ec10cc1be84cad29cd4631182c)
- [Live Base Mira button registry item](https://ui.shadcn.com/r/styles/base-mira/button.json)
