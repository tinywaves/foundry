export const BUNDLED_SKILL_TARGETS = ['agents', 'claude'] as const;
export type BundledSkillTarget = (typeof BUNDLED_SKILL_TARGETS)[number];

export interface BundledSkillCopyInput {
  targets: BundledSkillTarget[];
}

export interface BundledSkillTargetInfo {
  target: BundledSkillTarget;
  destination: string;
}

export interface BundledSkillTargetsResult {
  targets: BundledSkillTargetInfo[];
}

export interface BundledSkillCopyResult {
  installed: BundledSkillTargetInfo[];
}
