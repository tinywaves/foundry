import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
  SkillChangedNotification,
  SkillDiscoveryResult,
  SkillWatchSessionStart,
} from '../../shared/skill-contract';
import { SkillOperationError } from './skill-error';
import { parseSkillWatchSessionId } from './skill-validation';

const DEFAULT_DEBOUNCE_MILLISECONDS = 250;

export interface SkillFilesystemWatcher {
  close: () => Promise<void>;
}

export type SkillWatchFactory = (
  paths: readonly string[],
  onChange: () => void,
  onError: () => void,
) => SkillFilesystemWatcher;

interface SkillWatchCoordinatorOptions {
  reconcileStore: () => Promise<unknown>;
  scan: () => Promise<SkillDiscoveryResult>;
  resolveWatchPaths: () => Promise<string[]>;
  watchFactory: SkillWatchFactory;
  onChanged: (
    ownerIds: ReadonlySet<number>,
    notification: SkillChangedNotification,
  ) => void;
  createSessionId?: () => string;
  debounceMilliseconds?: number;
  schedule?: (callback: () => void, delay: number) => unknown;
  cancelSchedule?: (handle: unknown) => void;
}

export class SkillWatchCoordinator {
  private readonly cancelSchedule: (handle: unknown) => void;
  private readonly createSessionId: () => string;
  private readonly debounceMilliseconds: number;
  private readonly owners = new Set<number>();
  private readonly schedule: (callback: () => void, delay: number) => unknown;
  private readonly sessions = new Map<string, number>();
  private isDisposed = false;
  private isObservationRunning = false;
  private hasPendingObservation = false;
  private lifecycleTail: Promise<void> = Promise.resolve();
  private notificationSequence = 0;
  private observationTail: Promise<void> = Promise.resolve();
  private scheduledObservation: unknown;
  private watcher: SkillFilesystemWatcher | undefined;
  private watchPaths: string[] = [];

