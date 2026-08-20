import type { Buffer } from 'node:buffer';
import type {
  SkillFileReadResult,
  SkillPackageFileEntry,
} from '../../shared/skill-contract';
import { SkillOperationError } from './skill-error';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import { parseSkillFileTarget } from './skill-validation';

const MAX_TEXT_FILE_BYTES = 1024 * 1024;

export class SkillFileCoordinator {
  constructor(private readonly storeCoordinator: SkillStoreCoordinator) {}

  async listPackageFiles(skillIdValue: unknown): Promise<SkillPackageFileEntry[]> {
    const verified = await this.storeCoordinator.getVerifiedPackageContent(skillIdValue);
    return verified.inspected.entries.map((entry) => ({
      relativePath: entry.relativePath,
      kind: entry.kind,
      size: entry.kind === 'file' ? entry.content.length : null,
    }));
  }

  async readPackageFile(inputValue: unknown): Promise<SkillFileReadResult> {
    const input = parseSkillFileTarget(inputValue);
    const verified = await this.storeCoordinator.getVerifiedPackageContent(input.skillId);
    const entry = verified.inspected.entries.find(
      (candidate) => candidate.relativePath === input.relativePath,
    );
    if (!entry) {
      return { status: 'missing', relativePath: input.relativePath, size: null };
    }
    if (entry.kind === 'symbolic-link') {
      return { status: 'symbolic-link', relativePath: input.relativePath, size: null };
    }
    if (entry.kind === 'directory') {
      throw new SkillOperationError('invalid-input', 'Select a regular Skill Package file.');
    }
    if (entry.content.length > MAX_TEXT_FILE_BYTES) {
      return {
        status: 'oversized',
        relativePath: input.relativePath,
        size: entry.content.length,
      };
    }
    const text = decodeText(entry.content);
    if (text === null) {
      return {
        status: 'binary',
        relativePath: input.relativePath,
        size: entry.content.length,
      };
    }
    return {
      status: 'text',
      relativePath: input.relativePath,
      content: text,
      size: entry.content.length,
    };
  }
}

function decodeText(content: Buffer): string | null {
  if (content.includes(0)) {
    return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return null;
  }
}
