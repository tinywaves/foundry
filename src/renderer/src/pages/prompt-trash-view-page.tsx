import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { routePaths } from '@renderer/routes';
import { promptLifecycleExitNavigateOptions } from './prompts/prompt-lifecycle-navigation';
import { PromptPageLoading } from './prompts/prompt-page-loading';
import { PromptReadOnlyContent } from './prompts/prompt-read-only-content';
import { PromptWindowHeader } from './prompts/prompt-window-header';
import { usePromptTrashActions } from './prompts/use-prompt-trash-actions';
import { useTrashedPromptDetail } from './prompts/use-trashed-prompt-detail';

export function PromptTrashViewPage() {
  const navigate = useNavigate();
  const promptId = useParams().promptId ?? '';
  const promptQuery = useTrashedPromptDetail(promptId);
  const { removalMutation, restoreMutation } = usePromptTrashActions();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const isActionPending = removalMutation.isPending || restoreMutation.isPending;
  const returnToTrash = () => {
    void navigate(routePaths.agentExtensionsPromptsTrash, { replace: true });
  };

  if (!promptQuery.data) {
    return (
      <PromptPageLoading
        title="Trashed Prompt"
        header={(
          <PromptWindowHeader
            title="Trashed Prompt"
            backLabel="Back to Trash"
            onBack={returnToTrash}
          />
        )}
      />
    );
  }
  const prompt = promptQuery.data;
  const handleRestore = () => {
    restoreMutation.mutate(prompt, {
      onSuccess: (restoredPrompt) => {
        void navigate(
          routePaths.agentExtensionsPrompt(restoredPrompt.id),
          promptLifecycleExitNavigateOptions,
        );
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
        void navigate(
          routePaths.agentExtensionsPromptsTrash,
          promptLifecycleExitNavigateOptions,
        );
      },
    });
  };

  return (
    <>
      <Layout
        height="fill"
        header={(
          <PromptWindowHeader
            title={prompt.title}
            backLabel="Back to Trash"
            isBackDisabled={isActionPending}
            onBack={returnToTrash}
            action={(
              <Button
                label="Remove from Trash"
                size="sm"
                variant="destructive"
                icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                isDisabled={restoreMutation.isPending}
                onClick={() => setIsRemoveOpen(true)}
              />
            )}
            primaryAction={(
              <Button
                label="Restore"
                size="sm"
                variant="primary"
                icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
                isLoading={restoreMutation.isPending}
                isDisabled={removalMutation.isPending}
                onClick={handleRestore}
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
