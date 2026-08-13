import assert from 'node:assert/strict';
import { test } from 'vitest';
import { RuntimeOperationError } from './runtime-error';
import type {
  ChatGptNativeCommandExecutor,
  ChatGptNativeOperations,
} from './chatgpt-application-controller';
import {
  CHATGPT_APPLICATION_BUNDLE_IDENTIFIER,
  CHATGPT_APPLICATION_POLL_INTERVAL_MS,
  CHATGPT_APPLICATION_STAGE_TIMEOUT_MS,
  ChatGptApplicationController,
  MacOsChatGptNativeOperations,
} from './chatgpt-application-controller';

interface NativeOperationHarness {
  nativeOperations: ChatGptNativeOperations;
  calls: string[];
  setStates: (states: Array<boolean | Error>) => void;
  setTermination: (termination: 'accepted' | 'rejected' | 'not-running' | Error) => void;
  setReopenError: (error: Error | undefined) => void;
}

function createNativeOperationHarness(
  initialStates: Array<boolean | Error> = [false],
): NativeOperationHarness {
  const calls: string[] = [];
  let states = [...initialStates];
  let termination: 'accepted' | 'rejected' | 'not-running' | Error = 'accepted';
  let reopenError: Error | undefined;
  const nativeOperations: ChatGptNativeOperations = {
    isRunning: () => {
      calls.push('status');
      const state = states.length > 1 ? states.shift() : states[0];
      if (state instanceof Error) {
        return Promise.reject(state);
      }
      return Promise.resolve(state ?? false);
    },
    requestTermination: () => {
      calls.push('terminate');
      return termination instanceof Error
        ? Promise.reject(termination)
        : Promise.resolve(termination);
    },
    reopen: () => {
      calls.push('reopen');
      return reopenError === undefined ? Promise.resolve() : Promise.reject(reopenError);
    },
  };
  return {
    nativeOperations,
    calls,
    setStates(nextStates) {
      states = [...nextStates];
    },
    setTermination(nextTermination) {
      termination = nextTermination;
    },
    setReopenError(error) {
      reopenError = error;
    },
  };
}

function createVirtualClock() {
  let now = 0;
  const waits: number[] = [];
  return {
    now: () => now,
    wait: (durationMs: number) => {
      waits.push(durationMs);
      now += durationMs;
      return Promise.resolve();
    },
    waits,
  };
}

test('uses only fixed native executables and the verified ChatGPT bundle identifier', async () => {
  const calls: Array<{ executable: string; arguments_: readonly string[] }> = [];
  const outputs = [
    JSON.stringify({ running: true }),
    JSON.stringify({ running: true, accepted: true }),
    '',
  ];
  const execute: ChatGptNativeCommandExecutor = (executable, arguments_) => {
    calls.push({ executable, arguments_ });
    return Promise.resolve(outputs.shift() ?? '');
  };
  const operations = new MacOsChatGptNativeOperations(execute);

  assert.equal(await operations.isRunning(), true);
  assert.equal(await operations.requestTermination(), 'accepted');
  await operations.reopen();

  assert.equal(CHATGPT_APPLICATION_BUNDLE_IDENTIFIER, 'com.openai.codex');
  assert.deepEqual(calls.map(({ executable }) => executable), [
    '/usr/bin/osascript',
    '/usr/bin/osascript',
    '/usr/bin/open',
  ]);
  for (const { arguments_ } of calls) {
    assert.equal(arguments_.includes(CHATGPT_APPLICATION_BUNDLE_IDENTIFIER), true);
    assert.equal(arguments_.includes('ChatGPT'), false);
  }
  assert.deepEqual(calls[2]?.arguments_, ['-b', CHATGPT_APPLICATION_BUNDLE_IDENTIFIER]);
});

test('rejects malformed native output without exposing it as a running state', async () => {
  const invalidValues = ['', 'null', '[]', '{}', '{"running":"yes"}'];
  for (const value of invalidValues) {
    const operations = new MacOsChatGptNativeOperations(() => Promise.resolve(value));
    const controller = new ChatGptApplicationController({
      nativeOperations: operations,
      platform: 'darwin',
    });
    assert.equal(await controller.getState(), 'unavailable');
  }
});

test('reports state without invoking native control on non-macOS platforms', async () => {
  const harness = createNativeOperationHarness([true]);
  const controller = new ChatGptApplicationController({
    nativeOperations: harness.nativeOperations,
    platform: 'linux',
  });

  assert.equal(await controller.getState(), 'unavailable');
  assert.equal(await controller.restart(), 'unavailable');
  assert.deepEqual(harness.calls, []);
});

test('distinguishes running, not-running, and unavailable state queries', async () => {
  const harness = createNativeOperationHarness([true]);
  const controller = new ChatGptApplicationController({
    nativeOperations: harness.nativeOperations,
    platform: 'darwin',
  });

  assert.equal(await controller.getState(), 'running');
  harness.setStates([false]);
  assert.equal(await controller.getState(), 'not-running');
  harness.setStates([new Error('private native state error')]);
  assert.equal(await controller.getState(), 'unavailable');
});

