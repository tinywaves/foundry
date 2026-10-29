import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import type { BundledSkillTarget } from './skill-copy-contracts';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const SKILL_NAME = 'foundry';

export interface BundledSkillInstall {
  target: BundledSkillTarget;
  destination: string;
}

export interface BundledSkillCopyResult {
  installed: BundledSkillInstall[];
}

export interface BundledSkillCopyServiceOptions {
  skillRoot?: string;
  homeDirectory?: string;
}

export class BundledSkillCopyService {
  private readonly configuredSkillRoot: string | undefined;
  private readonly homeDirectory: string;

  constructor({
    skillRoot,
    homeDirectory = homedir(),
  }: BundledSkillCopyServiceOptions = {}) {
    this.configuredSkillRoot = skillRoot;
    this.homeDirectory = path.resolve(homeDirectory);
  }

  private async copyToTarget(
    target: BundledSkillTarget,
  ): Promise<BundledSkillInstall> {
    const skillRoot = this.configuredSkillRoot ?? resolveBundledSkillRoot();
    if (!existsSync(path.join(skillRoot, 'SKILL.md'))) {
      throw new BundledSkillCopyError(
        'SKILL_NOT_FOUND',
        'The bundled Foundry skill was not found',
      );
    }

    const resolvedParent = path.join(
      this.homeDirectory,
      target === 'agents' ? '.agents' : '.claude',
      'skills',
    );
    const destination = path.join(resolvedParent, SKILL_NAME);
    const temporaryDirectory = path.join(
      resolvedParent,
      `.${SKILL_NAME}-${randomUUID()}.tmp`,
    );
    const backupDirectory = path.join(
      resolvedParent,
      `.${SKILL_NAME}-${randomUUID()}.backup`,
    );

    try {
      await mkdir(resolvedParent, { recursive: true });
      await cp(skillRoot, temporaryDirectory, {
        recursive: true,
        errorOnExist: true,
      });
      await replaceDirectory(temporaryDirectory, destination, backupDirectory);
      return { target, destination };
    } catch (error) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      if (error instanceof BundledSkillCopyError) {
        throw error;
      }
      throw new BundledSkillCopyError(
        'SKILL_COPY_FAILED',
        'Unable to copy the Foundry skill',
        { cause: error },
      );
    }
  }

  async copyToTargets(
    targets: readonly BundledSkillTarget[],
  ): Promise<BundledSkillCopyResult> {
    return {
      installed: await Array.fromAsync(
        targets,
        (target) => this.copyToTarget(target),
      ),
    };
  }
}

export class BundledSkillCopyError extends Error {
  constructor(
    readonly code: 'SKILL_COPY_FAILED' | 'SKILL_NOT_FOUND',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'BundledSkillCopyError';
  }
}

export function resolveBundledSkillRoot(): string {
  const candidates = [
    path.resolve(moduleDirectory, 'skills', SKILL_NAME),
    path.resolve(moduleDirectory, '..', '..', '..', 'skills', SKILL_NAME),
    path.resolve(process.cwd(), 'skills', SKILL_NAME),
  ];
  const skillRoot = candidates.find((candidate) =>
    existsSync(path.join(candidate, 'SKILL.md')));

  if (!skillRoot) {
    throw new BundledSkillCopyError(
      'SKILL_NOT_FOUND',
      'The bundled Foundry skill was not found',
    );
  }

  return skillRoot;
}

async function replaceDirectory(
  source: string,
  destination: string,
  backup: string,
): Promise<void> {
  const hasExistingDestination = existsSync(destination);
  if (hasExistingDestination) {
    await rename(destination, backup);
  }

  try {
    await rename(source, destination);
    if (hasExistingDestination) {
      await rm(backup, { recursive: true, force: true });
    }
  } catch (error) {
    if (hasExistingDestination && !existsSync(destination) && existsSync(backup)) {
      await rename(backup, destination);
    }
    throw error;
  }
}
