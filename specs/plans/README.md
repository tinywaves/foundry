# Implementation Plans

Save all implementation plans in this directory.

## File Naming

Use this filename format:

```text
NNN_module_plan-name.md
```

- `NNN` is a zero-padded three-digit sequence number beginning with `001`.
- `module` is a concise lowercase identifier for the affected module. Use
  hyphens for multiple words.
- `plan-name` is a descriptive lowercase name with words joined by hyphens.
- Use underscores only between the number, module, and plan name.

For each new plan, increment the highest existing sequence number. Do not
reuse missing numbers or renumber existing plans.

Examples:

```text
001_web_initial-dashboard.md
002_cli_static-server-errors.md
003_build-config_production-output.md
```

## Required Dependency Section

Every plan must include a **Dependency Changes** section with exactly these
four items. Use `None` when no changes are required:

1. Dependencies to remove
2. Dev dependencies to remove
3. Dependencies to add
4. Dev dependencies to add
