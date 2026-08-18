import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import type {
  SkillAddRemoteCandidateResult,
  SkillApplyUpdateResult,
  SkillCreateCustomTargetResult,
  SkillCustomTargetDirectorySelection,
  SkillDiscoveryResult,
  SkillDistributionPreflightResult,
  SkillDistributionResult,
  SkillDistributionTargetResult,
  SkillFileReadResult,
  SkillGitResolutionView,
  SkillInstallationView,
  SkillImportInstallationResult,
  SkillPackageFileEntry,
  SkillRemoteDetailView,
  SkillRemoteResultView,
  SkillRevisionView,
  SkillSourceView,
  SkillStorePackageView,
  SkillTargetKind,
  SkillTargetView,
  SkillTrashPackageView,
  SkillUpdateCheckResult,
  SkillEmptyTrashResult,
  SkillWatchSessionStart,
  SkillPromotionResult,
} from '../../shared/skill-contract';
import { deriveInstallationState } from '../../shared/skill-contract';
import type { SkillDiscoveryCoordinator } from './skill-discovery-coordinator';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillFileCoordinator } from './skill-file-coordinator';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import type { SkillRemoteDiscoveryCoordinator } from './skill-remote-discovery-coordinator';
import type {
  SkillInstallationMetadata,
  SkillInstallationRepository,
} from './skill-installation-repository';
import type { SkillMetadataRepository } from './skill-metadata-repository';
import type { SkillSourceRepository } from './skill-source-repository';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import type { SkillStorePaths } from './skill-store-paths';
import {
  normalizeResolvedPathKey,
  resolvePhysicalPath,
} from './skill-target-adapters';
import type { ResolvedBuiltInSkillTarget } from './skill-target-adapters';
import type {
  CreateCustomSkillTargetResult,
  SkillTargetMetadata,
  SkillTargetRepository,
} from './skill-target-repository';
import {
  parseSkillAddRemoteCandidateInput,
  parseSkillApplyUpdateInput,
  parseSkillCreateCustomTargetInput,
  parseSkillCustomTargetCandidateId,
  parseSkillFileTarget,
  parseSkillId,
  parseSkillInstallationListInput,
  parseSkillRemoteBrowseInput,
  parseSkillRemoteResultInput,
  parseSkillRemoteSearchInput,
  parseSkillTargetId,
} from './skill-validation';
import type { SkillWatchCoordinator } from './skill-watch-coordinator';
import type { SkillTargetMutationCoordinator } from './skill-target-mutation-coordinator';
import type { SkillUpdateCoordinator } from './skill-update-coordinator';
import type {
  ObservedSkillTrashPackage,
  SkillTrashCoordinator,
} from './skill-trash-coordinator';

interface CustomTargetCandidate {
  ownerId: number;
  configuredPath: string;
  resolvedPathKey: string;
}

interface SkillServiceOptions {
  paths: SkillStorePaths;
  metadataRepository: SkillMetadataRepository;
  targetRepository: SkillTargetRepository;
  installationRepository: SkillInstallationRepository;
  storeCoordinator: SkillStoreCoordinator;
  sourceRepository: SkillSourceRepository;
  gitSourceCoordinator: SkillGitSourceCoordinator;
  remoteDiscoveryCoordinator: SkillRemoteDiscoveryCoordinator;
  updateCoordinator: SkillUpdateCoordinator;
  discoveryCoordinator: SkillDiscoveryCoordinator;
  fileCoordinator: SkillFileCoordinator;
  watchCoordinator: SkillWatchCoordinator;
  targetMutationCoordinator: SkillTargetMutationCoordinator;
  trashCoordinator: SkillTrashCoordinator;
  resolveBuiltInTargets: () => Promise<ResolvedBuiltInSkillTarget[]>;
  revealPath: (targetPath: string) => void | Promise<void>;
  openExternal: (url: string) => void | Promise<void>;
  createCandidateId?: () => string;
}

