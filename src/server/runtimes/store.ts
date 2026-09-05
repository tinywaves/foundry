import type {
  ProviderRuntime,
  RuntimeAssignment,
  RuntimeConfigurationTarget,
} from '@dhzh/foundry-api-contract';
import { providerRuntimes } from '@dhzh/foundry-api-contract';
import { and, eq, isNull } from 'drizzle-orm';

import type { FoundryDatabase } from '../database';
import { providers, runtimes } from '../database/schema';
import { RuntimeOperationError } from './error';

export interface RuntimeStore {
  listAssignments: () => RuntimeAssignment[];
  recordAssignment: (
    runtime: ProviderRuntime,
    target: RuntimeConfigurationTarget,
  ) => RuntimeAssignment;
}

export class DrizzleRuntimeStore implements RuntimeStore {
  constructor(
    private readonly database: FoundryDatabase['db'],
    private readonly now: () => number = Date.now,
  ) {}

  listAssignments(): RuntimeAssignment[] {
    const assignments = new Map(
      this.database.select().from(runtimes).all().map((row) => [
        row.runtime,
        {
          appliedAt: row.appliedAt,
          managed: row.managed,
          providerId: row.providerId,
          runtime: row.runtime,
        } satisfies RuntimeAssignment,
      ]),
    );

    return providerRuntimes.map((runtime) => {
      const assignment = assignments.get(runtime);
      if (!assignment) {
        throw new Error(`Runtime assignment ${runtime} is missing.`);
      }
      return assignment;
    });
  }

  recordAssignment(
    runtime: ProviderRuntime,
    target: RuntimeConfigurationTarget,
  ): RuntimeAssignment {
    return this.database.transaction(() => {
      const providerId = target.kind === 'provider' ? target.providerId : null;
      if (providerId !== null) {
        const provider = this.database.select({ runtime: providers.runtime })
          .from(providers)
          .where(and(
            eq(providers.id, providerId),
            eq(providers.runtime, runtime),
            isNull(providers.deletedAt),
          ))
          .get();
        if (!provider) {
          throw new RuntimeOperationError(
            'PROVIDER_NOT_FOUND',
            'The selected Provider is unavailable.',
          );
        }
      }

      const appliedAt = this.now();
      const result = this.database.update(runtimes).set({
        appliedAt,
        managed: true,
        providerId,
      }).where(eq(runtimes.runtime, runtime)).run();
      if (result.changes !== 1) {
        throw new Error(`Runtime assignment ${runtime} could not be saved.`);
      }

      return {
        appliedAt,
        managed: true,
        providerId,
        runtime,
      };
    });
  }
}
