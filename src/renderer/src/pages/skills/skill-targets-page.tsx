import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpToLine,
  BookOpen,
  CopyPlus,
  Ellipsis,
  FolderOpen,
  Package,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import type {
  SkillCustomTargetDirectorySelection,
  SkillDistributionTargetResult,
  SkillImportInstallationResult,
  SkillInstallationView,
  SkillTargetView,
} from '../../../../shared/skill-contract';
import { SkillActionBar } from './skill-action-bar';
import {
  buildSkillTargetInventory,
  getInstallationStatusPresentation,
} from './skill-inventory-model';
import {
  getSkillInstallationActions,
} from './skill-installation-actions';
import type { SkillInstallationAction } from './skill-installation-actions';
import { SkillInventoryLoading } from './skill-loading';
import {
  getSkillInstallationsQueryOptions,
  getSkillTargetsQueryOptions,
  invalidateSkillQueries,
  resolveSkillRequest,
  SkillRequestError,
} from './skill-query';
import { SkillTargetIcon } from './skill-target-icon';
import { SkillTargetSettingsDialog } from './skill-target-settings-dialog';
import type { SkillTargetSettingsRequest } from './skill-target-settings-dialog';

interface InstallationActionRequest {
  action: SkillInstallationAction;
  installation: SkillInstallationView;
}

