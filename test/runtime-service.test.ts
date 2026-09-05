import type {
  Provider,
  RuntimeAssignment,
  RuntimeConfigurationPreview,
} from '@dhzh/foundry-api-contract';
import { expect, it, vi } from 'vitest';

import type { ProviderStore } from '../src/server/providers/store';
import type { RuntimeConfigurationManager } from '../src/server/runtimes/configuration/manager';
import type { RuntimeDetector } from '../src/server/runtimes/detection';
import { RuntimeOperationError } from '../src/server/runtimes/error';
import { LocalRuntimeService } from '../src/server/runtimes/service';
import type { RuntimeStore } from '../src/server/runtimes/store';

const provider: Extract<Provider, { runtime: 'codex' }> = {
  avatar: null,
  configuration: {
    apiKey: null,
    baseUrl: 'https://example.com/v1',
    primaryModel: 'model',
    protocol: 'responses',
    reviewModel: null,
  },
  createdAt: 1,
  id: 'provider-id',
  name: 'Provider',
  officialWebsite: null,
  remark: null,
  runtime: 'codex',
  updatedAt: 1,
};

const detection = {
  configurationExists: false,
  configurationPath: '/home/user/.codex/config.toml',
  executablePath: '/usr/local/bin/codex',
  message: null,
  status: 'detected',
  version: 'codex-cli 1.0.0',
} as const;

const assignments: RuntimeAssignment[] = [
  { appliedAt: null, managed: false, providerId: null, runtime: 'codex' },
  { appliedAt: null, managed: false, providerId: null, runtime: 'claude-code' },
];

function createService(options: {
  apply?: RuntimeConfigurationManager['apply'];
  detect?: RuntimeDetector['detect'];
  getProvider?: ProviderStore['getProvider'];
  recordAssignment?: RuntimeStore['recordAssignment'];
} = {}) {
  const runtimeStore: RuntimeStore = {
    listAssignments: () => assignments,
    recordAssignment: options.recordAssignment ?? ((runtime, target) => ({
      appliedAt: 10,
      managed: true,
      providerId: target.kind === 'provider' ? target.providerId : null,
      runtime,
    })),
  };
  const providerStore: ProviderStore = {
    createProvider: () => provider,
    getProvider: options.getProvider ?? (() => provider),
    listProviders: () => [provider],
  };
  const detector: RuntimeDetector = {
    detect: options.detect ?? ((runtime) => Promise.resolve({
      ...detection,
      configurationPath: runtime === 'codex'
        ? detection.configurationPath
        : '/home/user/.claude/settings.json',
    })),
  };
  const readyPreview = {
    changes: [],
    file: { exists: false, hash: '0'.repeat(64), path: detection.configurationPath },
    kind: 'ready',
    providerKey: 'foundry',
    runtime: 'codex',
    target: { kind: 'provider', providerId: provider.id },
    unchanged: [],
  } satisfies RuntimeConfigurationPreview;
  const configurationManager = {
    apply: options.apply ?? (() => Promise.resolve({
      rollback: () => Promise.resolve(),
    })),
    preview: () => Promise.resolve(readyPreview),
  } as RuntimeConfigurationManager;
  return new LocalRuntimeService(
    runtimeStore,
    providerStore,
    detector,
    configurationManager,
  );
}

it('lists every assignment with a fresh detection', async () => {
  await expect(createService().listRuntimes()).resolves.toMatchObject([
    { runtime: 'codex', detection: { status: 'detected' } },
    { runtime: 'claude-code', detection: { status: 'detected' } },
  ]);
});

it('requires successful detection before Preview', async () => {
  const service = createService({
    detect: () => Promise.resolve({
      ...detection,
      executablePath: null,
      message: 'codex was not found in PATH.',
      status: 'not-detected',
      version: null,
    }),
  });

  await expect(service.previewConfiguration('codex', {
    target: { kind: 'provider', providerId: provider.id },
  })).rejects.toEqual(new RuntimeOperationError(
    'RUNTIME_NOT_DETECTED',
    'codex was not found in PATH.',
  ));
});

it('rejects missing or cross-Runtime Providers', async () => {
  const service = createService({ getProvider: () => null });

  await expect(service.previewConfiguration('codex', {
    target: { kind: 'provider', providerId: 'missing' },
  })).rejects.toEqual(new RuntimeOperationError(
    'PROVIDER_NOT_FOUND',
    'The selected Provider is unavailable.',
  ));
});

it('writes the file before recording assignment', async () => {
  const order: string[] = [];
  const service = createService({
    apply: () => {
      order.push('file');
      return Promise.resolve({ rollback: () => Promise.resolve() });
    },
    recordAssignment: (runtime, target) => {
      order.push('database');
      return {
        appliedAt: 10,
        managed: true,
        providerId: target.kind === 'provider' ? target.providerId : null,
        runtime,
      };
    },
  });

  await expect(service.applyConfiguration('codex', {
    expectedFileHash: '0'.repeat(64),
    target: { kind: 'provider', providerId: provider.id },
  })).resolves.toMatchObject({
    detection: { configurationExists: true },
    providerId: provider.id,
  });
  expect(order).toEqual(['file', 'database']);
});

it('rolls back the file when assignment persistence fails', async () => {
  const rollback = vi.fn(() => Promise.resolve());
  const service = createService({
    apply: () => Promise.resolve({ rollback }),
    recordAssignment: () => {
      throw new Error('database failed');
    },
  });

  await expect(service.applyConfiguration('codex', {
    expectedFileHash: '0'.repeat(64),
    target: { kind: 'provider', providerId: provider.id },
  })).rejects.toThrow('database failed');
  expect(rollback).toHaveBeenCalledOnce();
});
