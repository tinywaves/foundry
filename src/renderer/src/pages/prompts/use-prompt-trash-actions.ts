import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PromptDetail,
  TrashedPromptSummary,
} from '../../../../shared/prompt-contract';
import {
  emptyPromptTrashCaches,
  movePromptToTrashCaches,
  removePromptFromTrashCaches,
  resolvePromptRequest,
  restoreTrashedPromptCaches,
} from './prompt-query';
import { getEmptyTrashSuccessMessage } from './prompt-trash-model';

export interface PromptTrashTarget {
  id: string;
  title: string;
}

export function usePromptTrashActions() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const moveMutation = useMutation<undefined, Error, PromptTrashTarget>({
    mutationFn: (prompt) => resolvePromptRequest(
      () => globalThis.api.prompts.movePromptToTrash(prompt.id),
      'Prompt could not be moved to Trash.',
    ),
    retry: false,
    onSuccess: (_value, prompt) => {
      movePromptToTrashCaches(queryClient, prompt.id);
      showToast({
        body: 'Prompt moved to Trash.',
        uniqueID: `prompt-move-to-trash-success-${prompt.id}`,
      });
    },
    onError: (error, prompt) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-move-to-trash-error-${prompt.id}`,
      });
    },
  });
  const restoreMutation = useMutation<PromptDetail, Error, PromptTrashTarget>({
    mutationFn: (prompt) => resolvePromptRequest(
      () => globalThis.api.prompts.restoreTrashedPrompt(prompt.id),
      'Prompt could not be restored.',
    ),
    retry: false,
    onSuccess: (restoredPrompt) => {
      restoreTrashedPromptCaches(queryClient, restoredPrompt);
      showToast({
        body: 'Prompt restored.',
        uniqueID: `prompt-restore-success-${restoredPrompt.id}`,
      });
    },
    onError: (error, prompt) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-restore-error-${prompt.id}`,
      });
    },
  });
  const removalMutation = useMutation<undefined, Error, PromptTrashTarget>({
    mutationFn: (prompt) => resolvePromptRequest(
      () => globalThis.api.prompts.removePromptFromTrash(prompt.id),
      'Prompt could not be removed from Trash.',
    ),
    retry: false,
    onSuccess: (_value, prompt) => {
      removePromptFromTrashCaches(queryClient, prompt.id);
      showToast({
        body: 'Prompt removed from Trash.',
        uniqueID: `prompt-remove-from-trash-success-${prompt.id}`,
      });
    },
    onError: (error, prompt) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-remove-from-trash-error-${prompt.id}`,
      });
    },
  });
  const emptyMutation = useMutation<number, Error, TrashedPromptSummary[]>({
    mutationFn: () => resolvePromptRequest(
      () => globalThis.api.prompts.emptyPromptTrash(),
      'Trash could not be emptied.',
    ),
    retry: false,
    onSuccess: (count, prompts) => {
      emptyPromptTrashCaches(queryClient, prompts.map((prompt) => prompt.id));
      showToast({
        body: getEmptyTrashSuccessMessage(count),
        uniqueID: 'prompt-empty-trash-success',
      });
    },
    onError: (error) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: 'prompt-empty-trash-error',
      });
    },
  });

  return {
    emptyMutation,
    moveMutation,
    removalMutation,
    restoreMutation,
  };
}
