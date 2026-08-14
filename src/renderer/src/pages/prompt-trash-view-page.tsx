import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';
import { PromptContent } from './prompts/prompt-content';
import { PromptPageLoading } from './prompts/prompt-page-loading';
import { usePromptTrashActions } from './prompts/use-prompt-trash-actions';
import { useTrashedPromptDetail } from './prompts/use-trashed-prompt-detail';

export function PromptTrashViewPage() {
  const navigate = useNavigate();
  const promptId = useParams().promptId ?? '';
  const promptQuery = useTrashedPromptDetail(promptId);
  const { removalMutation, restoreMutation } = usePromptTrashActions();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  if (!promptQuery.data) {
    return <PromptPageLoading title="Trashed Prompt" />;
  }
  const prompt = promptQuery.data;
  const handleRestore = () => {
    restoreMutation.mutate(prompt, {
      onSuccess: (restoredPrompt) => {
        void navigate(routePaths.agentExtensionsPrompt(restoredPrompt.id), { replace: true });
      },
    });
  };
  const handleRemove = () => {
    if (removalMutation.isPending) {
      return;
    }
    removalMutation.mutate(prompt, {
      onSuccess: () => {
        setIsRemoveOpen(false);
        void navigate(routePaths.agentExtensionsPromptsTrash, { replace: true });
      },
    });
  };

  return (
    <>
      <Layout
        height="fill"
        header={(
          <LayoutHeader hasDivider padding={0}>
            <PageHeader
              text={prompt.title}
              action={(
                <HStack gap={2} vAlign="center">
                  <Button
                    label="Remove from Trash"
                    variant="destructive"
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                    isDisabled={restoreMutation.isPending}
                    onClick={() => setIsRemoveOpen(true)}
                  />
                  <Button
                    label="Restore"
                    variant="primary"
                    icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
                    isLoading={restoreMutation.isPending}
                    isDisabled={removalMutation.isPending}
                    onClick={handleRestore}
                  />
                </HStack>
              )}
            />
          </LayoutHeader>
        )}
        content={(
          <LayoutContent>
            <VStack gap={6} width="100%">
              <MetadataList columns="single" label={{ position: 'top' }}>
                <MetadataListItem label="Description">
                  <Text color={prompt.description ? 'primary' : 'secondary'}>
                    {prompt.description ?? 'None'}
                  </Text>
                </MetadataListItem>
                <MetadataListItem label="Version">
                  <Text>{`Version ${prompt.currentVersion}`}</Text>
                </MetadataListItem>
                <MetadataListItem label="Created At">
                  <Timestamp
                    value={new Date(prompt.createdAt).toISOString()}
                    format="date_time"
                  />
                </MetadataListItem>
                <MetadataListItem label="Updated At">
                  <Timestamp
                    value={new Date(prompt.updatedAt).toISOString()}
                    format="date_time"
                  />
                </MetadataListItem>
                <MetadataListItem label="Moved to Trash">
                  <Timestamp
                    value={new Date(prompt.trashedAt).toISOString()}
                    format="date_time"
                  />
                </MetadataListItem>
              </MetadataList>
              <VStack gap={2} width="100%">
                <Heading level={3}>Prompt</Heading>
                <PromptContent content={prompt.content} />
              </VStack>
            </VStack>
          </LayoutContent>
        )}
      />
      <AlertDialog
        isOpen={isRemoveOpen}
        onOpenChange={(isOpen) => {
          if (!removalMutation.isPending) {
            setIsRemoveOpen(isOpen);
          }
        }}
        title="Remove Prompt from Trash?"
        description={`"${prompt.title}" will no longer be accessible in Foundry. This can't be undone.`}
        actionLabel="Remove from Trash"
        actionVariant="destructive"
        isActionLoading={removalMutation.isPending}
        onAction={handleRemove}
      />
    </>
  );
}
