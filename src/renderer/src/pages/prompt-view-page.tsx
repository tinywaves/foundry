import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';
import { PromptContent } from './prompts/prompt-content';
import { PromptPageLoading } from './prompts/prompt-page-loading';
import { usePromptCopy } from './prompts/use-prompt-copy';
import { usePromptDetail } from './prompts/use-prompt-detail';
import { usePromptTrashActions } from './prompts/use-prompt-trash-actions';

export function PromptViewPage() {
  const navigate = useNavigate();
  const promptId = useParams().promptId ?? '';
  const promptQuery = usePromptDetail(promptId);
  const { copyPrompt, isCopying } = usePromptCopy();
  const { moveMutation } = usePromptTrashActions();
  const [isMoveToTrashOpen, setIsMoveToTrashOpen] = useState(false);

  if (!promptQuery.data) {
    return <PromptPageLoading title="Prompt" />;
  }
  const prompt = promptQuery.data;

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
                    label="Copy"
                    icon={<Icon icon={Copy} size="sm" color="inherit" />}
                    isLoading={isCopying(prompt.id)}
                    onClick={() => copyPrompt(prompt.id)}
                  />
                  <Button
                    label="Move to Trash"
                    variant="destructive"
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                    onClick={() => setIsMoveToTrashOpen(true)}
                  />
                  <Button
                    label="Edit"
                    variant="primary"
                    icon={<Icon icon={Pencil} size="sm" color="inherit" />}
                    onClick={() => void navigate(
                      routePaths.agentExtensionsPromptEdit(prompt.id),
                    )}
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
                <MetadataListItem label="Updated At">
                  <Timestamp
                    value={new Date(prompt.updatedAt).toISOString()}
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
        isOpen={isMoveToTrashOpen}
        onOpenChange={(isOpen) => {
          if (!moveMutation.isPending) {
            setIsMoveToTrashOpen(isOpen);
          }
        }}
        title="Move Prompt to Trash?"
        description={`"${prompt.title}" will be moved to Trash. You can restore it later.`}
        actionLabel="Move to Trash"
        actionVariant="destructive"
        isActionLoading={moveMutation.isPending}
        onAction={() => {
          if (moveMutation.isPending) {
            return;
          }
          moveMutation.mutate(prompt, {
            onSuccess: () => {
              setIsMoveToTrashOpen(false);
              void navigate(routePaths.agentExtensionsPrompts, { replace: true });
            },
          });
        }}
      />
    </>
  );
}
