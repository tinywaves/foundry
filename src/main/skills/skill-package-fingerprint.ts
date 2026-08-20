import { fingerprintSkillPackageRoot } from './skill-package-codec';

export async function fingerprintSkillPackage(packageRoot: string): Promise<string> {
  return fingerprintSkillPackageRoot(packageRoot);
}
