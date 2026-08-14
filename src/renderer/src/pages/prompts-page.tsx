import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { PromptSummary } from '../../../shared/prompt-contract';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';
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
      ? <PageEmptyState icon={FileText} text="No Prompts Yet" />
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
      <Layout
        height="fill"
        header={(
          <LayoutHeader hasDivider padding={0}>
            <PageHeader
              text="Prompts"
              action={(
                <HStack gap={2} vAlign="center">
                  <Button
                    label="Trash"
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                    onClick={() => void navigate(routePaths.agentExtensionsPromptsTrash)}
                  />
                  <Button
                    label="New Prompt"
                    variant="primary"
                    icon={<Icon icon={Plus} size="sm" color="inherit" />}
                    onClick={() => void navigate(routePaths.agentExtensionsPromptsNew)}
                  />
                </HStack>
              )}
            />
          </LayoutHeader>
        )}
        content={<LayoutContent padding={0}>{content}</LayoutContent>}
      />
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
