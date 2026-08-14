import { useToast } from '@astryxdesign/core/Toast';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { PromptVersionTarget } from '../../../../shared/prompt-contract';
import { resolvePromptRequest } from './prompt-query';

export function usePromptCopy() {
  const showToast = useToast();
  const mutation = useMutation({
    mutationFn: (promptId: string) => resolvePromptRequest(
      () => globalThis.api.prompts.copyPrompt(promptId),
      'Prompt could not be copied.',
    ),
    retry: false,
    onSuccess: (_value, promptId) => {
      showToast({
        body: 'Prompt copied',
        uniqueID: `prompt-copy-success-${promptId}`,
      });
    },
    onError: (error, promptId) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-copy-error-${promptId}`,
      });
    },
  });
  const isCopying = useCallback((promptId: string) => (
    mutation.isPending && mutation.variables === promptId
  ), [mutation.isPending, mutation.variables]);

  const versionMutation = useMutation({
    mutationFn: (target: PromptVersionTarget) => resolvePromptRequest(
      () => globalThis.api.prompts.copyPromptVersion(target),
      'Prompt version could not be copied.',
    ),
    retry: false,
    onSuccess: (_value, target) => {
      showToast({
        body: 'Prompt version copied',
        uniqueID: `prompt-version-copy-success-${target.id}-${target.version}`,
      });
    },
    onError: (error, target) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-version-copy-error-${target.id}-${target.version}`,
      });
    },
  });
  const isCopyingVersion = useCallback((target: PromptVersionTarget) => (
    versionMutation.isPending
    && versionMutation.variables.id === target.id
    && versionMutation.variables.version === target.version
  ), [versionMutation.isPending, versionMutation.variables]);

  return {
    copyPrompt: mutation.mutate,
    copyPromptVersion: versionMutation.mutate,
    isCopying,
    isCopyingVersion,
  };
}