export function SkillTargetsPage() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const targetsQuery = useQuery(getSkillTargetsQueryOptions());
  const installationsQuery = useQuery(getSkillInstallationsQueryOptions());
  const [settingsRequest, setSettingsRequest] = useState<SkillTargetSettingsRequest>();
  const [targetToRemove, setTargetToRemove] = useState<SkillTargetView>();
  const [installationActionToConfirm, setInstallationActionToConfirm] = useState<
    InstallationActionRequest
  >();
  const selectMutation = useMutation<
    SkillCustomTargetDirectorySelection | null,
    SkillRequestError
  >({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.selectCustomTargetDirectory(),
      'A Custom Target directory could not be selected.',
    ),
    onSuccess: (candidate) => {
      if (candidate) {
        setSettingsRequest({ kind: 'create', candidate });
      }
    },
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-target-select',
    }),
  });
  const revealMutation = useMutation<null, SkillRequestError, string>({
    mutationFn: (targetId) => resolveSkillRequest(
      () => globalThis.api.skills.revealTarget(targetId),
      'The Target could not be revealed.',
    ),
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-target-reveal',
    }),
  });
  const documentationMutation = useMutation<null, SkillRequestError, string>({
    mutationFn: (targetId) => resolveSkillRequest(
      () => globalThis.api.skills.openTargetDocumentation(targetId),
      'Target documentation could not be opened.',
    ),
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-target-documentation',
    }),
  });
  const customTargetRemoval = useMutation<null, SkillRequestError, SkillTargetView>({
    mutationFn: (target) => resolveSkillRequest(
      () => globalThis.api.skills.removeCustomTarget(target.id),
      'The Custom Target could not be removed.',
    ),
    onSuccess: () => {
      setTargetToRemove(undefined);
      void invalidateSkillQueries(queryClient);
    },
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-target-remove',
    }),
  });
  const installationMutation = useMutation<
    string,
    SkillRequestError,
    InstallationActionRequest
  >({
    mutationFn: async ({ action, installation }) => {
      const input = { installationId: installation.id };
      switch (action) {
        case 'restore': {
          const restored = await resolveSkillRequest<SkillDistributionTargetResult>(
            () => globalThis.api.skills.restoreInstallation(input),
            'The Skill Installation could not be restored.',
          );
          if (!restored.ok) {
            throw new SkillRequestError(restored.error.message, restored.error);
          }
          return `${installation.distributionName} was restored from Store.`;
        }
        case 'promote': {
          await resolveSkillRequest(
            () => globalThis.api.skills.promoteInstallation(input),
            'The target copy could not be promoted to Store.',
          );
          return `${installation.distributionName} was promoted to Store.`;
        }
        case 'import-as-new': {
          const imported = await resolveSkillRequest<SkillImportInstallationResult>(
            () => globalThis.api.skills.importInstallationAsNew(input),
            'The target copy could not be imported as a new Skill.',
          );
          return `${imported.skillPackage.distributionName} was added to Store.`;
        }
        case 'uninstall': {
          await resolveSkillRequest(
            () => globalThis.api.skills.uninstall(input),
            'The Skill Installation could not be removed.',
          );
          return `${installation.distributionName} was removed from this Target.`;
        }
      }
    },
    onSuccess: (message) => {
      setInstallationActionToConfirm(undefined);
      void invalidateSkillQueries(queryClient);
      showToast({
        body: message,
        uniqueID: 'skill-installation-action-success',
      });
    },
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-installation-action-error',
    }),
  });
  const inventory = buildSkillTargetInventory(
    targetsQuery.data ?? [],
    installationsQuery.data ?? [],
  );
  const isInitialPending = targetsQuery.isPending || installationsQuery.isPending;
  const hasTerminalError = targetsQuery.data === undefined
    || installationsQuery.data === undefined;
  const refreshError = targetsQuery.error ?? installationsQuery.error;

  let content;
  if (isInitialPending) {
    content = <SkillInventoryLoading />;
  } else if (hasTerminalError) {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Distribution Targets"
        description={refreshError?.message ?? 'Target inventory is unavailable.'}
      />
    );
  } else if (inventory.length === 0) {
    content = (
      <Section padding={4} height="100%">
        <EmptyState
          headingLevel={2}
          title="No Distribution Targets"
          description="Add a local directory for Skill discovery and distribution."
          icon={<Icon icon={Wrench} size="lg" color="secondary" />}
          actions={(
            <Button
              label="Add Custom Target"
              variant="primary"
              icon={<Icon icon={Plus} size="sm" color="inherit" />}
              isLoading={selectMutation.isPending}
              onClick={() => selectMutation.mutate()}
            />
          )}
        />
      </Section>
    );
  } else {
    content = (
      <List density="compact" hasDividers header="Distribution Targets">
        {inventory.map(({ target, installations, packageCount, statusCounts }) => (
          <ListItem
            key={target.id}
            label={target.displayName}
            startContent={<SkillTargetIcon kind={target.kind} />}
            description={(
              <VStack gap={1}>
                <Text type="supporting" maxLines={1} hasTruncateTooltip>
                  {target.configuredPath}
                </Text>
                <HStack gap={1} wrap="wrap" vAlign="center">
                  {target.hint && <Token label={target.hint} color="gray" size="sm" />}
                  <Token
                    label={target.enabled ? 'Enabled' : 'Disabled'}
                    color={target.enabled ? 'green' : 'gray'}
                    size="sm"
                  />
                  <Token
                    label={target.writable ? 'Writable' : 'Read only'}
                    color={target.writable ? 'default' : 'orange'}
                    size="sm"
                  />
                  <Token label={`${packageCount} packages`} color="default" size="sm" />
                  {Object.entries(statusCounts).map(([label, count]) => (
                    <Token key={label} label={`${label}: ${count}`} color="default" size="sm" />
                  ))}
                </HStack>
                {installations.length === 0
                  ? <Text type="supporting" color="secondary">No installed Skills</Text>
                  : (
                      <List density="compact" hasDividers header="Installed Skills">
                        {installations.map((installation) => {
                          const status = getInstallationStatusPresentation(installation);
                          const actions = getSkillInstallationActions(installation);
                          const isThisInstallationPending = installationMutation.isPending
                            && installationMutation.variables.installation.id === installation.id;
                          return (
                            <ListItem
                              key={installation.id}
                              label={installation.distributionName}
                              startContent={(
                                <Icon icon={Package} size="sm" color="secondary" />
                              )}
                              description={installation.relativePath}
                              endContent={(
                                <HStack gap={2} vAlign="center">
                                  <HStack gap={1.5} vAlign="center">
                                    <StatusDot variant={status.variant} label={status.label} />
                                    <Text type="supporting">{status.label}</Text>
                                  </HStack>
                                  {actions.length > 0 && (
                                    <DropdownMenu
                                      button={{
                                        label: `Actions for ${installation.distributionName}`,
                                        icon: <Icon icon={Ellipsis} size="sm" color="inherit" />,
                                        variant: 'ghost',
                                        size: 'sm',
                                        isIconOnly: true,
                                        isDisabled: installationMutation.isPending,
                                        isLoading: isThisInstallationPending,
                                      }}
                                      hasChevron={false}
                                      items={actions.map((action) => ({
                                        label: getInstallationActionLabel(action),
                                        icon: (
                                          <Icon
                                            icon={getInstallationActionIcon(action)}
                                            size="sm"
                                            color="inherit"
                                          />
                                        ),
                                        onClick: () => {
                                          const request = { action, installation };
                                          if (action === 'import-as-new') {
                                            installationMutation.mutate(request);
                                          } else {
                                            setInstallationActionToConfirm(request);
                                          }
                                        },
                                      }))}
                                    />
                                  )}
                                </HStack>
                              )}
                            />
                          );
                        })}
                      </List>
                    )}
              </VStack>
            )}
            endContent={(
              <HStack gap={1} vAlign="center">
                {target.documentationUrl && (
                  <IconButton
                    label={`Open ${target.displayName} documentation`}
                    tooltip="Official documentation"
                    icon={<Icon icon={BookOpen} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    isLoading={documentationMutation.isPending
                      && documentationMutation.variables === target.id}
                    onClick={() => documentationMutation.mutate(target.id)}
                  />
                )}
                <IconButton
                  label={`Reveal ${target.displayName} in Finder`}
                  tooltip="Reveal in Finder"
                  icon={<Icon icon={FolderOpen} size="sm" color="inherit" />}
                  variant="ghost"
                  size="sm"
                  isLoading={revealMutation.isPending && revealMutation.variables === target.id}
                  onClick={() => revealMutation.mutate(target.id)}
                />
                <IconButton
                  label={`Configure ${target.displayName}`}
                  tooltip="Target settings"
                  icon={<Icon icon={Settings} size="sm" color="inherit" />}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsRequest({ kind: 'edit', target })}
                />
                {!target.builtIn && (
                  <IconButton
                    label={`Remove ${target.displayName}`}
                    tooltip="Remove Custom Target"
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTargetToRemove(target)}
                  />
                )}
              </HStack>
            )}
          />
        ))}
      </List>
    );
  }

  return (
    <>
      <VStack width="100%" height="100%">
        <SkillActionBar
          label="Distribution Target Controls"
          endContent={(
            <Button
              label="Add Custom Target"
              variant="primary"
              icon={<Icon icon={Plus} size="sm" color="inherit" />}
              isLoading={selectMutation.isPending}
              isDisabled={selectMutation.isPending}
              onClick={() => selectMutation.mutate()}
            />
          )}
        />
        {refreshError && !hasTerminalError && (
          <Banner
            status="error"
            container="section"
            title="Couldn't Refresh Distribution Targets"
            description={refreshError.message}
          />
        )}
        <StackItem size="fill">{content}</StackItem>
      </VStack>
      {settingsRequest && (
        <SkillTargetSettingsDialog
          key={settingsRequest.kind === 'create'
            ? settingsRequest.candidate.candidateId
            : settingsRequest.target.id}
          request={settingsRequest}
          onClose={() => setSettingsRequest(undefined)}
        />
      )}
      <AlertDialog
        isOpen={targetToRemove !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !customTargetRemoval.isPending) {
            setTargetToRemove(undefined);
          }
        }}
        title="Remove Custom Target?"
        description={targetToRemove
          ? `${targetToRemove.displayName} will be removed from Foundry configuration. Its files will remain unchanged.`
          : 'The Custom Target will be removed from Foundry configuration.'}
        actionLabel="Remove Target"
        actionVariant="destructive"
        isActionLoading={customTargetRemoval.isPending}
        onAction={() => {
          if (targetToRemove && !customTargetRemoval.isPending) {
            customTargetRemoval.mutate(targetToRemove);
          }
        }}
      />
      <AlertDialog
        isOpen={installationActionToConfirm !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !installationMutation.isPending) {
            setInstallationActionToConfirm(undefined);
          }
        }}
        title={installationActionToConfirm
          ? getInstallationConfirmation(installationActionToConfirm).title
          : 'Confirm Skill Installation Action'}
        description={installationActionToConfirm
          ? getInstallationConfirmation(installationActionToConfirm).description
          : 'Confirm the selected Skill Installation action.'}
        actionLabel={installationActionToConfirm
          ? getInstallationConfirmation(installationActionToConfirm).actionLabel
          : 'Confirm'}
        actionVariant="destructive"
        isActionLoading={installationMutation.isPending}
        onAction={() => {
          if (installationActionToConfirm && !installationMutation.isPending) {
            installationMutation.mutate(installationActionToConfirm);
          }
        }}
      />
    </>
  );
}

