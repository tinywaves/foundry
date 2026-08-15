import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { PromptSummary } from '../../../shared/prompt-contract';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { agentExtensionIcons } from '@renderer/navigation-icons';
import { routePaths } from '@renderer/routes';
import { PromptLibraryHeader } from './prompts/prompt-library-header';
import { getPromptListQueryOptions } from './prompts/prompt-query';
import { PromptTable, PromptTableLoading } from './prompts/prompt-table';
import { usePromptCopy } from './prompts/use-prompt-copy';
import { usePromptTrashActions } from './prompts/use-prompt-trash-actions';

export function PromptsPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const promptsQuery = useQuery(getPromptListQueryOptions());
  const { copyPrompt, isCopying } = usePromptCopy();
  const { moveMutation } = usePromptTrashActions();
  const [promptToTrash, setPromptToTrash] = useState<PromptSummary>();
  const listErrorMessage = promptsQuery.error?.message;
  const editPrompt = useCallback((promptId: string) => {
    void navigate(routePaths.agentExtensionsPromptEdit(promptId));
  }, [navigate]);

  useEffect(() => {
    if (!listErrorMessage) {
      return;
    }
    showToast({
      body: listErrorMessage,
      type: 'error',
      uniqueID: 'prompts-list-load',
    });
  }, [listErrorMessage, promptsQuery.errorUpdatedAt, showToast]);

  let content;
  if (promptsQuery.isPending) {
    content = <PromptTableLoading />;
  } else if (promptsQuery.data === undefined) {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Prompts"
        description={listErrorMessage ?? 'Prompt data is unavailable.'}
      />
    );
  } else {
    const promptData = promptsQuery.data.length === 0
      ? <PageEmptyState icon={agentExtensionIcons.prompts} text="No Prompts Yet" />
      : (
          <PromptTable
            prompts={promptsQuery.data}
            isCopying={isCopying}
            onCopy={copyPrompt}
            onEdit={editPrompt}
            onMoveToTrash={setPromptToTrash}
          />
        );
    content = promptsQuery.isError
      ? (
          <VStack width="100%" height="100%">
            <Banner
              status="error"
              container="section"
              title="Couldn't Refresh Prompts"
              description={listErrorMessage ?? 'The existing list is still available.'}
            />
            {promptData}
          </VStack>
        )
      : promptData;
  }

  return (
    <>
      <VStack width="100%" height="100%">
        <PromptLibraryHeader selectedTab="all" />
        <StackItem size="fill">{content}</StackItem>
      </VStack>
      <AlertDialog
        isOpen={promptToTrash !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !moveMutation.isPending) {
            setPromptToTrash(undefined);
          }
        }}
        title="Move Prompt to Trash?"
        description={promptToTrash
          ? `"${promptToTrash.title}" will be moved to Trash. You can restore it later.`
          : 'This Prompt will be moved to Trash. You can restore it later.'}
        actionLabel="Move to Trash"
        actionVariant="destructive"
        isActionLoading={moveMutation.isPending}
        onAction={() => {
          if (!promptToTrash || moveMutation.isPending) {
            return;
          }
          moveMutation.mutate(promptToTrash, {
            onSuccess: () => setPromptToTrash(undefined),
          });
        }}
      />
    </>
  );
}
