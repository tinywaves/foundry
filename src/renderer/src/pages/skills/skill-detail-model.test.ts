import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SkillPackageFileEntry } from '../../../../shared/skill-contract';
import {
  abbreviateSkillId,
  buildSkillFileTree,
  canMoveSkillPackageToTrash,
  getEmptySkillTrashDescription,
  getInitialSkillFile,
  getRevisionReasonLabel,
  getSkillFileLanguage,
  isSkillFileSelectable,
  parseSkillDetailTab,
  shouldExitMissingSkillDetail,
  skillDetailTabs,
} from './skill-detail-model';

test('publishes the complete package detail tab vocabulary', () => {
  assert.deepEqual(skillDetailTabs.map((tab) => tab.value), [
    'overview',
    'files',
    'revisions',
    'installations',
    'sources',
  ]);
  assert.equal(parseSkillDetailTab('revisions'), 'revisions');
  assert.equal(parseSkillDetailTab('unknown'), 'overview');
});

test('builds a stable package tree from bounded relative entries', () => {
  const entries: SkillPackageFileEntry[] = [
    { relativePath: 'references/nested', kind: 'directory', size: null },
    { relativePath: 'SKILL.md', kind: 'file', size: 10 },
    { relativePath: 'references', kind: 'directory', size: null },
    { relativePath: 'references/nested/example.txt', kind: 'file', size: 4 },
    { relativePath: 'link', kind: 'symbolic-link', size: null },
  ];

  assert.deepEqual(buildSkillFileTree(entries), [
    {
      id: 'link',
      label: 'link',
      entry: entries[4],
    },
    {
      id: 'references',
      label: 'references',
      entry: entries[2],
      children: [
        {
          id: 'references/nested',
          label: 'nested',
          entry: entries[0],
          children: [
            {
              id: 'references/nested/example.txt',
              label: 'example.txt',
              entry: entries[3],
            },
          ],
        },
      ],
    },
    {
      id: 'SKILL.md',
      label: 'SKILL.md',
      entry: entries[1],
    },
  ]);
  assert.equal(getInitialSkillFile(entries), 'SKILL.md');
  assert.equal(isSkillFileSelectable('directory'), false);
  assert.equal(isSkillFileSelectable('symbolic-link'), true);
});

test('formats stable detail metadata and guarded actions', () => {
  assert.equal(abbreviateSkillId('1234567890abcdef'), '1234567890ab');
  assert.equal(getRevisionReasonLabel('promotion'), 'Promotion');
  assert.equal(getSkillFileLanguage('references/example.ts'), 'typescript');
  assert.equal(getSkillFileLanguage('LICENSE'), 'plaintext');
  assert.equal(canMoveSkillPackageToTrash(0), true);
  assert.equal(canMoveSkillPackageToTrash(1), false);
  assert.equal(shouldExitMissingSkillDetail('not-found'), true);
  assert.equal(shouldExitMissingSkillDetail('filesystem-unavailable'), false);
  assert.equal(
    getEmptySkillTrashDescription(1),
    '1 Skill Package will be removed permanently. This cannot be undone.',
  );
  assert.equal(
    getEmptySkillTrashDescription(3),
    '3 Skill Packages will be removed permanently. This cannot be undone.',
  );
});