const targetPresentation: Record<SkillTargetKind, { brandingKey: string; hint: string | null }> = {
  'generic-agent-skills': { brandingKey: 'agents', hint: null },
  'claude-code': { brandingKey: 'claude', hint: null },
  'gemini-cli': { brandingKey: 'gemini', hint: null },
  'opencode': { brandingKey: 'opencode', hint: null },
  'cursor': { brandingKey: 'cursor', hint: null },
  'github-copilot': { brandingKey: 'github-copilot', hint: null },
  'hermes': { brandingKey: 'hermes', hint: null },
  'openclaw': { brandingKey: 'openclaw', hint: null },
  'codex-legacy': { brandingKey: 'codex', hint: 'Legacy' },
  'custom': { brandingKey: 'custom', hint: null },
};

export class SkillService {
  private readonly candidates = new Map<string, CustomTargetCandidate>();
  private readonly createCandidateId: () => string;
  private readonly windowOwners = new Set<number>();

  constructor(private readonly options: SkillServiceOptions) {
    this.createCandidateId = options.createCandidateId ?? randomUUID;
  }

  private mapCustomTargetResult(
    result: CreateCustomSkillTargetResult,
  ): SkillCreateCustomTargetResult {
    return { target: mapTarget(result.target), reused: result.reused };
  }

  private mapInstallation(installation: SkillInstallationMetadata): SkillInstallationView {
    const skillPackage = this.options.metadataRepository.getActivePackage(
      installation.packageId,
    );
    const record = this.options.installationRepository.getLatestDistributionRecord(
      installation.id,
    );
    const distribution = record
      ? {
          revisionId: record.revisionId,
          fingerprint: record.fingerprint,
          recordedAt: record.createdAt,
        }
      : null;
    return {
      ...installation,
      distribution,
      state: deriveInstallationState({
        store: skillPackage.storeObservation,
        distribution,
        target: installation.targetObservation,
      }),
    };
  }

  private mapTrashPackage(result: ObservedSkillTrashPackage): SkillTrashPackageView {
    return {
      id: result.package.id,
      distributionName: result.package.distributionName,
      trashObservation: result.observation,
      createdAt: result.package.createdAt,
      updatedAt: result.package.updatedAt,
      trashedAt: result.package.trashedAt,
    };
  }

  private requireWindowOwner(ownerId: number): void {
    if (!this.windowOwners.has(ownerId)) {
      throw new SkillOperationError('internal', 'The Skills window is unavailable.');
    }
  }

  listStorePackages(): SkillStorePackageView[] {
    return this.options.metadataRepository.listActivePackages();
  }

  getStorePackage(skillIdValue: unknown): SkillStorePackageView {
    return this.options.metadataRepository.getActivePackage(parseSkillId(skillIdValue));
  }

  listTargets(): SkillTargetView[] {
    return this.options.targetRepository.listTargets().map((target) => mapTarget(target));
  }

  listInstallations(inputValue?: unknown): SkillInstallationView[] {
    const input = parseSkillInstallationListInput(inputValue);
    return this.options.installationRepository.listActiveInstallations(input.targetId)
      .filter((installation) => !input.skillId || installation.packageId === input.skillId)
      .map((installation) => this.mapInstallation(installation));
  }

  async importExisting(): Promise<SkillDiscoveryResult> {
    await this.options.storeCoordinator.reconcileStorePackages();
    return this.options.discoveryCoordinator.scan();
  }

  beginWatchSession(ownerId: number): Promise<SkillWatchSessionStart> {
    this.requireWindowOwner(ownerId);
    return this.options.watchCoordinator.beginSession(ownerId);
  }

  endWatchSession(ownerId: number, sessionId: unknown): Promise<boolean> {
    this.requireWindowOwner(ownerId);
    return this.options.watchCoordinator.endSession(ownerId, sessionId);
  }

  listPackageFiles(skillId: unknown): Promise<SkillPackageFileEntry[]> {
    return this.options.fileCoordinator.listPackageFiles(skillId);
  }

  readPackageFile(input: unknown): Promise<SkillFileReadResult> {
    return this.options.fileCoordinator.readPackageFile(parseSkillFileTarget(input));
  }

  async revealPackage(skillIdValue: unknown): Promise<null> {
    const skillId = parseSkillId(skillIdValue);
    this.options.metadataRepository.getActivePackage(skillId);
    await this.options.revealPath(path.join(this.options.paths.packages, skillId));
    return null;
  }

  async revealTarget(targetIdValue: unknown): Promise<null> {
    const target = this.options.targetRepository.getTarget(parseSkillTargetId(targetIdValue));
    await this.options.revealPath(target.configuredPath);
    return null;
  }

