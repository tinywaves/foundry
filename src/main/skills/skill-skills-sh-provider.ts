import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import type {
  SkillGitResolutionView,
  SkillRemoteResultView,
} from '../../shared/skill-contract';
import { SkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import type { SkillProviderHttpClient } from './skill-provider-http-client';
import { parseSkillRemoteResultId } from './skill-validation';

const SKILLS_SH_ORIGIN = 'https://skills.sh';
const SKILLS_SH_HOSTS = new Set(['skills.sh']);
const MAX_RESULTS = 25;

interface SkillSkillsShProviderOptions {
  httpClient: SkillProviderHttpClient;
  gitSourceCoordinator: SkillGitSourceCoordinator;
  createId?: () => string;
}

interface SkillsShResult {
  ownerId: number;
  repository: string;
  canonicalWebUrl: string;
  view: SkillRemoteResultView;
}

export class SkillSkillsShProvider {
  private readonly createId: () => string;
  private readonly results = new Map<string, SkillsShResult>();

  constructor(private readonly options: SkillSkillsShProviderOptions) {
    this.createId = options.createId ?? randomUUID;
  }

  async search(ownerId: number, query: string): Promise<SkillRemoteResultView[]> {
    const url = new URL('/api/search', SKILLS_SH_ORIGIN);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(MAX_RESULTS));
    const payload = await this.options.httpClient.getJson({
      url: url.href,
      allowedHosts: SKILLS_SH_HOSTS,
    });
    const results = parseSearchResponse(payload);
    this.releaseOwner(ownerId);
    return results.map((result) => {
      const id = parseSkillRemoteResultId(this.createId());
      const canonicalWebUrl = `${SKILLS_SH_ORIGIN}/${result.repository}/${encodeURIComponent(result.skillId)}`;
      const view: SkillRemoteResultView = {
        id,
        provider: 'skills-sh',
        sourceNativeId: result.nativeId,
        name: result.name,
        description: null,
        publisher: result.repository.split('/', 1)[0] ?? null,
        latestVersion: null,
        canonicalWebUrl,
      };
      this.results.set(id, {
        ownerId,
        repository: result.repository,
        canonicalWebUrl,
        view,
      });
      return view;
    });
  }

  resolve(ownerId: number, resultIdValue: unknown): Promise<SkillGitResolutionView> {
    const result = this.getResult(ownerId, resultIdValue);
    return this.options.gitSourceCoordinator.resolve(
      ownerId,
      {
        sourceUrl: `https://github.com/${result.repository}`,
        requestedRef: null,
      },
      {
        provider: 'skills-sh',
        locator: result.canonicalWebUrl,
      },
    );
  }

  hasResult(ownerId: number, resultIdValue: unknown): boolean {
    return typeof resultIdValue === 'string'
      && this.results.get(resultIdValue)?.ownerId === ownerId;
  }

  getResultUrl(ownerId: number, resultIdValue: unknown): string {
    return this.getResult(ownerId, resultIdValue).canonicalWebUrl;
  }

  releaseOwner(ownerId: number): void {
    for (const [id, result] of this.results) {
      if (result.ownerId === ownerId) {
        this.results.delete(id);
      }
    }
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private getResult(ownerId: number, resultIdValue: unknown): SkillsShResult {
    const resultId = parseSkillRemoteResultId(resultIdValue);
    const result = this.results.get(resultId);
    if (result?.ownerId !== ownerId) {
      throw new SkillOperationError('stale-result', 'Search skills.sh again.');
    }
    return result;
  }
}

function parseSearchResponse(value: unknown): Array<{
  nativeId: string;
  skillId: string;
  name: string;
  repository: string;
}> {
  const skills = requireRecord(value).skills;
  if (!Array.isArray(skills) || skills.length > MAX_RESULTS) {
    throw invalidProviderPayload();
  }
  return skills.map((item) => {
    const record = requireRecord(item);
    const repository = parseRepository(record.source);
    const skillId = parseSegment(record.skillId);
    const nativeId = parseText(record.id, 1024);
    if (nativeId !== `${repository}/${skillId}`) {
      throw invalidProviderPayload();
    }
    return {
      nativeId,
      skillId,
      name: parseText(record.name, 512),
      repository,
    };
  });
}

function parseRepository(value: unknown): string {
  const repository = parseText(value, 512);
  if (!(/^[\w.-]+\/[\w.-]+$/u).test(repository)) {
    throw invalidProviderPayload();
  }
  return repository;
}

function parseSegment(value: unknown): string {
  const segment = parseText(value, 255);
  if (!(/^[\w.-]+$/u).test(segment)) {
    throw invalidProviderPayload();
  }
  return segment;
}

function parseText(value: unknown, maxBytes: number): string {
  if (
    typeof value !== 'string'
    || value === ''
    || value !== value.trim()
    || Buffer.byteLength(value, 'utf8') > maxBytes
    || hasControlCharacters(value)
  ) {
    throw invalidProviderPayload();
  }
  return value;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidProviderPayload();
  }
  return value as Record<string, unknown>;
}

function invalidProviderPayload(): SkillOperationError {
  return new SkillOperationError(
    'source-unavailable',
    'The skills.sh response is invalid. Use Git URL import instead.',
  );
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1F || codePoint === 0x7F) {
      return true;
    }
  }
  return false;
}
