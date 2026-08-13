import type { ProviderRuntime } from '../../../../shared/provider-contract';
import type {
  ChatGptApplicationState,
  ChatGptRestartResult,
} from '../../../../shared/runtime-contract';

export type RuntimeApplyResultSource
  = | 'provider-applied'
    | 'defaults-restored'
    | 'provider-updated-and-applied';

export interface RuntimeApplyResult {
  runtime: ProviderRuntime;
  source: RuntimeApplyResultSource;
}

export type RuntimeApplyManualReason
  = | 'claude-code'
    | 'initial-not-running'
    | 'restart-not-running'
    | 'quit-failed'
    | 'reopen-failed'
    | 'unavailable';

export type RuntimeApplyDialogState
  = | { status: 'checking' }
    | { status: 'restart-available' }
    | { status: 'restarting' }
    | { status: 'manual'; reason: RuntimeApplyManualReason };

export type RuntimeApplyRestartResolution
  = RuntimeApplyDialogState
    | { status: 'restarted' };

export const runtimeApplyResultTitles: Record<RuntimeApplyResultSource, string> = {
  'provider-applied': 'Provider Applied',
  'defaults-restored': 'Defaults Restored',
  'provider-updated-and-applied': 'Provider Updated and Applied',
};

export function getInitialRuntimeApplyDialogState(
  runtime: ProviderRuntime,
): RuntimeApplyDialogState {
  return runtime === 'codex'
    ? { status: 'checking' }
    : { status: 'manual', reason: 'claude-code' };
}

export function getRuntimeApplyDialogStateFromChatGptState(
  state: ChatGptApplicationState,
): RuntimeApplyDialogState {
  switch (state) {
    case 'running': {
      return { status: 'restart-available' };
    }
    case 'not-running': {
      return { status: 'manual', reason: 'initial-not-running' };
    }
    case 'unavailable': {
      return { status: 'manual', reason: 'unavailable' };
    }
  }
}

export function getRuntimeApplyRestartResolution(
  result: ChatGptRestartResult,
): RuntimeApplyRestartResolution {
  switch (result) {
    case 'restarted': {
      return { status: 'restarted' };
    }
    case 'not-running': {
      return { status: 'manual', reason: 'restart-not-running' };
    }
    case 'quit-failed':
    case 'reopen-failed':
    case 'unavailable': {
      return { status: 'manual', reason: result };
    }
  }
}
