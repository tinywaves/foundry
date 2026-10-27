import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type {
  SkillPackageContent,
  SkillPackageMetadata,
  SkillMetadataRepository,
} from './skill-metadata-repository';
import {
  encodeSkillPackage,
  inspectSkillPackage,
  materializeSkillPackage,
  SkillPackageCodecError,
} from './skill-package-codec';
import { readSkillPackageManifest } from './skill-package-manifest';
import type {
  EncodedSkillPackage,
  InspectedSkillPackage,
} from './skill-package-codec';
import { parseSkillDistributionName, parseSkillId } from './skill-validation';

interface SkillStoreCoordinatorOptions {
  createId?: () => string;
  now?: () => number;
}

export interface SkillImportResult {
  package: SkillPackageMetadata;
  reused: boolean;
}

export interface PreparedSkillPackageContent {
  distributionName: string;
  description: string | null;
  encoded: EncodedSkillPackage;
}

export interface VerifiedSkillPackageContent {
  package: SkillPackageContent;
  inspected: InspectedSkillPackage;
}

export class SkillStoreCoordinator {
  private readonly createId: () => string;
  private readonly now: () => number;
  private mutationTail: Promise<boolean> = Promise.resolve(true);

  constructor(
    private readonly repository: SkillMetadataRepository,
    options: SkillStoreCoordinatorOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
  }

  importPackage(sourceRoot: string): Promise<SkillImportResult> {
    return this.runSerializedMutation(() => this.importPackageUnlocked(sourceRoot, true));
  }

  importPackageAsNew(sourceRoot: string): Promise<SkillImportResult> {
    return this.runSerializedMutation(() => this.importPackageUnlocked(sourceRoot, false));
  }

  async preparePackageContent(
    sourceRoot: string,
    fallbackIdValue?: unknown,
  ): Promise<PreparedSkillPackageContent> {
    const fallbackId = parseSkillId(
      fallbackIdValue === undefined ? this.createId() : fallbackIdValue,
    );
    try {
      const encoded = await encodeSkillPackage(sourceRoot);
      const inspected = await inspectSkillPackage(encoded.content, {
        expectedFingerprint: encoded.fingerprint,
      });
      return {
        distributionName: deriveDistributionName(
          inspected,
          path.basename(sourceRoot),
          fallbackId,
        ),
        description: readSkillPackageManifest(inspected).description,
        encoded,
      };
    } catch (error) {
      throw mapSourceCodecError(error);
    }
  }

  async getVerifiedPackageContent(packageIdValue: unknown): Promise<VerifiedSkillPackageContent> {
    const packageId = parseSkillId(packageIdValue);
    const skillPackage = this.repository.getActivePackageContent(packageId);
    try {
      const inspected = await inspectSkillPackage(skillPackage.content, {
        expectedFingerprint: skillPackage.fingerprint,
      });
      return { package: skillPackage, inspected };
    } catch (error) {
      throw mapStoredCodecError(error);
    }
  }

  async materializePackage(packageIdValue: unknown, destinationRoot: string): Promise<void> {
    const packageId = parseSkillId(packageIdValue);
    const skillPackage = this.repository.getActivePackageContent(packageId);
    try {
      await materializeSkillPackage(skillPackage.content, destinationRoot, {
        expectedFingerprint: skillPackage.fingerprint,
      });
    } catch (error) {
      throw mapStoredCodecError(error);
    }
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private async importPackageUnlocked(
    sourceRoot: string,
    shouldReuseExisting: boolean,
  ): Promise<SkillImportResult> {
    const packageId = parseSkillId(this.createId());
    const prepared = await this.preparePackageContent(sourceRoot, packageId);
    if (shouldReuseExisting) {
      const existing = this.repository.findActivePackageByFingerprint(
        prepared.encoded.fingerprint,
      );
      if (existing) {
        return { package: existing, reused: true };
      }
    }
    const createdAt = this.now();
    const skillPackage = this.repository.createImportedPackage({
      id: packageId,
      distributionName: prepared.distributionName,
      fingerprint: prepared.encoded.fingerprint,
      content: prepared.encoded.content,
      description: prepared.description,
      createdAt,
    });
    return { package: skillPackage, reused: false };
  }

  private async runSerializedMutation<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationTail;
    const gate = Promise.withResolvers<boolean>();
    this.mutationTail = gate.promise;
    await previous;
    try {
      return await operation();
    } catch (error) {
      throw toSkillOperationError(error);
    } finally {
      gate.resolve(true);
    }
  }
}

function deriveDistributionName(
  inspected: InspectedSkillPackage,
  sourceBasename: string,
  packageId: string,
): string {
  const manifestName = readSkillPackageManifest(inspected).name;
  for (const candidate of [manifestName, sourceBasename]) {
    try {
      return parseSkillDistributionName(candidate);
    } catch {
      // Manifest metadata is best-effort; validated content remains importable.
    }
  }
  return `skill-${packageId}`;
}

function mapSourceCodecError(error: unknown): SkillOperationError {
  if (error instanceof SkillPackageCodecError) {
    if (error.code === 'resource-limit') {
      return new SkillOperationError('resource-limit', error.message);
    }
    if (error.code === 'invalid-root') {
      return new SkillOperationError('invalid-input', error.message);
    }
    return new SkillOperationError('content-unavailable', error.message);
  }
  return toSkillOperationError(error);
}

function mapStoredCodecError(error: unknown): SkillOperationError {
  if (error instanceof SkillPackageCodecError) {
    return new SkillOperationError(
      'store-corrupt',
      'Stored Skill content is corrupt and cannot be used.',
    );
  }
  return toSkillOperationError(error);
}
