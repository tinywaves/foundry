import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SkillPackageFileEntry } from '../../../../shared/skill-contract';
import {
  abbreviateSkillId,
  buildSkillFileTree,
  getEmptySkillTrashDescription,
  getInitialSkillFile,
  getSkillFileLanguage,
  isSkillFileSelectable,
  parseSkillDetailTab,
  shouldExitMissingSkillDetail,
  skillDetailTabs,
} from './skill-detail-model';

test('publishes current-content package detail tabs without Revisions', () => {
  assert.deepEqual(skillDetailTabs.map((tab) => tab.value), [
    'overview',
    'files',
    'installations',
    'sources',
  ]);
  assert.equal(parseSkillDetailTab('files'), 'files');
  assert.equal(parseSkillDetailTab('revisions'), 'overview');
});

test('builds a stable package tree from bounded relative entries', () => {
  const entries: SkillPackageFileEntry[] = [
    { relativePath: 'references/nested', kind: 'directory', size: null },
    { relativePath: 'SKILL.md', kind: 'file', size: 10 },
    { relativePath: 'references', kind: 'directory', size: null },
    { relativePath: 'references/nested/example.txt', kind: 'file', size: 4 },
    { relativePath: 'link', kind: 'symbolic-link', size: null },
  ];

  const tree = buildSkillFileTree(entries);
  assert.deepEqual(tree.map((node) => node.id), ['link', 'references', 'SKILL.md']);
  assert.deepEqual(tree[1]?.children?.map((node) => node.id), ['references/nested']);
  assert.equal(getInitialSkillFile(entries), 'SKILL.md');
  assert.equal(isSkillFileSelectable('directory'), false);
  assert.equal(isSkillFileSelectable('symbolic-link'), true);
});

test('formats current detail metadata and logical removal copy', () => {
  assert.equal(abbreviateSkillId('1234567890abcdef'), '1234567890ab');
  assert.equal(getSkillFileLanguage('references/example.ts'), 'typescript');
  assert.equal(getSkillFileLanguage('LICENSE'), 'plaintext');
  assert.equal(shouldExitMissingSkillDetail('not-found'), true);
  assert.equal(shouldExitMissingSkillDetail('store-corrupt'), false);
  assert.equal(
    getEmptySkillTrashDescription(3),
    '3 Skill Packages will be removed from Foundry.',
  );
});
