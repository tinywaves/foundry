import { execFile } from 'node:child_process';
import process from 'node:process';
import type {
  ChatGptApplicationState,
  ChatGptRestartResult,
} from '../../shared/runtime-contract';
import { RuntimeOperationError } from './runtime-error';

export const CHATGPT_APPLICATION_BUNDLE_IDENTIFIER = 'com.openai.codex';
export const CHATGPT_APPLICATION_POLL_INTERVAL_MS = 250;
export const CHATGPT_APPLICATION_STAGE_TIMEOUT_MS = 15_000;

const NATIVE_COMMAND_TIMEOUT_MS = 5000;
const CHATGPT_APPLICATION_SCRIPT = `
ObjC.import("AppKit");

function run(argv) {
  const operation = argv[0];
  const bundleIdentifier = argv[1];
  const applications = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(
    bundleIdentifier,
  );
  const count = Number(applications.count);

  if (operation === "status") {
    return JSON.stringify({ running: count > 0 });
  }

  if (operation === "terminate") {
    if (count === 0) {
      return JSON.stringify({ running: false });
    }

    let accepted = true;
    for (let index = 0; index < count; index += 1) {
      accepted = Boolean(applications.objectAtIndex(index).terminate) && accepted;
    }
    return JSON.stringify({ running: true, accepted });
  }

  throw new Error("Unsupported ChatGPT application operation.");
}
`.trim();

type ChatGptTerminationRequest = 'accepted' | 'rejected' | 'not-running';

export interface ChatGptNativeOperations {
  isRunning: (timeoutMs?: number) => Promise<boolean>;
  requestTermination: (timeoutMs?: number) => Promise<ChatGptTerminationRequest>;
  reopen: (timeoutMs?: number) => Promise<void>;
}

export type ChatGptNativeCommandExecutor = (
  executable: string,
  arguments_: readonly string[],
  timeoutMs: number,
) => Promise<string>;

export interface ChatGptApplicationControllerOptions {
  nativeOperations?: ChatGptNativeOperations;
  platform?: typeof process.platform;
  wait?: (durationMs: number) => Promise<void>;
  now?: () => number;
}

interface NativeStatusOutput {
  running: boolean;
}

interface NativeTerminationOutput {
  running: boolean;
  accepted?: boolean;
}

function executeNativeCommand(
  executable: string,
  arguments_: readonly string[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(executable, [...arguments_], {
      encoding: 'utf8',
      maxBuffer: 4096,
      timeout: timeoutMs,
      windowsHide: true,
    }, (error, stdout) => {
      if (error) {
        reject(error instanceof Error ? error : new Error('Native command failed.'));
        return;
      }
      resolve(stdout);
    });
  });
}

function parseNativeOutput(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value.trim());
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Invalid ChatGPT application response.');
  }
  return parsed as Record<string, unknown>;
}

function parseStatusOutput(value: string): NativeStatusOutput {
  const parsed = parseNativeOutput(value);
  if (typeof parsed.running !== 'boolean') {
    throw new TypeError('Invalid ChatGPT application state.');
  }
  return { running: parsed.running };
}

function parseTerminationOutput(value: string): NativeTerminationOutput {
  const parsed = parseNativeOutput(value);
  if (typeof parsed.running !== 'boolean') {
    throw new TypeError('Invalid ChatGPT termination state.');
  }
  if (!parsed.running) {
    return { running: false };
  }
  if (typeof parsed.accepted !== 'boolean') {
    throw new TypeError('Invalid ChatGPT termination result.');
  }
  return { running: true, accepted: parsed.accepted };
}

export class MacOsChatGptNativeOperations implements ChatGptNativeOperations {
  constructor(
    private readonly execute: ChatGptNativeCommandExecutor = executeNativeCommand,
  ) {}

  async isRunning(timeoutMs = NATIVE_COMMAND_TIMEOUT_MS): Promise<boolean> {
    const output = await this.execute('/usr/bin/osascript', [
      '-l',
      'JavaScript',
      '-e',
      CHATGPT_APPLICATION_SCRIPT,
      '--',
      'status',
      CHATGPT_APPLICATION_BUNDLE_IDENTIFIER,
    ], timeoutMs);
    return parseStatusOutput(output).running;
  }

