import assert from 'node:assert/strict';
import { test } from 'vitest';
import { FoundryStorageError } from '../storage/storage-error';
import { SkillOperationError, toSkillOperationError } from './skill-error';

test('preserves Skills errors and maps storage, filesystem, and unknown failures safely', () => {
  const conflict = new SkillOperationError('conflict', 'Distribution Name is occupied.');
  assert.equal(toSkillOperationError(conflict), conflict);

  assert.deepEqual(
    toSkillOperationError(new FoundryStorageError(
      'unsupported-database-version',
      'Foundry storage was created by a newer Foundry version.',
    )).toApiError(),
    {
      code: 'unsupported-database-version',
      message: 'Foundry storage was created by a newer Foundry version.',
    },
  );

  const sensitivePath = '/private/sensitive/skill';
  const filesystemError = Object.assign(new Error(`EACCES: ${sensitivePath}`), {
    code: 'EACCES',
  });
  const mappedFilesystemError = toSkillOperationError(filesystemError);
  assert.equal(mappedFilesystemError.code, 'filesystem-unavailable');
  assert.equal(mappedFilesystemError.message.includes(sensitivePath), false);

  const sensitiveMessage = 'unexpected secret content';
  const internalError = toSkillOperationError(new Error(sensitiveMessage));
  assert.equal(internalError.code, 'internal');
  assert.equal(internalError.message.includes(sensitiveMessage), false);
});
