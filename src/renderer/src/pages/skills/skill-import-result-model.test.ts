import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillDiscoveryResult,
  SkillDiscoveryWarningCode,
  SkillTargetView,
} from '../../../../shared/skill-contract';
import {
  buildSkillImportIssues,
  describeSkillImport,
  describeSkillImportIssueLocation,
  getSkillImportWarningCount,
} from './skill-import-result-model';

const target: SkillTargetView = {
  id: 'target-1',
  kind: 'custom',
  displayName: 'Team Skills',
  configuredPath: '/targets/team-skills',
  documentationUrl: null,
  brandingKey: 'custom',
  hint: null,
  builtIn: false,
  writable: true,
  enabled: true,
  policySource: 'user-override',
  maxScanDepth: 4,
  allowSymlinkEscape: false,
  sortOrder: 1,
};

function createResult(
  warningCodes: readonly SkillDiscoveryWarningCode[],
): SkillDiscoveryResult {
  return {
    roots: [
      {
        targetId: target.id,
        rootPath: target.configuredPath,
        status: 'scanned',
        packagesFound: 2,
        truncated: false,
      },
    ],
    rootsInspected: 1,
    packagesFound: 2,
    packagesImported: 1,
    installationsAdopted: 1,
    warnings: warningCodes.map((code, index) => ({
      targetId: target.id,
      relativePath: index === 2 ? null : `skill-${index}`,
      code,
    })),
    rootFailures: [],
  };
}

test('describes successful imports without warning details', () => {
  const result = createResult([]);

  assert.equal(getSkillImportWarningCount(result), 0);
  assert.equal(
    describeSkillImport(result),
    'Imported 1 and adopted 1. Checked 1 target.',
  );
  assert.deepEqual(buildSkillImportIssues(result, [target]), []);
});

test('builds readable details for every candidate warning code', () => {
  const warningCodes: SkillDiscoveryWarningCode[] = [
    'entry-unreadable',
    'symlink-escape-blocked',
    'traversal-limit-reached',
    'candidate-unreadable',
    'candidate-reconciliation-failed',
  ];
  const result = createResult(warningCodes);
  const issues = buildSkillImportIssues(result, [target]);

  assert.equal(getSkillImportWarningCount(result), warningCodes.length);
  assert.equal(
    describeSkillImport(result),
    'Imported 1 and adopted 1. 5 scan warnings need attention.',
  );
  assert.deepEqual(issues.map((issue) => issue.code), warningCodes);
  assert.equal(issues.every((issue) => issue.targetName === target.displayName), true);
  assert.equal(issues.every((issue) => issue.rootPath === target.configuredPath), true);
  assert.equal(issues[2]?.relativePath, null);
});

test('includes unreadable Target roots while retaining result paths without Target metadata', () => {
  const result = createResult([]);
  result.roots = [
    {
      targetId: 'unknown-target',
      rootPath: '/targets/unreadable',
      status: 'unreadable',
      packagesFound: 0,
      truncated: false,
    },
  ];
  result.rootFailures = [{ targetId: 'unknown-target', status: 'unreadable' }];

  assert.equal(getSkillImportWarningCount(result), 1);
  assert.equal(
    describeSkillImport(result),
    'Imported 1 and adopted 1. 1 scan warning needs attention.',
  );
  assert.deepEqual(buildSkillImportIssues(result, []), [
    {
      id: 'root:unknown-target',
      targetName: 'Distribution Target',
      rootPath: '/targets/unreadable',
      relativePath: null,
      code: 'root-unreadable',
      title: 'Target couldn\'t be read',
      description: 'Foundry could not inspect this Target location.',
    },
  ]);
});

test('describes one compact issue location across filesystem path styles', () => {
  const issue = buildSkillImportIssues(createResult(['symlink-escape-blocked']), [target])[0];
  assert.ok(issue);

  assert.equal(
    describeSkillImportIssueLocation(issue),
    '/targets/team-skills/skill-0',
  );
  assert.equal(
    describeSkillImportIssueLocation({
      ...issue,
      rootPath: String.raw`C:\Users\foundry\skills`,
      relativePath: String.raw`\example-skill`,
    }),
    String.raw`C:\Users\foundry\skills\example-skill`,
  );
  assert.equal(
    describeSkillImportIssueLocation({
      ...issue,
      rootPath: '/targets/team-skills',
      relativePath: null,
    }),
    '/targets/team-skills',
  );
  assert.equal(
    describeSkillImportIssueLocation({
      ...issue,
      rootPath: 'Unknown location',
      relativePath: 'example-skill',
    }),
    'Team Skills: example-skill',
  );
});