  async requestTermination(timeoutMs = NATIVE_COMMAND_TIMEOUT_MS): Promise<ChatGptTerminationRequest> {
    const output = await this.execute('/usr/bin/osascript', [
      '-l',
      'JavaScript',
      '-e',
      CHATGPT_APPLICATION_SCRIPT,
      '--',
      'terminate',
      CHATGPT_APPLICATION_BUNDLE_IDENTIFIER,
    ], timeoutMs);
    const result = parseTerminationOutput(output);
    if (!result.running) {
      return 'not-running';
    }
    return result.accepted ? 'accepted' : 'rejected';
  }

  async reopen(timeoutMs = NATIVE_COMMAND_TIMEOUT_MS): Promise<void> {
    await this.execute('/usr/bin/open', [
      '-b',
      CHATGPT_APPLICATION_BUNDLE_IDENTIFIER,
    ], timeoutMs);
  }
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export class ChatGptApplicationController {
  private readonly nativeOperations: ChatGptNativeOperations;
  private readonly platform: typeof process.platform;
  private readonly wait: (durationMs: number) => Promise<void>;
  private readonly now: () => number;
  private isRestarting = false;

  constructor(options: ChatGptApplicationControllerOptions = {}) {
    this.nativeOperations = options.nativeOperations ?? new MacOsChatGptNativeOperations();
    this.platform = options.platform ?? process.platform;
    this.wait = options.wait ?? wait;
    this.now = options.now ?? Date.now;
  }

  private getRemainingStageTime(deadline: number): number {
    return Math.max(0, deadline - this.now());
  }

  private async isRunningWithin(deadline: number): Promise<boolean> {
    const remainingMs = this.getRemainingStageTime(deadline);
    if (remainingMs === 0) {
      throw new Error('ChatGPT application stage timed out.');
    }
    return this.nativeOperations.isRunning(Math.min(NATIVE_COMMAND_TIMEOUT_MS, remainingMs));
  }

  private async waitForRunningState(
    isExpectedRunning: boolean,
    deadline: number,
  ): Promise<boolean> {
    if (await this.isRunningWithin(deadline) === isExpectedRunning) {
      return true;
    }
    for (
      let remainingMs = this.getRemainingStageTime(deadline);
      remainingMs > 0;
      remainingMs = this.getRemainingStageTime(deadline)
    ) {
      await this.wait(Math.min(CHATGPT_APPLICATION_POLL_INTERVAL_MS, remainingMs));
      if (await this.isRunningWithin(deadline) === isExpectedRunning) {
        return true;
      }
    }
    return false;
  }

  async getState(): Promise<ChatGptApplicationState> {
    if (this.platform !== 'darwin') {
      return 'unavailable';
    }
    try {
      return await this.nativeOperations.isRunning() ? 'running' : 'not-running';
    } catch {
      return 'unavailable';
    }
  }

  async restart(): Promise<ChatGptRestartResult> {
    if (this.platform !== 'darwin') {
      return 'unavailable';
    }
    if (this.isRestarting) {
      throw new RuntimeOperationError('conflict', 'ChatGPT restart is already in progress.');
    }

    this.isRestarting = true;
    try {
      let isRunning: boolean;
      try {
        isRunning = await this.nativeOperations.isRunning();
      } catch {
        return 'unavailable';
      }
      if (!isRunning) {
        return 'not-running';
      }

      const quitDeadline = this.now() + CHATGPT_APPLICATION_STAGE_TIMEOUT_MS;
      let termination: ChatGptTerminationRequest;
      try {
        termination = await this.nativeOperations.requestTermination(
          Math.min(NATIVE_COMMAND_TIMEOUT_MS, this.getRemainingStageTime(quitDeadline)),
        );
      } catch {
        return 'quit-failed';
      }
      if (termination === 'not-running') {
        return 'not-running';
      }
      if (termination === 'rejected') {
        return 'quit-failed';
      }

      try {
        if (!await this.waitForRunningState(false, quitDeadline)) {
          return 'quit-failed';
        }
      } catch {
        return 'quit-failed';
      }

      const reopenDeadline = this.now() + CHATGPT_APPLICATION_STAGE_TIMEOUT_MS;
      try {
        await this.nativeOperations.reopen(
          Math.min(NATIVE_COMMAND_TIMEOUT_MS, this.getRemainingStageTime(reopenDeadline)),
        );
        return await this.waitForRunningState(true, reopenDeadline)
          ? 'restarted'
          : 'reopen-failed';
      } catch {
        return 'reopen-failed';
      }
    } finally {
      this.isRestarting = false;
    }
  }
}
