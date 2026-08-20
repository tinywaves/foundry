import type {
  SkillDiscoveryResult,
  SkillDiscoveryWarningCode,
  SkillTargetView,
} from '../../../../shared/skill-contract';

export type SkillImportIssueCode = SkillDiscoveryWarningCode | 'root-unreadable';

export interface SkillImportIssue {
  id: string;
  targetName: string;
  rootPath: string;
  relativePath: string | null;
  code: SkillImportIssueCode;
  title: string;
  description: string;
}

const warningPresentations: Record<
  SkillDiscoveryWarningCode,
  Pick<SkillImportIssue, 'title' | 'description'>
> = {
  'entry-unreadable': {
    title: 'Directory entry couldn\'t be read',
    description: 'Foundry could not inspect this directory entry.',
  },
  'symlink-escape-blocked': {
    title: 'Symbolic link was skipped',
    description: 'The link points outside this Target and external links are not allowed.',
  },
  'traversal-limit-reached': {
    title: 'Scan limit was reached',
    description: 'The scan reached its directory limit before it could finish.',
  },
  'candidate-unreadable': {
    title: 'Skill Package couldn\'t be read',
    description: 'Foundry recognized a Skill Package but could not inspect its contents.',
  },
  'candidate-reconciliation-failed': {
    title: 'Skill Package couldn\'t be imported',
    description: 'The package could not be imported or matched to the Skill Store.',
  },
};

export function getSkillImportWarningCount(result: SkillDiscoveryResult): number {
  return result.warnings.length + result.rootFailures.length;
}

export function describeSkillImportIssueLocation(issue: SkillImportIssue): string {
  if (!issue.relativePath) {
    return issue.rootPath;
  }

  if (issue.rootPath === 'Unknown location') {
    return `${issue.targetName}: ${issue.relativePath}`;
  }

  const separator = issue.rootPath.includes('\\') && !issue.rootPath.includes('/')
    ? '\\'
    : '/';
  const rootPath = issue.rootPath.replace(/[\\/]+$/, '');
  const relativePath = issue.relativePath.replace(/^[\\/]+/, '');
  const issuePath = rootPath
    ? `${rootPath}${separator}${relativePath}`
    : `${separator}${relativePath}`;
  return issuePath;
}

export function describeSkillImport(result: SkillDiscoveryResult): string {
  const warningCount = getSkillImportWarningCount(result);
  const summary = `Imported ${result.packagesImported} and adopted ${result.installationsAdopted}.`;
  if (warningCount > 0) {
    const warningLabel = warningCount === 1 ? 'warning needs' : 'warnings need';
    return `${summary} ${warningCount} scan ${warningLabel} attention.`;
  }
  const targetCount = result.roots.length;
  return `${summary} Checked ${targetCount} ${targetCount === 1 ? 'target' : 'targets'}.`;
}

export function buildSkillImportIssues(
  result: SkillDiscoveryResult,
  targets: readonly SkillTargetView[],
): SkillImportIssue[] {
  const targetById = new Map(targets.map((target) => [target.id, target]));
  const rootByTargetId = new Map(result.roots.map((root) => [root.targetId, root]));
  const issues = result.warnings.map((warning, index): SkillImportIssue => {
    const target = targetById.get(warning.targetId);
    const root = rootByTargetId.get(warning.targetId);
    return {
      id: `warning:${warning.targetId}:${warning.relativePath ?? 'root'}:${warning.code}:${index}`,
      targetName: target?.displayName ?? 'Distribution Target',
      rootPath: root?.rootPath ?? target?.configuredPath ?? 'Unknown location',
      relativePath: warning.relativePath,
      code: warning.code,
      ...warningPresentations[warning.code],
    };
  });

  for (const failure of result.rootFailures) {
    const target = targetById.get(failure.targetId);
    const root = rootByTargetId.get(failure.targetId);
    issues.push({
      id: `root:${failure.targetId}`,
      targetName: target?.displayName ?? 'Distribution Target',
      rootPath: root?.rootPath ?? target?.configuredPath ?? 'Unknown location',
      relativePath: null,
      code: 'root-unreadable',
      title: 'Target couldn\'t be read',
      description: 'Foundry could not inspect this Target location.',
    });
  }

  return issues;
}
