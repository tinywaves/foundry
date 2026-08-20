import { parseDocument } from 'yaml';
import type { InspectedSkillPackage } from './skill-package-codec';

const MAX_MANIFEST_FRONTMATTER_BYTES = 256 * 1024;

export interface SkillPackageManifestMetadata {
  name: unknown;
  description: string | null;
}

export function readSkillPackageManifest(
  inspected: InspectedSkillPackage,
): SkillPackageManifestMetadata {
  const manifest = inspected.entries.find((entry) => entry.relativePath === 'SKILL.md');
  if (manifest?.kind !== 'file' || manifest.content.length > MAX_MANIFEST_FRONTMATTER_BYTES) {
    return { name: undefined, description: null };
  }

  const lines = manifest.content.toString('utf8').split(/\r?\n/);
  if (lines[0] !== '---') {
    return { name: undefined, description: null };
  }
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && (line === '---' || line === '...'),
  );
  if (closingIndex === -1) {
    return { name: undefined, description: null };
  }

  const document = parseDocument(lines.slice(1, closingIndex).join('\n'));
  if (document.errors.length > 0) {
    return { name: undefined, description: null };
  }
  const descriptionValue = document.get('description');
  return {
    name: document.get('name'),
    description: typeof descriptionValue === 'string'
      ? normalizeSkillDescription(descriptionValue)
      : null,
  };
}

function normalizeSkillDescription(value: string): string | null {
  const description = value.trim();
  return description.length > 0 ? description : null;
}
