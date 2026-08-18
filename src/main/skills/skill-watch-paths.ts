import type { SkillStorePaths } from './skill-store-paths';
import { resolvePhysicalPath } from './skill-target-adapters';
import type { SkillTargetRepository } from './skill-target-repository';

export async function resolveSkillWatchPaths(
  paths: SkillStorePaths,
  targetRepository: SkillTargetRepository,
): Promise<string[]> {
  const targetPaths = await Promise.all(targetRepository.listTargets()
    .filter((target) => target.enabled)
    .map((target) => resolvePhysicalPath(target.configuredPath)));
  return [paths.packages, ...targetPaths];
}
