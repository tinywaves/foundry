import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { List, ListItem } from '@astryxdesign/core/List';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { useQuery } from '@tanstack/react-query';
import type {
  SkillStoreDeletionPreflight,
  SkillStoreDeletionTargetView,
  SkillStorePackageView,
} from '../../../../shared/skill-contract';
import { SkillInventoryLoading } from './skill-loading';
import { resolveSkillRequest } from './skill-query';
import { useSkillTrashActions } from './use-skill-trash-actions';

interface SkillStoreDeletionDialogProps {
  skillPackage: SkillStorePackageView;
  onClose: () => void;
  onDeleted: () => void;
}

export function SkillStoreDeletionDialog({
  skillPackage,
  onClose,
  onDeleted,
}: SkillStoreDeletionDialogProps) {
  const { moveMutation } = useSkillTrashActions();
  const preflightQuery = useQuery({
    queryKey: ['skills', 'store-deletion-preflight', skillPackage.id],
    queryFn: () => resolveSkillRequest<SkillStoreDeletionPreflight>(
      () => globalThis.api.skills.preflightStoreDeletion(skillPackage.id),
      'Store deletion could not be reviewed.',
    ),
    retry: false,
    staleTime: 0,
  });
  const result = moveMutation.data;
  const isBusy = preflightQuery.isPending || moveMutation.isPending;
  const failureByInstallationId = new Map(
    (result?.failures ?? []).map((failure) => [failure.installationId, failure]),
  );

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !isBusy) {
          onClose();
        }
      }}
      purpose={isBusy ? 'required' : 'form'}
      width={640}
      maxHeight="85vh"
    >
      <Layout
        header={(
          <DialogHeader
            title={`Delete ${skillPackage.distributionName}`}
            subtitle="Move to Foundry Trash"
            onOpenChange={isBusy
              ? undefined
              : (isOpen) => {
                  if (!isOpen) {
                    onClose();
                  }
                }}
          />
        )}
        content={(
          <LayoutContent isScrollable>
            <VStack gap={3} width="100%">
              <Text>
                Every listed Target path will be removed before this Skill Package moves to Trash.
              </Text>
              {preflightQuery.isPending && <SkillInventoryLoading />}
              {preflightQuery.error && (
                <Banner
                  status="error"
                  title="Deletion Review Couldn't Finish"
                  description={preflightQuery.error.message}
                />
              )}
              {result && !result.deleted && (
                <Banner
                  status="error"
                  title="Some Targets Couldn't Be Removed"
                  description="The Store Package and its BLOB are unchanged. Retry after resolving the Target errors."
                />
              )}
              {preflightQuery.data && (
                <List density="compact" hasDividers>
                  {preflightQuery.data.targets.length === 0
                    ? (
                        <ListItem
                          label="No active Target installations"
                          description="The Package can move directly to Trash."
                        />
                      )
                    : preflightQuery.data.targets.map((target) => (
                        <DeletionTargetItem
                          key={target.installationId}
                          target={target}
                          failureMessage={failureByInstallationId.get(
                            target.installationId,
                          )?.error.message}
                        />
                      ))}
                </List>
              )}
            </VStack>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={isBusy}
                onClick={onClose}
              />
              <Button
                label={result && !result.deleted ? 'Retry Delete' : 'Delete Skill'}
                variant="destructive"
                isLoading={moveMutation.isPending}
                isDisabled={preflightQuery.data === undefined || isBusy}
                onClick={() => moveMutation.mutate(skillPackage, {
                  onSuccess: (deletionResult) => {
                    if (deletionResult.deleted) {
                      onDeleted();
                    } else {
                      void preflightQuery.refetch();
                    }
                  },
                })}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function DeletionTargetItem({
  target,
  failureMessage,
}: {
  target: SkillStoreDeletionTargetView;
  failureMessage: string | undefined;
}) {
  const presentation = getDeletionTargetPresentation(target, failureMessage);
  return (
    <ListItem
      label={target.targetName}
      description={failureMessage ?? target.message ?? target.path}
      endContent={(
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={presentation.variant} label={presentation.label} />
          <Text type="supporting">{presentation.label}</Text>
        </HStack>
      )}
    />
  );
}

function getDeletionTargetPresentation(
  target: SkillStoreDeletionTargetView,
  failureMessage: string | undefined,
) {
  if (failureMessage) {
    return { label: 'Failed', variant: 'error' as const };
  }
  if (target.status === 'ready') {
    return { label: 'Will remove', variant: 'warning' as const };
  }
  if (target.status === 'missing') {
    return { label: 'Already missing', variant: 'neutral' as const };
  }
  return { label: 'Unavailable', variant: 'error' as const };
}
