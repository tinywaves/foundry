import { BUNDLED_SKILL_TARGETS } from '@dhzh/foundry-shared';
import type { BundledSkillTarget, BundledSkillCopyInput } from '@dhzh/foundry-shared';

export { BUNDLED_SKILL_TARGETS } from '@dhzh/foundry-shared';
export type { BundledSkillTarget, BundledSkillCopyInput } from '@dhzh/foundry-shared';

export function parseBundledSkillCopyInput(
  value: unknown,
): BundledSkillCopyInput {
  if (!isRecord(value) || !Array.isArray(value.targets)) {
    throw new BundledSkillInputError('targets must be an array');
  }
  if (value.targets.length === 0) {
    throw new BundledSkillInputError('Choose at least one target');
  }

  const targets = value.targets.map((target) => {
    if (
      typeof target !== 'string'
      || !BUNDLED_SKILL_TARGETS.includes(target as BundledSkillTarget)
    ) {
      throw new BundledSkillInputError('Invalid skill target');
    }

    return target as BundledSkillTarget;
  });

  return {
    targets: targets.filter((target, index) => targets.indexOf(target) === index),
  };
}

export class BundledSkillInputError extends Error {
  readonly code = 'INVALID_SKILL_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'BundledSkillInputError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