  async openTargetDocumentation(targetIdValue: unknown): Promise<null> {
    const target = this.options.targetRepository.getTarget(parseSkillTargetId(targetIdValue));
    if (!target.documentationUrl) {
      throw new SkillOperationError(
        'not-found',
        'Distribution Target documentation was not found.',
      );
    }
    const documentationUrl = new URL(target.documentationUrl);
    if (documentationUrl.protocol !== 'https:') {
      throw new SkillOperationError(
        'content-unavailable',
        'Distribution Target documentation is unavailable.',
      );
    }
    await this.options.openExternal(documentationUrl.href);
    return null;
  }

  registerWindowOwner(ownerId: number): void {
    this.windowOwners.add(ownerId);
    this.options.watchCoordinator.registerOwner(ownerId);
  }

  async releaseWindowOwner(ownerId: number): Promise<void> {
    this.windowOwners.delete(ownerId);
    this.options.remoteDiscoveryCoordinator.releaseOwner(ownerId);
    for (const [candidateId, candidate] of this.candidates) {
      if (candidate.ownerId === ownerId) {
        this.candidates.delete(candidateId);
      }
    }
    await Promise.all([
      this.options.watchCoordinator.releaseOwner(ownerId),
      this.options.gitSourceCoordinator.releaseOwner(ownerId),
    ]);
  }

  async registerCustomTargetCandidate(
    ownerId: number,
    selectedPath: string,
  ): Promise<SkillCustomTargetDirectorySelection> {
    this.requireWindowOwner(ownerId);
    if (!path.isAbsolute(selectedPath)) {
      throw new SkillOperationError('invalid-input', 'Select a Custom Target directory.');
    }
    const directoryStats = await stat(selectedPath);
    if (!directoryStats.isDirectory()) {
      throw new SkillOperationError('invalid-input', 'Select a Custom Target directory.');
    }
    const configuredPath = path.normalize(selectedPath);
    const resolvedPath = await resolvePhysicalPath(configuredPath);
    const candidateId = parseSkillCustomTargetCandidateId(this.createCandidateId());
    this.candidates.set(candidateId, {
      ownerId,
      configuredPath,
      resolvedPathKey: normalizeResolvedPathKey(resolvedPath),
    });
    return { candidateId, suggestedName: path.basename(configuredPath) };
  }

