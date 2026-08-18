import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Icon } from '@astryxdesign/core/Icon';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { useState } from 'react';
import type {
  SkillDistributionPreflightResult,
  SkillDistributionResult,
  SkillStorePackageView,
  SkillTargetView,
} from '../../../../shared/skill-contract';
import { summarizeSkillDistributionResults } from './skill-installation-actions';
import {
  getSkillTargetsQueryOptions,
  invalidateSkillQueries,
  resolveSkillRequest,
} from './skill-query';
import type { SkillRequestError } from './skill-query';

interface TargetFeedback {
  label: string;
  message: string | undefined;
  variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral';
  pulsing?: boolean;
}

export function SkillDistributionDialog({
  skillPackage,
  onClose,
}: {
  skillPackage: SkillStorePackageView;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const targetsQuery = useQuery(getSkillTargetsQueryOptions());
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(() => new Set());
  const [preflight, setPreflight] = useState<SkillDistributionPreflightResult>();
  const [result, setResult] = useState<SkillDistributionResult>();
  const selectedTargets = (targetsQuery.data ?? []).filter((target) => (
    selectedTargetIds.has(target.id)
  ));
  const selectedIds = selectedTargets.map((target) => target.id);
  const preflightMutation = useMutation<
    SkillDistributionPreflightResult,
    SkillRequestError
  >({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.preflightDistribution({
        skillId: skillPackage.id,
        targetIds: selectedIds,
      }),
      'Distribution could not be reviewed.',
    ),
    onSuccess: setPreflight,
  });
  const distributionMutation = useMutation<SkillDistributionResult, SkillRequestError>({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.distribute({
        skillId: skillPackage.id,
        targetIds: selectedIds,
      }),
      'Distribution could not be completed.',
    ),
    onSuccess: (distributionResult) => {
      setResult(distributionResult);
      void invalidateSkillQueries(queryClient);
    },
  });
  const isBusy = preflightMutation.isPending || distributionMutation.isPending;
  const targets = targetsQuery.data ?? [];
  const selectionValue = selectedTargetIds.size === 0
    ? false
    : (selectedTargetIds.size === targets.length ? true : 'indeterminate');
  const readyCount = preflight?.targets.filter((target) => target.status === 'ready').length ?? 0;
  const replaceCount = preflight?.targets.filter((target) => (
    target.status === 'ready' && target.operation === 'replace'
  )).length ?? 0;
  const error = targetsQuery.error ?? preflightMutation.error ?? distributionMutation.error;

  const changeSelection = (next: Set<string>) => {
    setSelectedTargetIds(next);
    setPreflight(undefined);
    setResult(undefined);
    preflightMutation.reset();
    distributionMutation.reset();
  };
  const close = () => {
    if (!isBusy) {
      onClose();
    }
  };

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
      purpose={isBusy ? 'required' : 'form'}
      width={720}
      maxHeight="85vh"
    >
      <Layout
        header={(
          <DialogHeader
            title={`Distribute ${skillPackage.distributionName}`}
            onOpenChange={
              isBusy
                ? undefined
                : close
            }
          />
        )}
        content={(
          <LayoutContent isScrollable>
            <VStack gap={3} width="100%">
              {error && (
                <Banner
                  status="error"
                  title="Distribution Couldn't Continue"
                  description={error.message}
                />
              )}
              {preflight && !result && (
                <Banner
                  status={readyCount === preflight.targets.length ? 'success' : 'warning'}
                  title="Distribution Review Complete"
                  description={`${readyCount} ready, ${preflight.targets.length - readyCount} blocked.${replaceCount > 0 ? ` ${replaceCount} existing installations will be replaced.` : ''}`}
                />
              )}
              {result && <DistributionResultBanner result={result} />}
              {!result && targets.length > 0 && (
                <CheckboxInput
                  label="Select all Distribution Targets"
                  value={selectionValue}
                  size="sm"
                  isDisabled={isBusy}
                  onChange={(isChecked) => changeSelection(new Set(
                    isChecked ? targets.map((target) => target.id) : [],
                  ))}
                />
              )}
              {targets.length === 0 && !targetsQuery.isPending
                ? (
                    <VStack gap={2} hAlign="center" width="100%">
                      <Icon icon={PackageCheck} size="lg" color="secondary" />
                      <Text type="body">No Distribution Targets are configured.</Text>
                    </VStack>
                  )
                : (
                    <List density="compact" hasDividers header="Distribution Targets">
                      {targets.map((target) => {
                        const feedback = getTargetFeedback({
                          target,
                          isSelected: selectedTargetIds.has(target.id),
                          isApplying: distributionMutation.isPending,
                          preflight,
                          result,
                        });
                        return (
                          <ListItem
                            key={target.id}
                            label={target.displayName}
                            startContent={(
                              <CheckboxInput
                                label={`Select ${target.displayName}`}
                                isLabelHidden
                                value={selectedTargetIds.has(target.id)}
                                size="sm"
                                isDisabled={isBusy || result !== undefined}
                                onChange={(isChecked) => {
                                  const next = new Set(selectedTargetIds);
                                  if (isChecked) {
                                    next.add(target.id);
                                  } else {
                                    next.delete(target.id);
                                  }
                                  changeSelection(next);
                                }}
                              />
                            )}
                            description={feedback.message ?? target.configuredPath}
                            endContent={(
                              <HStack gap={1.5} vAlign="center">
                                <StatusDot
                                  variant={feedback.variant}
                                  label={feedback.label}
                                  isPulsing={feedback.pulsing}
                                />
                                <Text type="supporting">{feedback.label}</Text>
                              </HStack>
                            )}
                          />
                        );
                      })}
                    </List>
                  )}
            </VStack>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button
                label={result ? 'Close' : 'Cancel'}
                variant={result ? 'primary' : 'ghost'}
                isDisabled={isBusy}
                onClick={close}
              />
              {!result && !preflight && (
                <Button
                  label="Review Distribution"
                  variant="primary"
                  isLoading={preflightMutation.isPending}
                  isDisabled={selectedTargetIds.size === 0 || isBusy}
                  onClick={() => preflightMutation.mutate()}
                />
              )}
              {!result && preflight && (
                <Button
                  label="Confirm Distribution"
                  variant="primary"
                  isLoading={distributionMutation.isPending}
                  isDisabled={readyCount === 0 || isBusy}
                  onClick={() => distributionMutation.mutate()}
                />
              )}
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function DistributionResultBanner({ result }: { result: SkillDistributionResult }) {
  const summary = summarizeSkillDistributionResults(result.targets);
  const title = summary.isPartial
    ? 'Distribution Partially Completed'
    : (summary.failed === 0 ? 'Distribution Completed' : 'Distribution Failed');
  return (
    <Banner
      status={summary.failed === 0 ? 'success' : (summary.isPartial ? 'warning' : 'error')}
      title={title}
      description={`${summary.succeeded} succeeded and ${summary.failed} failed.`}
    />
  );
}

function getTargetFeedback({
  target,
  isSelected,
  isApplying,
  preflight,
  result,
}: {
  target: SkillTargetView;
  isSelected: boolean;
  isApplying: boolean;
  preflight: SkillDistributionPreflightResult | undefined;
  result: SkillDistributionResult | undefined;
}): TargetFeedback {
  if (!isSelected) {
    return { label: 'Not selected', message: undefined, variant: 'neutral' };
  }
  if (isApplying) {
    return { label: 'Distributing', message: target.configuredPath, variant: 'accent', pulsing: true };
  }
  const targetResult = result?.targets.find((item) => item.targetId === target.id);
  if (targetResult) {
    return targetResult.ok
      ? { label: 'Succeeded', message: target.configuredPath, variant: 'success' }
      : { label: 'Failed', message: targetResult.error.message, variant: 'error' };
  }
  const targetPreflight = preflight?.targets.find((item) => item.targetId === target.id);
  if (targetPreflight) {
    return targetPreflight.status === 'ready'
      ? {
          label: targetPreflight.operation === 'replace' ? 'Will replace' : 'Ready to install',
          message: target.configuredPath,
          variant: targetPreflight.operation === 'replace' ? 'warning' : 'success',
        }
      : { label: 'Blocked', message: targetPreflight.message, variant: 'error' };
  }
  if (!target.enabled) {
    return { label: 'Disabled', message: target.configuredPath, variant: 'neutral' };
  }
  if (!target.writable) {
    return { label: 'Read only', message: target.configuredPath, variant: 'warning' };
  }
  return { label: 'Selected', message: target.configuredPath, variant: 'neutral' };
}
