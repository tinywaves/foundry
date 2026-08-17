import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { HStack } from '@astryxdesign/core/Stack';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { routePaths } from '@renderer/routes';
import { getPromptEditorNavigateOptions } from './prompts/prompt-editor-navigation';
import { promptLifecycleExitNavigateOptions } from './prompts/prompt-lifecycle-navigation';
import { PromptPageLoading } from './prompts/prompt-page-loading';
import { PromptReadOnlyContent } from './prompts/prompt-read-only-content';
import { PromptWindowHeader } from './prompts/prompt-window-header';
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
  const returnToPrompts = () => {
    void navigate(routePaths.agentExtensionsPrompts, { replace: true });
  };

  if (!promptQuery.data) {
    return (
      <PromptPageLoading
        title="View Prompt"
        header={(
          <PromptWindowHeader
            title="View Prompt"
            onBack={returnToPrompts}
          />
        )}
      />
    );
  }
  const prompt = promptQuery.data;

  return (
    <>
      <Layout
        height="fill"
        header={(
          <PromptWindowHeader
            title={prompt.title}
            onBack={returnToPrompts}
            action={(
              <HStack gap={2} vAlign="center">
                <Button
                  label="Copy"
                  size="sm"
                  icon={<Icon icon={Copy} size="sm" color="inherit" />}
                  isLoading={isCopying(prompt.id)}
                  onClick={() => copyPrompt(prompt.id)}
                />
                <Button
                  label="Move to Trash"
                  size="sm"
                  variant="destructive"
                  icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                  onClick={() => setIsMoveToTrashOpen(true)}
                />
              </HStack>
            )}
            primaryAction={(
              <Button
                label="Edit"
                size="sm"
                variant="primary"
                icon={<Icon icon={Pencil} size="sm" color="inherit" />}
                onClick={() => void navigate(
                  routePaths.agentExtensionsPromptEdit(prompt.id),
                  getPromptEditorNavigateOptions('view'),
                )}
              />
            )}
          />
        )}
        content={(
          <LayoutContent>
            <PromptReadOnlyContent
              title={prompt.title}
              description={prompt.description}
              content={prompt.content}
            />
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
              void navigate(
                routePaths.agentExtensionsPrompts,
                promptLifecycleExitNavigateOptions,
              );
            },
          });
        }}
      />
    </>
  );
}