function getInstallationActionLabel(action: SkillInstallationAction): string {
  switch (action) {
    case 'restore': {
      return 'Restore from Store';
    }
    case 'promote': {
      return 'Promote to Store';
    }
    case 'import-as-new': {
      return 'Import as New Skill';
    }
    case 'uninstall': {
      return 'Uninstall';
    }
  }
}

function getInstallationActionIcon(action: SkillInstallationAction) {
  switch (action) {
    case 'restore': {
      return RotateCcw;
    }
    case 'promote': {
      return ArrowUpToLine;
    }
    case 'import-as-new': {
      return CopyPlus;
    }
    case 'uninstall': {
      return Trash2;
    }
  }
}

function getInstallationConfirmation(request: InstallationActionRequest): {
  title: string;
  description: string;
  actionLabel: string;
} {
  const name = request.installation.distributionName;
  switch (request.action) {
    case 'restore': {
      return {
        title: `Restore ${name} from Store?`,
        description: 'The current target copy will be replaced with the latest Store content.',
        actionLabel: 'Restore from Store',
      };
    }
    case 'promote': {
      return {
        title: `Promote ${name} to Store?`,
        description: 'The Store Working Copy will be replaced with this target copy. Other installations will not change.',
        actionLabel: 'Promote to Store',
      };
    }
    case 'uninstall': {
      return {
        title: `Uninstall ${name}?`,
        description: 'The target copy will be removed. The Store package and Distribution Records will remain.',
        actionLabel: 'Uninstall',
      };
    }
    case 'import-as-new': {
      return {
        title: `Import ${name} as a New Skill?`,
        description: 'A separate Skill identity will be added to Store.',
        actionLabel: 'Import as New Skill',
      };
    }
  }
}