test('rechecks execution state and never opens an application that is no longer running', async () => {
  const harness = createNativeOperationHarness([false]);
  const controller = new ChatGptApplicationController({
    nativeOperations: harness.nativeOperations,
    platform: 'darwin',
  });

  assert.equal(await controller.restart(), 'not-running');
  assert.deepEqual(harness.calls, ['status']);

  harness.calls.length = 0;
  harness.setStates([true]);
  harness.setTermination('not-running');
  assert.equal(await controller.restart(), 'not-running');
  assert.deepEqual(harness.calls, ['status', 'terminate']);
});

test('gracefully exits and reopens ChatGPT before reporting a successful restart', async () => {
  const harness = createNativeOperationHarness([true, true, false, false, true]);
  const clock = createVirtualClock();
  const controller = new ChatGptApplicationController({
    nativeOperations: harness.nativeOperations,
    platform: 'darwin',
    now: clock.now,
    wait: clock.wait,
  });

  assert.equal(await controller.restart(), 'restarted');
  assert.deepEqual(harness.calls, [
    'status',
    'terminate',
    'status',
    'status',
    'reopen',
    'status',
    'status',
  ]);
  assert.deepEqual(clock.waits, [
    CHATGPT_APPLICATION_POLL_INTERVAL_MS,
    CHATGPT_APPLICATION_POLL_INTERVAL_MS,
  ]);
});

test('does not reopen when quit is rejected or fails', async () => {
  for (const termination of [
    'rejected' as const,
    new Error('private termination failure'),
  ]) {
    const harness = createNativeOperationHarness([true]);
    harness.setTermination(termination);
    const controller = new ChatGptApplicationController({
      nativeOperations: harness.nativeOperations,
      platform: 'darwin',
    });

    assert.equal(await controller.restart(), 'quit-failed');
    assert.equal(harness.calls.includes('reopen'), false);
  }
});

test('bounds graceful exit polling at 15 seconds without force termination', async () => {
  const harness = createNativeOperationHarness([true]);
  const clock = createVirtualClock();
  const controller = new ChatGptApplicationController({
    nativeOperations: harness.nativeOperations,
    platform: 'darwin',
    now: clock.now,
    wait: clock.wait,
  });

  assert.equal(await controller.restart(), 'quit-failed');
  assert.equal(clock.waits.reduce((total, duration) => total + duration, 0), 15_000);
  assert.equal(clock.waits.every((duration) => duration === 250), true);
  assert.equal(harness.calls.includes('reopen'), false);
  assert.equal('forceTerminate' in harness.nativeOperations, false);
});

test('returns reopen failure for launch errors and the bounded reopen timeout', async () => {
  const launchFailure = createNativeOperationHarness([true, false]);
  launchFailure.setReopenError(new Error('private launch failure'));
  const launchController = new ChatGptApplicationController({
    nativeOperations: launchFailure.nativeOperations,
    platform: 'darwin',
  });
  assert.equal(await launchController.restart(), 'reopen-failed');

  const timeoutHarness = createNativeOperationHarness([true, false]);
  const clock = createVirtualClock();
  const timeoutController = new ChatGptApplicationController({
    nativeOperations: timeoutHarness.nativeOperations,
    platform: 'darwin',
    now: clock.now,
    wait: clock.wait,
  });
  assert.equal(await timeoutController.restart(), 'reopen-failed');
  assert.equal(clock.waits.reduce((total, duration) => total + duration, 0), 15_000);
  assert.equal(timeoutHarness.calls.includes('reopen'), true);
});

test('maps initial lookup failure to unavailable and later lookup failures to their stage', async () => {
  const initialFailure = createNativeOperationHarness([new Error('private lookup failure')]);
  const initialController = new ChatGptApplicationController({
    nativeOperations: initialFailure.nativeOperations,
    platform: 'darwin',
  });
  assert.equal(await initialController.restart(), 'unavailable');

  const quitFailure = createNativeOperationHarness([
    true,
    new Error('private quit polling failure'),
  ]);
  const quitController = new ChatGptApplicationController({
    nativeOperations: quitFailure.nativeOperations,
    platform: 'darwin',
  });
  assert.equal(await quitController.restart(), 'quit-failed');

  const reopenFailure = createNativeOperationHarness([
    true,
    false,
    new Error('private reopen polling failure'),
  ]);
  const reopenController = new ChatGptApplicationController({
    nativeOperations: reopenFailure.nativeOperations,
    platform: 'darwin',
  });
  assert.equal(await reopenController.restart(), 'reopen-failed');
});

test('rejects concurrent restarts and releases the guard after completion', async () => {
  const gate = Promise.withResolvers<boolean>();
  let stateCalls = 0;
  const nativeOperations: ChatGptNativeOperations = {
    isRunning: () => {
      stateCalls += 1;
      return stateCalls === 1 ? gate.promise : Promise.resolve(false);
    },
    requestTermination: () => Promise.resolve('accepted'),
    reopen: () => Promise.resolve(),
  };
  const controller = new ChatGptApplicationController({ nativeOperations, platform: 'darwin' });
  const first = controller.restart();
  await Promise.resolve();

  await assert.rejects(
    controller.restart(),
    (error: unknown) => error instanceof RuntimeOperationError && error.code === 'conflict',
  );
  gate.resolve(false);
  assert.equal(await first, 'not-running');
  assert.equal(await controller.restart(), 'not-running');
});

test('uses the approved polling and timeout constants', () => {
  assert.equal(CHATGPT_APPLICATION_POLL_INTERVAL_MS, 250);
  assert.equal(CHATGPT_APPLICATION_STAGE_TIMEOUT_MS, 15_000);
});
