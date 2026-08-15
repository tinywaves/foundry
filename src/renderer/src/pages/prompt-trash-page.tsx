import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { TrashedPromptSummary } from '../../../shared/prompt-contract';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { agentExtensionIcons } from '@renderer/navigation-icons';
import { PromptLibraryHeader } from './prompts/prompt-library-header';
import { getTrashedPromptListQueryOptions } from './prompts/prompt-query';
import { getEmptyTrashDescription } from './prompts/prompt-trash-model';
import {
  PromptTrashTable,
  PromptTrashTableLoading,
} from './prompts/prompt-trash-table';
import { usePromptTrashActions } from './prompts/use-prompt-trash-actions';

export function PromptTrashPage() {
  const showToast = useToast();
  const trashQuery = useQuery(getTrashedPromptListQueryOptions());
  const { emptyMutation, removalMutation, restoreMutation } = usePromptTrashActions();
  const [promptToRemove, setPromptToRemove] = useState<TrashedPromptSummary>();
  const [promptsToEmpty, setPromptsToEmpty] = useState<TrashedPromptSummary[]>();
  const listErrorMessage = trashQuery.error?.message;
  const isBusy = emptyMutation.isPending
    || removalMutation.isPending
    || restoreMutation.isPending;
  const isRestoring = useCallback((promptId: string) => (
    restoreMutation.isPending && restoreMutation.variables.id === promptId
  ), [restoreMutation.isPending, restoreMutation.variables]);

  useEffect(() => {
    if (!listErrorMessage) {
      return;
    }
    showToast({
      body: listErrorMessage,
      type: 'error',
      uniqueID: 'prompt-trash-list-load',
    });
  }, [listErrorMessage, showToast, trashQuery.errorUpdatedAt]);

  const handleConfirmRemove = () => {
    if (!promptToRemove || removalMutation.isPending) {
      return;
    }
    removalMutation.mutate(promptToRemove, {
      onSuccess: () => setPromptToRemove(undefined),
    });
  };
  const handleConfirmEmpty = () => {
    if (!promptsToEmpty || emptyMutation.isPending) {
      return;
    }
    emptyMutation.mutate(promptsToEmpty, {
      onSuccess: () => setPromptsToEmpty(undefined),
    });
  };

  let content;
  if (trashQuery.isPending) {
    content = <PromptTrashTableLoading />;
  } else if (trashQuery.data === undefined) {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Trash"
        description={listErrorMessage ?? 'Trash data is unavailable.'}
      />
    );
  } else {
    const trashData = trashQuery.data.length === 0
      ? <PageEmptyState icon={agentExtensionIcons.prompts} text="Trash Is Empty" />
      : (
          <PromptTrashTable
            prompts={trashQuery.data}
            isBusy={isBusy}
            isRestoring={isRestoring}
            onRestore={(prompt) => restoreMutation.mutate(prompt)}
            onRemove={setPromptToRemove}
          />
        );
    content = trashQuery.isError
      ? (
          <VStack width="100%" height="100%">
            <Banner
              status="error"
              container="section"
              title="Couldn't Refresh Trash"
              description={listErrorMessage ?? 'The existing list is still available.'}
            />
            {trashData}
          </VStack>
        )
      : trashData;
  }

  return (
    <>
      <VStack width="100%" height="100%">
        <PromptLibraryHeader
          selectedTab="trash"
          headerAction={(
            <Button
              label="Empty Trash"
              variant="destructive"
              size="sm"
              icon={<Icon icon={Trash2} size="sm" color="inherit" />}
              isDisabled={isBusy || (trashQuery.data?.length ?? 0) === 0}
              onClick={() => setPromptsToEmpty(trashQuery.data)}
            />
          )}
        />
        <StackItem size="fill">{content}</StackItem>
      </VStack>
      <AlertDialog
        isOpen={promptToRemove !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !removalMutation.isPending) {
            setPromptToRemove(undefined);
          }
        }}
        title="Remove Prompt from Trash?"
        description={promptToRemove
          ? `"${promptToRemove.title}" will no longer be accessible in Foundry. This can't be undone.`
          : `This Prompt will no longer be accessible in Foundry. This can't be undone.`}
        actionLabel="Remove from Trash"
        actionVariant="destructive"
        isActionLoading={removalMutation.isPending}
        onAction={handleConfirmRemove}
      />
      <AlertDialog
        isOpen={promptsToEmpty !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !emptyMutation.isPending) {
            setPromptsToEmpty(undefined);
          }
        }}
        title="Empty Trash?"
        description={getEmptyTrashDescription(promptsToEmpty?.length ?? 0)}
        actionLabel="Empty Trash"
        actionVariant="destructive"
        isActionLoading={emptyMutation.isPending}
        onAction={handleConfirmEmpty}
      />
    </>
  );
}
