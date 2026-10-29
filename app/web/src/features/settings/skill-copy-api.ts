import { toApiError } from '../../lib/api';

export type BundledSkillTarget = 'agents' | 'claude';

export interface BundledSkillCopyResult {
  installed: Array<{
    target: BundledSkillTarget;
    destination: string;
  }>;
}

export interface BundledSkillTargetInfo {
  target: BundledSkillTarget;
  destination: string;
}

export interface BundledSkillTargetsResult {
  targets: BundledSkillTargetInfo[];
}

export async function getBundledSkillTargets(): Promise<BundledSkillTargetsResult> {
  const response = await fetch('/api/settings/skill-copy');
  if (!response.ok) {
    throw toApiError(await readErrorPayload(response), response.status);
  }

  return await response.json() as BundledSkillTargetsResult;
}

export async function copyBundledSkill(
  targets: readonly BundledSkillTarget[],
): Promise<BundledSkillCopyResult> {
  const response = await fetch('/api/settings/skill-copy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targets }),
  });
  if (!response.ok) {
    throw toApiError(await readErrorPayload(response), response.status);
  }

  return await response.json() as BundledSkillCopyResult;
}

async function readErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
