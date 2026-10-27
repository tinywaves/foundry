import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'vitest';
import type {
  SkillGitResolutionView,
  SkillSourceView,
  SkillStorePackageView,
} from '../../shared/skill-contract';
import { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { SkillProviderHttpClient } from './skill-provider-http-client';
import type { SkillRemoteAcquisitionCoordinator } from './skill-remote-acquisition';
import { SkillSkillsShProvider } from './skill-skills-sh-provider';
import type { SkillSourceRepository } from './skill-source-repository';
import type { SkillStoreCoordinator } from './skill-store-coordinator';

const resultId = '00000000-0000-4000-8000-000000000a01';
const secondResultId = '00000000-0000-4000-8000-000000000a02';
const latestCandidateId = '00000000-0000-4000-8000-000000000a03';
const exactCandidateId = '00000000-0000-4000-8000-000000000a04';
const sourceId = '00000000-0000-4000-8000-000000000a05';
const packageId = '00000000-0000-4000-8000-000000000a06';
const operationId = '00000000-0000-4000-8000-000000000a08';
const fingerprint = 'a'.repeat(64);
const artifactDigest = 'b'.repeat(64);

test('normalizes owner-qualified ClawHub results and imports an exact latest revision', async () => {
  const requests: string[] = [];
  let acquiredInput: { url: string; expectedDigest: string | null } | undefined;
  let attachedSource: Parameters<SkillSourceRepository['attachOrRefresh']>[0] | undefined;
  const provider = new SkillClawHubProvider({
    httpClient: new SkillProviderHttpClient({
      fetch: (input) => {
        const url = String(input);
        requests.push(url);
        if (url.includes('/packages/search')) {
          return Promise.resolve(Response.json({ results: [
            { package: clawPackage('typescript', 'ivangdavila') },
            { package: clawPackage('typescript', 'other-owner') },
          ] }));
        }
        if (url.includes('/packages/typescript/versions?')) {
          return Promise.resolve(Response.json({
            items: [{ version: '1.2.3', createdAt: 40, changelog: 'Stable' }],
          }));
        }
        if (url.endsWith('/packages/typescript')) {
          return Promise.resolve(Response.json({
            package: clawPackage('typescript', 'ivangdavila'),
          }));
        }
        if (url.includes('/skills/typescript/versions/1.2.3')) {
          return Promise.resolve(Response.json({
            version: {
              version: '1.2.3',
              security: { sha256hash: artifactDigest },
            },
          }));
        }
        if (url.includes('/api/v1/download')) {
          return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), {
            headers: { 'Content-Type': 'application/zip' },
          }));
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      },
    }),
    acquisition: {
      acquireZip: (input) => {
        acquiredInput = input;
        return Promise.resolve({
          operationId,
          contentRoot: '/staging/content',
          artifactDigest,
          downloadedBytes: 3,
          extractedBytes: 3,
          entryCount: 1,
        });
      },
      release: () => Promise.resolve(),
    } as unknown as SkillRemoteAcquisitionCoordinator,
    gitSourceCoordinator: {} as SkillGitSourceCoordinator,
    storeCoordinator: {
      preparePackageContent: () => Promise.resolve({
        distributionName: 'typescript',
        encoded: {
          format: 'foundry-skill-zip-v1',
          content: Buffer.from('encoded-content'),
          fingerprint: `v2:${fingerprint}`,
          entryCount: 1,
          uncompressedBytes: 1,
        },
      }),
    } as unknown as SkillStoreCoordinator,
    sourceRepository: {
      importPackageWithSource: (input) => {
        const importedSource = { ...input.source, packageId: input.packageId };
        attachedSource = importedSource;
        return {
          skillPackage: storePackage(),
          source: sourceView(importedSource),
          reusedPackage: false,
        };
      },
    } as unknown as SkillSourceRepository,
    createId: idSequence([
      resultId,
      secondResultId,
      latestCandidateId,
      exactCandidateId,
      packageId,
      sourceId,
    ]),
    now: () => 60,
  });

  const results = await provider.search(7, 'typescript');
  assert.deepEqual(results.map((item) => item.sourceNativeId), [
    'ivangdavila/typescript',
    'other-owner/typescript',
  ]);
  const details = await provider.getDetails(7, resultId);
  assert.equal(details.recommendedVersionId, latestCandidateId);
  assert.deepEqual(details.versions.map((version) => [
    version.label,
    version.trackingMode,
  ]), [
    ['Latest', 'tracked'],
    ['1.2.3', 'fixed'],
  ]);

  const added = await provider.addToStore(7, latestCandidateId);
  assert.equal(added.source.provider, 'clawhub');
  assert.equal(added.source.resolvedRevision, '1.2.3');
  assert.ok(acquiredInput);
  assert.ok(attachedSource);
  assert.equal(acquiredInput.expectedDigest, artifactDigest);
  assert.equal(new URL(acquiredInput.url).searchParams.get('version'), '1.2.3');
  assert.equal(attachedSource.sourceNativeId, 'ivangdavila/typescript');
  assert.equal(attachedSource.requestedRef, 'latest');
  assert.equal(requests.some((url) => url.includes('/api/v1/download')), true);
});

