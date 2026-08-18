export interface SkillResolvedSourceRevision {
  resolvedRevision: string;
  artifactDigest: string | null;
  canonicalWebUrl: string;
}

export interface SkillMaterializedSourceRevision extends SkillResolvedSourceRevision {
  contentRoot: string;
  release: () => Promise<void>;
}