  async createCustomTarget(
    ownerId: number,
    inputValue: unknown,
  ): Promise<SkillCreateCustomTargetResult> {
    try {
      this.requireWindowOwner(ownerId);
      const input = parseSkillCreateCustomTargetInput(inputValue);
      const candidate = this.candidates.get(input.candidateId);
      if (candidate?.ownerId !== ownerId) {
        throw new SkillOperationError('invalid-input', 'Select a Custom Target directory again.');
      }
      const resolvedPath = await resolvePhysicalPath(candidate.configuredPath);
      const resolvedPathKey = normalizeResolvedPathKey(resolvedPath);
      if (resolvedPathKey !== candidate.resolvedPathKey) {
        throw new SkillOperationError('content-unavailable', 'The selected directory changed.');
      }
      const directoryStats = await stat(resolvedPath);
      if (!directoryStats.isDirectory()) {
        throw new SkillOperationError('content-unavailable', 'The selected directory is unavailable.');
      }
      const isWritable = await canWriteDirectory(resolvedPath);
      const result = this.options.targetRepository.createCustomTarget({
        displayName: input.displayName,
        configuredPath: candidate.configuredPath,
        resolvedPath,
        resolvedPathKey,
        isWritable,
        enabled: input.enabled,
        maxScanDepth: input.maxScanDepth,
        allowSymlinkEscape: input.allowSymlinkEscape,
      });
      this.candidates.delete(input.candidateId);
      await this.options.watchCoordinator.refreshWatchPaths();
      return this.mapCustomTargetResult(result);
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  async updateTargetPolicy(input: unknown): Promise<SkillTargetView> {
    const target = this.options.targetRepository.updateTargetPolicy(input);
    await this.options.watchCoordinator.refreshWatchPaths();
    return mapTarget(target);
  }

  async resetBuiltInTargetPolicy(targetIdValue: unknown): Promise<SkillTargetView> {
    const targetId = parseSkillTargetId(targetIdValue);
    const target = this.options.targetRepository.getTarget(targetId);
    if (!target.builtIn) {
      throw new SkillOperationError('invalid-input', 'Select a built-in Distribution Target.');
    }
    const definitions = await this.options.resolveBuiltInTargets();
    const definition = definitions.find((item) => item.kind === target.kind);
    if (!definition) {
      throw new SkillOperationError(
        'content-unavailable',
        'The built-in Distribution Target defaults are unavailable.',
      );
    }
    const reset = this.options.targetRepository.resetBuiltInTargetPolicy(
      targetId,
      definition,
    );
    await this.options.watchCoordinator.refreshWatchPaths();
    return mapTarget(reset);
  }

  preflightDistribution(input: unknown): Promise<SkillDistributionPreflightResult> {
    return this.options.targetMutationCoordinator.preflightDistribution(input);
  }

  async distribute(input: unknown): Promise<SkillDistributionResult> {
    const result = await this.options.targetMutationCoordinator.distribute(input);
    return {
      skillId: result.skillId,
      revisionId: result.revisionId,
      targets: result.targets.map((target): SkillDistributionTargetResult => {
        if (!target.ok) {
          return target;
        }
        const installation = this.options.installationRepository.getActiveInstallation(
          target.installationId,
        );
        return {
          targetId: target.targetId,
          ok: true,
          installation: this.mapInstallation(installation),
          revisionId: target.revisionId,
        };
      }),
    };
  }

  async restoreInstallation(input: unknown): Promise<SkillDistributionTargetResult> {
    const target = await this.options.targetMutationCoordinator.restoreInstallation(input);
    if (!target.ok) {
      return target;
    }
    return {
      targetId: target.targetId,
      ok: true,
      installation: this.mapInstallation(
        this.options.installationRepository.getActiveInstallation(target.installationId),
      ),
      revisionId: target.revisionId,
    };
  }

  async promoteInstallation(input: unknown): Promise<SkillPromotionResult> {
    const result = await this.options.targetMutationCoordinator.promoteInstallation(input);
    return {
      skillPackage: result.package,
      revisionId: result.revision.id,
      installation: this.mapInstallation(
        this.options.installationRepository.getActiveInstallation(result.installationId),
      ),
    };
  }

  async importInstallationAsNew(input: unknown): Promise<SkillImportInstallationResult> {
    const result = await this.options.targetMutationCoordinator
      .importInstallationAsNew(input);
    return { skillPackage: result.package, revisionId: result.revision.id };
  }

  uninstall(input: unknown): Promise<null> {
    return this.options.targetMutationCoordinator.uninstall(input);
  }

  listRevisions(skillIdValue: unknown): SkillRevisionView[] {
    return this.options.metadataRepository.listRevisions(parseSkillId(skillIdValue));
  }

  listSources(skillIdValue: unknown): SkillSourceView[] {
    return this.options.sourceRepository.listSources(parseSkillId(skillIdValue));
  }

  browseRemoteSkills(ownerId: number, inputValue: unknown): Promise<SkillRemoteResultView[]> {
    this.requireWindowOwner(ownerId);
    const input = parseSkillRemoteBrowseInput(inputValue);
    return this.options.remoteDiscoveryCoordinator.browse(ownerId, input.provider);
  }

  searchRemoteSkills(ownerId: number, inputValue: unknown): Promise<SkillRemoteResultView[]> {
    this.requireWindowOwner(ownerId);
    const input = parseSkillRemoteSearchInput(inputValue);
    return this.options.remoteDiscoveryCoordinator.search(ownerId, input.provider, input.query);
  }

  getRemoteSkillDetails(ownerId: number, inputValue: unknown): Promise<SkillRemoteDetailView> {
    this.requireWindowOwner(ownerId);
    const input = parseSkillRemoteResultInput(inputValue);
    return this.options.remoteDiscoveryCoordinator.getDetails(ownerId, input.resultId);
  }

  resolveDirectoryResult(ownerId: number, inputValue: unknown): Promise<SkillGitResolutionView> {
    this.requireWindowOwner(ownerId);
    const input = parseSkillRemoteResultInput(inputValue);
    return this.options.remoteDiscoveryCoordinator.resolveDirectoryResult(
      ownerId,
      input.resultId,
    );
  }

  resolveGitSource(ownerId: number, input: unknown): Promise<SkillGitResolutionView> {
    this.requireWindowOwner(ownerId);
    return this.options.gitSourceCoordinator.resolve(ownerId, input);
  }

  addRemoteCandidate(
    ownerId: number,
    inputValue: unknown,
  ): Promise<SkillAddRemoteCandidateResult> {
    this.requireWindowOwner(ownerId);
    const input = parseSkillAddRemoteCandidateInput(inputValue);
    return this.options.remoteDiscoveryCoordinator.addToStore(ownerId, input.candidateId);
  }

  async openRemoteResult(ownerId: number, inputValue: unknown): Promise<null> {
    this.requireWindowOwner(ownerId);
    const input = parseSkillRemoteResultInput(inputValue);
    const url = this.options.remoteDiscoveryCoordinator.getResultUrl(ownerId, input.resultId);
    await this.options.openExternal(url);
    return null;
  }

  async openSource(sourceIdValue: unknown): Promise<null> {
    const source = this.options.sourceRepository.getSource(sourceIdValue);
    await this.options.openExternal(source.canonicalWebUrl);
    return null;
  }

  checkSourceForUpdates(sourceIdValue: unknown): Promise<SkillUpdateCheckResult> {
    return this.options.updateCoordinator.checkSource(sourceIdValue);
  }

  checkPackageForUpdates(packageIdValue: unknown): Promise<SkillUpdateCheckResult[]> {
    return this.options.updateCoordinator.checkPackage(packageIdValue);
  }

  applyUpdate(inputValue: unknown): Promise<SkillApplyUpdateResult> {
    const input = parseSkillApplyUpdateInput(inputValue);
    return this.options.updateCoordinator.apply(input.candidateId);
  }

  listRevisionFiles(
    skillIdValue: unknown,
    revisionIdValue: unknown,
  ): Promise<SkillPackageFileEntry[]> {
    return this.options.fileCoordinator.listRevisionFiles(skillIdValue, revisionIdValue);
  }

  readRevisionFile(input: unknown): Promise<SkillFileReadResult> {
    return this.options.fileCoordinator.readRevisionFile(input);
  }

  async movePackageToTrash(skillIdValue: unknown): Promise<SkillTrashPackageView> {
    return this.mapTrashPackage(
      await this.options.trashCoordinator.movePackageToTrash(skillIdValue),
    );
  }

  async listTrash(): Promise<SkillTrashPackageView[]> {
    const trashPackages = await this.options.trashCoordinator.listTrash();
    return trashPackages.map((item) => (
      this.mapTrashPackage(item)
    ));
  }

  restoreTrashedPackage(skillIdValue: unknown): Promise<SkillStorePackageView> {
    return this.options.trashCoordinator.restoreTrashedPackage(skillIdValue);
  }

  removeTrashedPackage(skillIdValue: unknown): Promise<null> {
    return this.options.trashCoordinator.removeTrashedPackage(skillIdValue);
  }

  emptyTrash(): Promise<SkillEmptyTrashResult> {
    return this.options.trashCoordinator.emptyTrash();
  }

  async removeCustomTarget(targetId: unknown): Promise<null> {
    this.options.targetRepository.removeCustomTarget(targetId);
    await this.options.watchCoordinator.refreshWatchPaths();
    return null;
  }

  async dispose(): Promise<void> {
    this.windowOwners.clear();
    this.candidates.clear();
    this.options.remoteDiscoveryCoordinator.dispose();
    await Promise.all([
      this.options.watchCoordinator.dispose(),
      this.options.gitSourceCoordinator.dispose(),
    ]);
  }
}

function mapTarget(target: SkillTargetMetadata): SkillTargetView {
  return {
    id: target.id,
    kind: target.kind,
    displayName: target.displayName,
    configuredPath: target.configuredPath,
    documentationUrl: target.documentationUrl,
    ...targetPresentation[target.kind],
    builtIn: target.builtIn,
    writable: target.writable,
    enabled: target.enabled,
    policySource: target.policySource,
    maxScanDepth: target.maxScanDepth,
    allowSymlinkEscape: target.allowSymlinkEscape,
    sortOrder: target.sortOrder,
  };
}

async function canWriteDirectory(directoryPath: string): Promise<boolean> {
  try {
    await access(directoryPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
