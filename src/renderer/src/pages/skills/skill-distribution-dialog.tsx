import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { useState } from 'react';
import type {
  SkillDistributionPreflightResult,
  SkillDistributionResult,
  SkillInstallationView,
  SkillStorePackageView,
  SkillTargetView,
} from '../../../../shared/skill-contract';
import { summarizeSkillDistributionResults } from './skill-installation-actions';
import { getTargetInstallationPresentation } from './skill-inventory-model';
import {
  getSkillInstallationsQueryOptions,
  getSkillTargetsQueryOptions,
  invalidateSkillQueries,
  resolveSkillRequest,
} from './skill-query';
import type { SkillRequestError } from './skill-query';
import { SkillTargetIcon } from './skill-target-icon';

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
  const installationsQuery = useQuery(getSkillInstallationsQueryOptions({
    skillId: skillPackage.id,
  }));
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
  const installationsByTargetId = new Map(
    (installationsQuery.data ?? []).map((installation) => [
      installation.targetId,
      installation,
    ]),
  );
  const selectionValue = selectedTargetIds.size === 0
    ? false
    : (selectedTargetIds.size === targets.length ? true : 'indeterminate');
  const readyCount = preflight?.targets.filter((target) => target.status === 'ready').length ?? 0;
  const replaceCount = preflight?.targets.filter((target) => (
    target.status === 'ready' && target.operation === 'replace'
  )).length ?? 0;
  const error = targetsQuery.error
    ?? installationsQuery.error
    ?? preflightMutation.error
    ?? distributionMutation.error;

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
                    <VStack gap={2} width="100%">
                      <Text type="label" display="block">Distribution Targets</Text>
                      <Grid columns={2} gap={2} width="100%">
                        {targets.map((target) => {
                          const isSelected = selectedTargetIds.has(target.id);
                          const feedback = getTargetFeedback({
                            target,
                            isSelected,
                            isApplying: distributionMutation.isPending,
                            installation: installationsByTargetId.get(target.id),
                            isInstallationPending: installationsQuery.isPending,
                            isInstallationUnavailable: installationsQuery.isError
                              && installationsQuery.data === undefined,
                            preflight,
                            result,
                          });
                          return (
                            <SelectableCard
                              key={target.id}
                              label={`Select ${target.displayName}`}
                              isSelected={isSelected}
                              isDisabled={isBusy || result !== undefined}
                              padding={3}
                              width="100%"
                              onChange={(nextIsSelected) => {
                                const next = new Set(selectedTargetIds);
                                if (nextIsSelected) {
                                  next.add(target.id);
                                } else {
                                  next.delete(target.id);
                                }
                                changeSelection(next);
                              }}
                            >
                              <HStack gap={3} width="100%" vAlign="start">
                                <SkillTargetIcon kind={target.kind} />
                                <StackItem size="fill">
                                  <VStack gap={1} width="100%">
                                    <HStack gap={2} width="100%" vAlign="center">
                                      <StackItem size="fill">
                                        <Text type="label" display="block" maxLines={1}>
                                          {target.displayName}
                                        </Text>
                                      </StackItem>
                                      <HStack gap={1} vAlign="center">
                                        <StatusDot
                                          variant={feedback.variant}
                                          label={feedback.label}
                                          isPulsing={feedback.pulsing}
                                        />
                                        <Text type="supporting" maxLines={1}>
                                          {feedback.label}
                                        </Text>
                                      </HStack>
                                    </HStack>
                                    {feedback.message
                                      ? (
                                          <Text
                                            type="supporting"
                                            color="secondary"
                                            maxLines={2}
                                            wordBreak="break-word"
                                          >
                                            {feedback.message}
                                          </Text>
                                        )
                                      : (
                                          <Text
                                            type="supporting"
                                            color="secondary"
                                            maxLines={1}
                                          >
                                            {target.configuredPath}
                                          </Text>
                                        )}
                                  </VStack>
                                </StackItem>
                              </HStack>
                            </SelectableCard>
                          );
                        })}
                      </Grid>
                    </VStack>
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
  installation,
  isInstallationPending,
  isInstallationUnavailable,
  preflight,
  result,
}: {
  target: SkillTargetView;
  isSelected: boolean;
  isApplying: boolean;
  installation: SkillInstallationView | undefined;
  isInstallationPending: boolean;
  isInstallationUnavailable: boolean;
  preflight: SkillDistributionPreflightResult | undefined;
  result: SkillDistributionResult | undefined;
}): TargetFeedback {
  if (isSelected && isApplying) {
    return { label: 'Distributing', message: undefined, variant: 'accent', pulsing: true };
  }
  const targetResult = isSelected
    ? result?.targets.find((item) => item.targetId === target.id)
    : undefined;
  if (targetResult) {
    return targetResult.ok
      ? { label: 'Succeeded', message: undefined, variant: 'success' }
      : { label: 'Failed', message: targetResult.error.message, variant: 'error' };
  }
  const targetPreflight = isSelected
    ? preflight?.targets.find((item) => item.targetId === target.id)
    : undefined;
  if (targetPreflight) {
    return targetPreflight.status === 'ready'
      ? {
          label: targetPreflight.operation === 'replace' ? 'Will replace' : 'Ready to install',
          message: undefined,
          variant: targetPreflight.operation === 'replace' ? 'warning' : 'success',
        }
      : { label: 'Blocked', message: targetPreflight.message, variant: 'error' };
  }
  if (isInstallationPending) {
    return { label: 'Checking', message: undefined, variant: 'neutral' };
  }
  if (isInstallationUnavailable) {
    return { label: 'Unknown', message: undefined, variant: 'warning' };
  }
  return {
    ...getTargetInstallationPresentation(installation),
    message: undefined,
  };
}
