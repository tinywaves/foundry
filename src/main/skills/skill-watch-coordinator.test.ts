import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillChangedNotification,
  SkillDiscoveryResult,
} from '../../shared/skill-contract';
import type {
  SkillFilesystemWatcher,
  SkillWatchFactory,
} from './skill-watch-coordinator';
import { SkillWatchCoordinator } from './skill-watch-coordinator';

const firstSessionId = '00000000-0000-4000-8000-000000000801';
const secondSessionId = '00000000-0000-4000-8000-000000000802';

const emptyScan: SkillDiscoveryResult = {
  roots: [],
  rootsInspected: 0,
  packagesFound: 0,
  packagesImported: 0,
  installationsAdopted: 0,
  observationsUpdated: 0,
  warnings: [],
  rootFailures: [],
};

test('starts one watcher for multiple owners and closes it after the final session ends', async () => {
  const sessionIds = [firstSessionId, secondSessionId];
  let scanCount = 0;
  let reconcileCount = 0;
  let watcherCreateCount = 0;
  let watcherCloseCount = 0;
  const watchFactory: SkillWatchFactory = () => {
    watcherCreateCount += 1;
    return {
      close: () => {
        watcherCloseCount += 1;
        return Promise.resolve();
      },
    };
  };
  const coordinator = new SkillWatchCoordinator({
    createSessionId: () => sessionIds.shift()!,
    reconcileStore: () => {
      reconcileCount += 1;
      return Promise.resolve();
    },
    scan: () => {
      scanCount += 1;
      return Promise.resolve(emptyScan);
    },
    resolveWatchPaths: () => Promise.resolve(['/store', '/target']),
    watchFactory,
    onChanged: () => {},
  });

  coordinator.registerOwner(1);
  coordinator.registerOwner(2);
  const first = await coordinator.beginSession(1);
  const second = await coordinator.beginSession(2);

  assert.equal(first.sessionId, firstSessionId);
  assert.equal(second.sessionId, secondSessionId);
  assert.equal(scanCount, 2);
  assert.equal(reconcileCount, 2);
  assert.equal(watcherCreateCount, 1);
  await assert.rejects(() => coordinator.endSession(2, firstSessionId));
  assert.equal(await coordinator.endSession(1, firstSessionId), true);
  assert.equal(watcherCloseCount, 0);
  assert.equal(await coordinator.endSession(2, secondSessionId), true);
  assert.equal(await coordinator.endSession(2, secondSessionId), false);
  assert.equal(watcherCloseCount, 1);
});

test('coalesces watcher events and sends payload-minimal notifications to active owners', async () => {
  let listener: (() => void) | undefined;
  let errorListener: (() => void) | undefined;
  let scheduled: (() => void) | undefined;
  let scanCount = 0;
  let reconcileCount = 0;
  const notifications: Array<{
    owners: number[];
    notification: SkillChangedNotification;
  }> = [];
  const watchFactory: SkillWatchFactory = (_paths, onChange, onError) => {
    listener = onChange;
    errorListener = onError;
    return { close: () => Promise.resolve() } satisfies SkillFilesystemWatcher;
  };
  const coordinator = new SkillWatchCoordinator({
    createSessionId: () => firstSessionId,
    reconcileStore: () => {
      reconcileCount += 1;
      return Promise.resolve();
    },
    scan: () => {
      scanCount += 1;
      return Promise.resolve(emptyScan);
    },
    resolveWatchPaths: () => Promise.resolve(['/store']),
    watchFactory,
    onChanged: (owners, notification) => {
      notifications.push({ owners: [...owners], notification });
    },
    schedule: (callback) => {
      scheduled = callback;
      return 1;
    },
    cancelSchedule: () => {
      scheduled = undefined;
    },
  });
  coordinator.registerOwner(7);
  await coordinator.beginSession(7);
  scanCount = 0;
  reconcileCount = 0;

  listener?.();
  listener?.();
  assert.ok(scheduled);
  const runScheduled = scheduled;
  runScheduled();
  await coordinator.whenIdle();

  assert.equal(reconcileCount, 1);
  assert.equal(scanCount, 1);
  assert.deepEqual(notifications, [
    {
      owners: [7],
      notification: { reason: 'filesystem', sequence: 1 },
    },
  ]);
  errorListener?.();
  assert.deepEqual(notifications.at(-1), {
    owners: [7],
    notification: { reason: 'watch-error', sequence: 2 },
  });
});

test('destroyed owners and disposal close sessions without leaking a late watcher', async () => {
  const scanGate = Promise.withResolvers<SkillDiscoveryResult>();
  let watcherCreateCount = 0;
  const coordinator = new SkillWatchCoordinator({
    createSessionId: () => firstSessionId,
    reconcileStore: () => Promise.resolve(),
    scan: () => scanGate.promise,
    resolveWatchPaths: () => Promise.resolve(['/store']),
    watchFactory: () => {
      watcherCreateCount += 1;
      return { close: () => Promise.resolve() };
    },
    onChanged: () => {},
  });
  coordinator.registerOwner(9);
  const beginning = coordinator.beginSession(9);
  await Promise.resolve();
  await coordinator.releaseOwner(9);
  scanGate.resolve(emptyScan);

  await assert.rejects(() => beginning);
  assert.equal(watcherCreateCount, 0);
  await coordinator.dispose();
});