  constructor(private readonly options: SkillWatchCoordinatorOptions) {
    this.createSessionId = options.createSessionId ?? randomUUID;
    this.debounceMilliseconds = parseNonNegativeInteger(
      options.debounceMilliseconds ?? DEFAULT_DEBOUNCE_MILLISECONDS,
    );
    this.schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
    this.cancelSchedule = options.cancelSchedule ?? ((handle) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    });
  }

  private activeOwnerIds(): Set<number> {
    return new Set(this.sessions.values());
  }

  private emitChange(reason: SkillChangedNotification['reason']): void {
    const ownerIds = this.activeOwnerIds();
    if (ownerIds.size === 0 || this.isDisposed) {
      return;
    }
    this.notificationSequence += 1;
    this.options.onChanged(ownerIds, {
      reason,
      sequence: this.notificationSequence,
    });
  }

  private handleFilesystemChange(): void {
    if (this.isDisposed || this.sessions.size === 0) {
      return;
    }
    if (this.isObservationRunning) {
      this.hasPendingObservation = true;
      return;
    }
    if (this.scheduledObservation !== undefined) {
      return;
    }
    this.scheduledObservation = this.schedule(() => {
      this.scheduledObservation = undefined;
      const observation = this.runScheduledObservation();
      this.observationTail = observation;
    }, this.debounceMilliseconds);
  }

  private async runScheduledObservation(): Promise<void> {
    this.isObservationRunning = true;
    try {
      await this.runWatchObservation();
    } finally {
      this.isObservationRunning = false;
      if (this.hasPendingObservation) {
        this.hasPendingObservation = false;
        this.handleFilesystemChange();
      }
    }
  }

  private async observe(): Promise<SkillDiscoveryResult> {
    await this.options.reconcileStore();
    return this.options.scan();
  }

  private async reconcileWatcher(): Promise<void> {
    await this.serializeLifecycle(async () => {
      if (this.isDisposed || this.sessions.size === 0) {
        await this.stopWatcher();
        return;
      }
      const watchPaths = normalizeWatchPaths(await this.options.resolveWatchPaths());
      if (areEqualPaths(watchPaths, this.watchPaths) && this.watcher) {
        return;
      }
      await this.stopWatcher();
      this.watcher = this.options.watchFactory(
        watchPaths,
        () => this.handleFilesystemChange(),
        () => this.emitChange('watch-error'),
      );
      this.watchPaths = watchPaths;
    });
  }

  private async runWatchObservation(): Promise<void> {
    try {
      await this.observe();
      await this.reconcileWatcher();
      this.emitChange('filesystem');
    } catch {
      this.emitChange('watch-error');
    }
  }

  private async serializeLifecycle<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.lifecycleTail;
    const gate = Promise.withResolvers<undefined>();
    this.lifecycleTail = gate.promise;
    await previous;
    try {
      return await operation();
    } finally {
      gate.resolve(undefined);
    }
  }

  private async startWatcher(): Promise<void> {
    const watchPaths = normalizeWatchPaths(await this.options.resolveWatchPaths());
    this.watcher = this.options.watchFactory(
      watchPaths,
      () => this.handleFilesystemChange(),
      () => this.emitChange('watch-error'),
    );
    this.watchPaths = watchPaths;
  }

  private async stopWatcher(): Promise<void> {
    const watcher = this.watcher;
    this.watcher = undefined;
    this.watchPaths = [];
    if (watcher) {
      await watcher.close();
    }
  }

  registerOwner(ownerId: number): void {
    if (!Number.isSafeInteger(ownerId) || ownerId < 0 || this.isDisposed) {
      throw new SkillOperationError('internal', 'The Skills window is unavailable.');
    }
    this.owners.add(ownerId);
  }

  async beginSession(ownerId: number): Promise<SkillWatchSessionStart> {
    if (!this.owners.has(ownerId) || this.isDisposed) {
      throw new SkillOperationError('internal', 'The Skills window is unavailable.');
    }
    const scan = await this.observe();
    return this.serializeLifecycle(async () => {
      if (!this.owners.has(ownerId) || this.isDisposed) {
        throw new SkillOperationError('internal', 'The Skills window is unavailable.');
      }
      const sessionId = parseSkillWatchSessionId(this.createSessionId());
      if (this.sessions.has(sessionId)) {
        throw new SkillOperationError('internal', 'The Watch Session could not be created.');
      }
      this.sessions.set(sessionId, ownerId);
      try {
        if (this.sessions.size === 1) {
          await this.startWatcher();
        }
      } catch (error) {
        this.sessions.delete(sessionId);
        throw error;
      }
      return { sessionId, scan };
    });
  }

  endSession(ownerId: number, sessionIdValue: unknown): Promise<boolean> {
    const sessionId = parseSkillWatchSessionId(sessionIdValue);
    return this.serializeLifecycle(async () => {
      const sessionOwnerId = this.sessions.get(sessionId);
      if (sessionOwnerId === undefined) {
        return false;
      }
      if (sessionOwnerId !== ownerId) {
        throw new SkillOperationError('invalid-input', 'The Watch Session belongs to another window.');
      }
      this.sessions.delete(sessionId);
      if (this.sessions.size === 0) {
        await this.stopWatcher();
      }
      return true;
    });
  }

  releaseOwner(ownerId: number): Promise<void> {
    this.owners.delete(ownerId);
    return this.serializeLifecycle(async () => {
      for (const [sessionId, sessionOwnerId] of this.sessions) {
        if (sessionOwnerId === ownerId) {
          this.sessions.delete(sessionId);
        }
      }
      if (this.sessions.size === 0) {
        await this.stopWatcher();
      }
    });
  }

  refreshWatchPaths(): Promise<void> {
    return this.reconcileWatcher();
  }

  async whenIdle(): Promise<void> {
    await this.observationTail;
    await this.lifecycleTail;
  }

  async dispose(): Promise<void> {
    this.isDisposed = true;
    this.owners.clear();
    this.sessions.clear();
    this.hasPendingObservation = false;
    if (this.scheduledObservation !== undefined) {
      this.cancelSchedule(this.scheduledObservation);
      this.scheduledObservation = undefined;
    }
    await this.observationTail;
    await this.serializeLifecycle(() => this.stopWatcher());
  }
}

function normalizeWatchPaths(paths: readonly string[]): string[] {
  return [...new Set(paths.map((watchPath) => path.resolve(watchPath)))]
    .toSorted((left, right) => left.localeCompare(right));
}

function areEqualPaths(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((entry, index) => entry === right[index]);
}

function parseNonNegativeInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Skill watcher delay is invalid.');
  }
  return value;
}
