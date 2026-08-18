import { readdir } from 'node:fs/promises';
import type { SkillContentObservation } from '../../shared/skill-contract';
import { fingerprintSkillPackage } from './skill-package-fingerprint';

export async function isRecognizedSkillPackage(packageRoot: string): Promise<boolean> {
  try {
    const entries = await readdir(packageRoot);
    return entries.includes('SKILL.md');
  } catch (error) {
    if (hasFilesystemCode(error, 'ENOENT') || hasFilesystemCode(error, 'ENOTDIR')) {
      return false;
    }
    throw error;
  }
}

export async function observeSkillPackage(
  packageRoot: string,
  observedAt = Date.now(),
): Promise<SkillContentObservation> {
  try {
    return {
      status: 'available',
      fingerprint: await fingerprintSkillPackage(packageRoot),
      observedAt,
    };
  } catch (error) {
    if (hasFilesystemCode(error, 'ENOENT')) {
      return { status: 'missing', observedAt };
    }
    return { status: 'unreadable', observedAt };
  }
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}