test('rejects ClawHub schema drift and a latest channel that moved after selection', async () => {
  const invalidProvider = new SkillClawHubProvider({
    httpClient: new SkillProviderHttpClient({
      fetch: () => Promise.resolve(Response.json({
        results: [{ package: { family: 'skill' } }],
      })),
    }),
    acquisition: {} as SkillRemoteAcquisitionCoordinator,
    gitSourceCoordinator: {} as SkillGitSourceCoordinator,
    storeCoordinator: {} as SkillStoreCoordinator,
    sourceRepository: {} as SkillSourceRepository,
  });
  await assertSkillError(() => invalidProvider.search(7, 'typescript'), 'source-unavailable');

  const responses = [
    Response.json({ results: [{ package: clawPackage('typescript', 'owner') }] }),
    Response.json({ package: clawPackage('typescript', 'owner') }),
    Response.json({ items: [{ version: '1.2.3', createdAt: 1, changelog: 'First' }] }),
    Response.json({ package: { ...clawPackage('typescript', 'owner'), latestVersion: '2.0.0' } }),
  ];
  const movingProvider = new SkillClawHubProvider({
    httpClient: new SkillProviderHttpClient({
      fetch: () => Promise.resolve(responses.shift() ?? Response.error()),
    }),
    acquisition: {} as SkillRemoteAcquisitionCoordinator,
    gitSourceCoordinator: {} as SkillGitSourceCoordinator,
    storeCoordinator: {} as SkillStoreCoordinator,
    sourceRepository: {} as SkillSourceRepository,
    createId: idSequence([resultId, latestCandidateId, exactCandidateId]),
  });
  await movingProvider.search(7, 'typescript');
  await movingProvider.getDetails(7, resultId);
  await assertSkillError(
    () => movingProvider.addToStore(7, latestCandidateId),
    'stale-result',
  );
});

test('treats skills.sh as directory provenance and hands acquisition to Git', async () => {
  let resolvedInput: unknown;
  let resolvedProvenance: unknown;
  const resolution: SkillGitResolutionView = {
    id: secondResultId,
    sourceUrl: 'https://github.com/github/awesome-copilot.git',
    requestedRef: null,
    resolvedRevision: '1'.repeat(40),
    packages: [],
  };
  const provider = new SkillSkillsShProvider({
    httpClient: new SkillProviderHttpClient({
      fetch: () => Promise.resolve(Response.json({
        skills: [
          {
            id: 'github/awesome-copilot/javascript-typescript-jest',
            skillId: 'javascript-typescript-jest',
            name: 'javascript-typescript-jest',
            source: 'github/awesome-copilot',
          },
        ],
      })),
    }),
    gitSourceCoordinator: {
      resolve: (_ownerId, input, provenance) => {
        resolvedInput = input;
        resolvedProvenance = provenance;
        return Promise.resolve(resolution);
      },
    } as unknown as SkillGitSourceCoordinator,
    createId: () => resultId,
  });

  const [result] = await provider.search(7, 'typescript');
  assert.equal(result.provider, 'skills-sh');
  assert.equal(result.canonicalWebUrl, 'https://skills.sh/github/awesome-copilot/javascript-typescript-jest');
  assert.equal(await provider.resolve(7, result.id), resolution);
  assert.deepEqual(resolvedInput, {
    sourceUrl: 'https://github.com/github/awesome-copilot',
    requestedRef: null,
  });
  assert.deepEqual(resolvedProvenance, {
    provider: 'skills-sh',
    locator: result.canonicalWebUrl,
  });
});

function clawPackage(slug: string, ownerHandle: string): Record<string, unknown> {
  return {
    name: slug,
    displayName: 'TypeScript',
    family: 'skill',
    ownerHandle,
    summary: 'TypeScript guidance',
    latestVersion: '1.2.3',
  };
}

function storePackage(): SkillStorePackageView {
  return {
    id: packageId,
    distributionName: 'typescript',
    description: null,
    fingerprint: `v2:${fingerprint}`,
    createdAt: 50,
    updatedAt: 50,
  };
}

function sourceView(
  input: Parameters<SkillSourceRepository['attachOrRefresh']>[0],
): SkillSourceView {
  return {
    ...input,
    id: input.id,
    createdAt: input.fetchedAt,
    updatedAt: input.fetchedAt,
  };
}

function idSequence(values: string[]): () => string {
  const ids = [...values];
  return () => {
    const id = ids.shift();
    assert.ok(id, 'The test ID sequence was exhausted.');
    return id;
  };
}

async function assertSkillError(
  operation: () => Promise<unknown>,
  code: SkillOperationError['code'],
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => (
    error instanceof SkillOperationError && error.code === code
  ));
}
