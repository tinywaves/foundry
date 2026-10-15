import type {
  Provider,
  ProviderRuntime,
  RuntimeConfigurationPreview,
  RuntimeConfigurationTarget,
  RuntimeSummary,
} from '@dhzh/foundry-api-contract';
import { providerRuntimes } from '@dhzh/foundry-api-contract';

import type { ProviderStore } from '../providers/store';
import type { RuntimeConfigurationManager } from './configuration/manager';
import type { RuntimeDetector } from './detection';
import { RuntimeOperationError } from './error';
import type { RuntimeStore } from './store';

export interface RuntimeService {
  applyConfiguration: (
    runtime: ProviderRuntime,
    input: {
      expectedFileHash: string;
      providerKey?: string;
      target: RuntimeConfigurationTarget;
    },
  ) => Promise<RuntimeSummary>;
  listRuntimes: () => Promise<RuntimeSummary[]>;
  previewConfiguration: (
    runtime: ProviderRuntime,
    input: {
      providerKey?: string;
      target: RuntimeConfigurationTarget;
    },
  ) => Promise<RuntimeConfigurationPreview>;
}

export class LocalRuntimeService implements RuntimeService {
  private readonly inFlightRuntimes = new Set<ProviderRuntime>();

  constructor(
    private readonly runtimeStore: RuntimeStore,
    private readonly providerStore: ProviderStore,
    private readonly detector: RuntimeDetector,
    private readonly configurationManager: RuntimeConfigurationManager,
  ) {}

  private resolveProvider(
    runtime: ProviderRuntime,
    target: RuntimeConfigurationTarget,
  ): Provider | null {
    if (target.kind === 'official-default') {
      return null;
    }
    const provider = this.providerStore.getProvider(target.providerId);
    if (provider?.runtime !== runtime) {
      throw new RuntimeOperationError(
        'PROVIDER_NOT_FOUND',
        'The selected Provider is unavailable.',
      );
    }
    return provider;
  }

  private async requireDetection(runtime: ProviderRuntime) {
    const detection = await this.detector.detect(runtime);
    if (detection.status !== 'detected') {
      throw new RuntimeOperationError(
        'RUNTIME_NOT_DETECTED',
        detection.message ?? 'The Runtime could not be detected.',
      );
    }
    return detection;
  }

  async listRuntimes(): Promise<RuntimeSummary[]> {
    const assignments = new Map(
      this.runtimeStore.listAssignments().map((assignment) => [
        assignment.runtime,
        assignment,
      ]),
    );
    const detections = await Promise.all(
      providerRuntimes.map((runtime) => this.detector.detect(runtime)),
    );

    return providerRuntimes.map((runtime, index) => {
      const assignment = assignments.get(runtime);
      if (!assignment) {
        throw new Error(`Runtime assignment ${runtime} is missing.`);
      }
      return { ...assignment, detection: detections[index] };
    });
  }

  async previewConfiguration(
    runtime: ProviderRuntime,
    input: {
      providerKey?: string;
      target: RuntimeConfigurationTarget;
    },
  ): Promise<RuntimeConfigurationPreview> {
    const detection = await this.requireDetection(runtime);
    const provider = this.resolveProvider(runtime, input.target);
    return this.configurationManager.preview(
      runtime,
      detection.configurationPath,
      input.target,
      provider,
      input.providerKey,
    );
  }

  async applyConfiguration(
    runtime: ProviderRuntime,
    input: {
      expectedFileHash: string;
      providerKey?: string;
      target: RuntimeConfigurationTarget;
    },
  ): Promise<RuntimeSummary> {
    if (this.inFlightRuntimes.has(runtime)) {
      throw new RuntimeOperationError(
        'RUNTIME_APPLY_FAILED',
        'A configuration update is already running for this Runtime.',
      );
    }
    this.inFlightRuntimes.add(runtime);
    try {
      const detection = await this.requireDetection(runtime);
      const provider = this.resolveProvider(runtime, input.target);
      const change = await this.configurationManager.apply(
        runtime,
        detection.configurationPath,
        input.target,
        provider,
        input.expectedFileHash,
        input.providerKey,
      );
      try {
        const assignment = this.runtimeStore.recordAssignment(runtime, input.target);
        return {
          ...assignment,
          detection: { ...detection, configurationExists: true },
        };
      } catch (error) {
        await change.rollback();
        throw error;
      }
    } finally {
      this.inFlightRuntimes.delete(runtime);
    }
  }
}
