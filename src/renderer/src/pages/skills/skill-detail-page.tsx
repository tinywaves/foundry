import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Code } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Boxes,
  ExternalLink,
  GitBranch,
  PackagePlus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type {
  SkillInstallationView,
  SkillSourceView,
  SkillStorePackageView,
  SkillTargetView,
  SkillUpdateCheckResult,
  SkillApplyUpdateResult,
  SkillUpdateCandidateView,
} from '../../../../shared/skill-contract';
import { routePaths } from '@renderer/routes';
import { SkillActionBar } from './skill-action-bar';
import {
  abbreviateSkillId,
  parseSkillDetailTab,
  shouldExitMissingSkillDetail,
  skillDetailTabs,
} from './skill-detail-model';
import type { SkillDetailTab } from './skill-detail-model';
import { SkillDistributionDialog } from './skill-distribution-dialog';
import { SkillFileInspector } from './skill-file-inspector';
import {
  getInstallationStatusPresentation,
} from './skill-inventory-model';
import { SkillInventoryLoading } from './skill-loading';
import {
  getSkillInstallationsQueryOptions,
  getSkillSourcesQueryOptions,
  getSkillStorePackageQueryOptions,
  getSkillTargetsQueryOptions,
  invalidateSkillUpdateQueries,
  resolveSkillRequest,
  SkillRequestError,
} from './skill-query';
import {
  describeSkillSourceChecks,
  describeSkillUpdateResult,
  getSkillSourceCandidate,
  getSkillSourceProviderLabel,
  getSkillSourceStatusPresentation,
  mergeSkillSourceCheckResults,
} from './skill-source-model';
import { SkillStoreCorruptionDialog } from './skill-store-corruption-dialog';
import { SkillStoreDeletionDialog } from './skill-store-deletion-dialog';

export function SkillDetailPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const skillId = useParams().skillId ?? '';
  const packageQuery = useQuery(getSkillStorePackageQueryOptions(skillId));
  const installationsQuery = useQuery(getSkillInstallationsQueryOptions({ skillId }));
  const [activeTab, setActiveTab] = useState<SkillDetailTab>('overview');
  const [isDeletionOpen, setIsDeletionOpen] = useState(false);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [isCorruptionOpen, setIsCorruptionOpen] = useState(false);
  const hasExitedMissingPackageRef = useRef(false);
  const packageError = packageQuery.error instanceof SkillRequestError
    ? packageQuery.error
    : undefined;
  const shouldExit = shouldExitMissingSkillDetail(packageError?.apiError?.code);

  useEffect(() => {
    if (!shouldExit || hasExitedMissingPackageRef.current) {
      return;
    }
    hasExitedMissingPackageRef.current = true;
    showToast({
      body: 'Skill Package is no longer in Store.',
      type: 'error',
      uniqueID: `skill-detail-missing-${skillId}`,
    });
    void navigate(routePaths.agentExtensionsSkills, { replace: true });
  }, [navigate, shouldExit, showToast, skillId]);

  if (packageQuery.data === undefined) {
    if (packageQuery.isPending || shouldExit) {
      return <SkillInventoryLoading />;
    }
    return (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Skill Package"
        description={packageQuery.error.message}
      />
    );
  }

  const skillPackage = packageQuery.data;
  return (
    <>
      <VStack width="100%" height="100%">
        <SkillActionBar
          label="Skill Package"
          startContent={(
            <HStack gap={2} vAlign="center">
              <IconButton
                label="Back to Skill Store"
                tooltip="Back to Store"
                icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />}
                variant="ghost"
                size="sm"
                onClick={() => void navigate(routePaths.agentExtensionsSkills)}
              />
              <VStack gap={0}>
                <Heading level={3} accessibilityLevel={1}>
                  {skillPackage.distributionName}
                </Heading>
                <Text type="supporting" color="secondary">
                  {abbreviateSkillId(skillPackage.id)}
                </Text>
              </VStack>
            </HStack>
          )}
          endContent={(
            <HStack gap={1} vAlign="center">
              <Button
                label="Distribute"
                size="sm"
                icon={<Icon icon={PackagePlus} size="sm" color="inherit" />}
                onClick={() => setIsDistributionOpen(true)}
              />
              <Button
                label="Delete"
                size="sm"
                variant="destructive"
                icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                isDisabled={installationsQuery.isPending}
                onClick={() => setIsDeletionOpen(true)}
              />
            </HStack>
          )}
        />
        <SkillActionBar
          label="Skill Package Detail"
          startContent={(
            <TabList
              value={activeTab}
              size="sm"
              onChange={(value) => setActiveTab(parseSkillDetailTab(value))}
              aria-label="Skill Package Detail"
            >
              {skillDetailTabs.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={tab.label} />
              ))}
            </TabList>
          )}
        />
        {packageQuery.isError && (
          <Banner
            status="error"
            container="section"
            title="Couldn't Refresh Skill Package"
            description={packageQuery.error.message}
          />
        )}
        <StackItem size="fill">
          <SkillDetailContent
            activeTab={activeTab}
            skillPackage={skillPackage}
            installations={installationsQuery.data}
            isInstallationsPending={installationsQuery.isPending}
            installationsError={installationsQuery.error}
            onStoreCorrupt={() => setIsCorruptionOpen(true)}
          />
        </StackItem>
      </VStack>
      {isDistributionOpen && (
        <SkillDistributionDialog
          skillPackage={skillPackage}
          onClose={() => setIsDistributionOpen(false)}
          onStoreCorrupt={() => {
            setIsDistributionOpen(false);
            setIsCorruptionOpen(true);
          }}
        />
      )}
      <SkillStoreCorruptionDialog
        isOpen={isCorruptionOpen}
        skillPackage={skillPackage}
        onDismiss={() => setIsCorruptionOpen(false)}
        onDelete={() => {
          setIsCorruptionOpen(false);
          setIsDeletionOpen(true);
        }}
      />
      {isDeletionOpen && (
        <SkillStoreDeletionDialog
          skillPackage={skillPackage}
          onClose={() => setIsDeletionOpen(false)}
          onDeleted={() => {
            setIsDeletionOpen(false);
            void navigate(routePaths.agentExtensionsSkills, { replace: true });
          }}
        />
      )}
    </>
  );
}

interface SkillDetailContentProps {
  activeTab: SkillDetailTab;
  skillPackage: SkillStorePackageView;
  installations: SkillInstallationView[] | undefined;
  isInstallationsPending: boolean;
  installationsError: Error | null;
  onStoreCorrupt: () => void;
}

function SkillDetailContent({
  activeTab,
  skillPackage,
  installations,
  installationsError,
  isInstallationsPending,
  onStoreCorrupt,
}: SkillDetailContentProps) {
  switch (activeTab) {
    case 'overview': {
      return <SkillOverview skillPackage={skillPackage} />;
    }
    case 'files': {
      return (
        <SkillFileInspector
          skillId={skillPackage.id}
          onStoreCorrupt={onStoreCorrupt}
        />
      );
    }
    case 'installations': {
      return (
        <SkillInstallations
          installations={installations}
          isPending={isInstallationsPending}
          error={installationsError}
        />
      );
    }
    case 'sources': {
      return <SkillSources skillId={skillPackage.id} />;
    }
  }
}

function SkillOverview({ skillPackage }: { skillPackage: SkillStorePackageView }) {
  return (
    <Section padding={4} height="100%">
      <VStack width="100%" gap={4}>
        <Heading level={3} accessibilityLevel={2}>Package</Heading>
        <MetadataList columns="multi">
          <MetadataListItem label="Distribution Name">
            <Text>{skillPackage.distributionName}</Text>
          </MetadataListItem>
          <MetadataListItem label="Skill ID">
            <Code>{skillPackage.id}</Code>
          </MetadataListItem>
          <MetadataListItem label="Fingerprint">
            <Code>{abbreviateSkillId(skillPackage.fingerprint)}</Code>
          </MetadataListItem>
          <MetadataListItem label="Created">
            <Text>{formatSkillTimestamp(skillPackage.createdAt)}</Text>
          </MetadataListItem>
          <MetadataListItem label="Updated">
            <Text>{formatSkillTimestamp(skillPackage.updatedAt)}</Text>
          </MetadataListItem>
        </MetadataList>
      </VStack>
    </Section>
  );
}

interface SkillInstallationsProps {
  installations: SkillInstallationView[] | undefined;
  isPending: boolean;
  error: Error | null;
}

function SkillInstallations({
  installations,
  isPending,
  error,
}: SkillInstallationsProps) {
  const targetsQuery = useQuery(getSkillTargetsQueryOptions());
  const rows = useMemo(() => buildInstallationRows(
    installations ?? [],
    targetsQuery.data ?? [],
  ), [installations, targetsQuery.data]);
  const columns = useMemo<Array<TableColumn<SkillInstallationRow>>>(() => [
    { key: 'target', header: 'Target', width: proportional(1) },
    { key: 'directory', header: 'Directory', width: proportional(1) },
    {
      key: 'status',
      header: 'Status',
      width: proportional(1),
      renderCell: (row) => (
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={row.statusVariant} label={row.status} />
          <Text type="supporting">{row.status}</Text>
        </HStack>
      ),
    },
    { key: 'fingerprint', header: 'Distributed Fingerprint', width: proportional(1) },
    { key: 'updated', header: 'Updated', width: proportional(1) },
  ], []);

  if (isPending || targetsQuery.isPending) {
    return <SkillInventoryLoading />;
  }
  if (installations === undefined || targetsQuery.data === undefined) {
    return (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Installations"
        description={error?.message ?? targetsQuery.error?.message ?? 'Installations are unavailable.'}
      />
    );
  }
  if (installations.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="No Installations"
        icon={<Icon icon={Boxes} size="lg" color="secondary" />}
      />
    );
  }
  return (
    <VStack width="100%" height="100%">
      {(error || targetsQuery.isError) && (
        <Banner
          status="error"
          container="section"
          title="Couldn't Refresh Installations"
          description={error?.message ?? targetsQuery.error?.message ?? 'Existing data is still available.'}
        />
      )}
      <StackItem size="fill">
        <Table
          data={rows}
          columns={columns}
          idKey="id"
          density="compact"
          dividers="rows"
          textOverflow="truncate"
          aria-label="Skill installations"
        />
      </StackItem>
    </VStack>
  );
}

interface SkillInstallationRow extends Record<string, unknown> {
  id: string;
  target: string;
  directory: string;
  status: string;
  statusVariant: 'success' | 'warning' | 'error' | 'accent' | 'neutral';
  fingerprint: string;
  updated: string;
}

function buildInstallationRows(
  installations: readonly SkillInstallationView[],
  targets: readonly SkillTargetView[],
): SkillInstallationRow[] {
  const targetNames = new Map(targets.map((target) => [target.id, target.displayName]));
  return installations.map((installation) => {
    const status = getInstallationStatusPresentation(installation);
    return {
      id: installation.id,
      target: targetNames.get(installation.targetId) ?? 'Unknown Target',
      directory: installation.relativePath,
      status: status.label,
      statusVariant: status.variant,
      fingerprint: abbreviateSkillId(installation.distributedFingerprint),
      updated: formatSkillTimestamp(installation.updatedAt),
    };
  });
}

interface SkillSourceRow extends Record<string, unknown> {
  id: string;
  provider: string;
  locator: string;
  revision: string;
  imported: string;
  source: SkillSourceView;
}

interface SkillUpdateSelection {
  source: SkillSourceView;
  candidate: SkillUpdateCandidateView;
}

function SkillSources({ skillId }: { skillId: string }) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const sourcesQuery = useQuery(getSkillSourcesQueryOptions(skillId));
  const [updateSelection, setUpdateSelection] = useState<SkillUpdateSelection>();
  const [checksBySourceId, setChecksBySourceId] = useState<
    Map<string, SkillUpdateCheckResult>
  >(() => new Map());
  const updateChecks = (results: readonly SkillUpdateCheckResult[]) => {
    setChecksBySourceId((current) => mergeSkillSourceCheckResults(current, results));
  };
  const packageCheckMutation = useMutation<
    SkillUpdateCheckResult[],
    SkillRequestError
  >({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.checkPackageForUpdates(skillId),
      'Skill Sources could not be checked.',
    ),
    onSuccess: (results) => {
      updateChecks(results);
      showToast({
        body: describeSkillSourceChecks(results),
        type: 'info',
        uniqueID: `skill-source-package-check-${skillId}`,
      });
    },
  });
  const sourceCheckMutation = useMutation<
    SkillUpdateCheckResult,
    SkillRequestError,
    string
  >({
    mutationFn: (sourceId) => resolveSkillRequest(
      () => globalThis.api.skills.checkSourceForUpdates(sourceId),
      'The Skill Source could not be checked.',
    ),
    onSuccess: (result) => {
      updateChecks([result]);
      showToast({
        body: describeSkillSourceChecks([result]),
        type: 'info',
        uniqueID: `skill-source-check-${result.source.id}`,
      });
    },
  });
  const openMutation = useMutation<null, SkillRequestError, string>({
    mutationFn: (sourceId) => resolveSkillRequest(
      () => globalThis.api.skills.openSource(sourceId),
      'The Skill Source could not be opened.',
    ),
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-source-open',
    }),
  });
  const applyMutation = useMutation<
    SkillApplyUpdateResult,
    SkillRequestError,
    SkillUpdateCandidateView
  >({
    mutationFn: (candidate) => resolveSkillRequest(
      () => globalThis.api.skills.applyUpdate({ candidate }),
      'The Skill update could not be applied.',
    ),
    onSuccess: (result) => {
      setUpdateSelection(undefined);
      setChecksBySourceId(new Map());
      showToast({
        body: describeSkillUpdateResult(result),
        type: 'info',
        uniqueID: `skill-source-apply-${skillId}`,
      });
      void invalidateSkillUpdateQueries(queryClient, skillId);
    },
  });
  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);
  const rows = useMemo<SkillSourceRow[]>(() => sources.map((source) => ({
    id: source.id,
    provider: getSkillSourceProviderLabel(source.provider),
    locator: source.sourceNativeId,
    revision: abbreviateSkillId(source.resolvedRevision),
    imported: formatSkillTimestamp(source.fetchedAt),
    source,
  })), [sources]);
  const columns = useMemo<Array<TableColumn<SkillSourceRow>>>(() => [
    { key: 'provider', header: 'Provider', width: proportional(1) },
    { key: 'locator', header: 'Source', width: proportional(2) },
    {
      key: 'id',
      header: 'State',
      width: proportional(1),
      renderCell: (row) => {
        const presentation = getSkillSourceStatusPresentation(
          row.source,
          checksBySourceId.get(row.source.id),
        );
        return (
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={presentation.variant} label={presentation.label} />
            <Text type="supporting">{presentation.label}</Text>
          </HStack>
        );
      },
    },
    {
      key: 'revision',
      header: 'Imported Revision',
      width: proportional(1),
      renderCell: (row) => <Code>{row.revision}</Code>,
    },
    { key: 'imported', header: 'Imported', width: proportional(1) },
    {
      key: 'source',
      header: 'Actions',
      width: proportional(2),
      align: 'end',
      renderCell: (row) => {
        const candidate = getSkillSourceCandidate(checksBySourceId.get(row.source.id));
        return (
          <HStack gap={1} hAlign="end" vAlign="center">
            {candidate && (
              <Button
                label="Apply Update"
                size="sm"
                onClick={() => setUpdateSelection({ source: row.source, candidate })}
              />
            )}
            {row.source.trackingMode === 'tracked' && (
              <IconButton
                label={`Check ${row.locator} for updates`}
                tooltip="Check for updates"
                icon={<Icon icon={RefreshCw} size="sm" color="inherit" />}
                variant="ghost"
                size="sm"
                isLoading={sourceCheckMutation.isPending
                  && sourceCheckMutation.variables === row.id}
                isDisabled={packageCheckMutation.isPending || applyMutation.isPending}
                onClick={() => sourceCheckMutation.mutate(row.id)}
              />
            )}
            <IconButton
              label={`Open ${row.locator}`}
              tooltip="Open Source"
              icon={<Icon icon={ExternalLink} size="sm" color="inherit" />}
              variant="ghost"
              size="sm"
              isLoading={openMutation.isPending && openMutation.variables === row.id}
              onClick={() => openMutation.mutate(row.id)}
            />
          </HStack>
        );
      },
    },
  ], [
    applyMutation.isPending,
    checksBySourceId,
    openMutation,
    packageCheckMutation.isPending,
    sourceCheckMutation,
  ]);
  if (sourcesQuery.isPending) {
    return <SkillInventoryLoading />;
  }
  if (sourcesQuery.data === undefined) {
    return (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Sources"
        description={sourcesQuery.error.message}
      />
    );
  }
  if (sources.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="No Remote Sources"
        icon={<Icon icon={GitBranch} size="lg" color="secondary" />}
      />
    );
  }
  const hasTrackedSources = sources.some((source) => source.trackingMode === 'tracked');
  const error = sourcesQuery.error
    ?? packageCheckMutation.error
    ?? sourceCheckMutation.error
    ?? applyMutation.error;
  return (
    <>
      <VStack width="100%" height="100%" gap={0}>
        <SkillActionBar
          label="Skill Sources"
          startContent={<Heading level={4} accessibilityLevel={2}>Sources</Heading>}
          endContent={(
            <Button
              label="Check for Updates"
              size="sm"
              variant="secondary"
              icon={<Icon icon={RefreshCw} size="sm" color="inherit" />}
              isLoading={packageCheckMutation.isPending}
              isDisabled={!hasTrackedSources
                || sourceCheckMutation.isPending
                || applyMutation.isPending}
              onClick={() => packageCheckMutation.mutate()}
            />
          )}
        />
        {error && (
          <Banner
            status="error"
            container="section"
            title="Source Operation Couldn't Finish"
            description={error.message}
          />
        )}
        <StackItem size="fill">
          <Table
            data={rows}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="rows"
            textOverflow="truncate"
            aria-label="Skill Sources"
          />
        </StackItem>
      </VStack>
      {updateSelection
        ? (
            <SkillApplyUpdateDialog
              selection={updateSelection}
              isPending={applyMutation.isPending}
              onClose={() => setUpdateSelection(undefined)}
              onApply={() => applyMutation.mutate(updateSelection.candidate)}
            />
          )
        : null}
    </>
  );
}

function SkillApplyUpdateDialog({
  selection,
  isPending,
  onClose,
  onApply,
}: {
  selection: SkillUpdateSelection;
  isPending: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const { candidate, source } = selection;
  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) {
          onClose();
        }
      }}
      purpose={isPending ? 'required' : 'form'}
      width={520}
    >
      <Layout
        header={(
          <DialogHeader
            title="Apply Store Update"
            subtitle={getSkillSourceProviderLabel(source.provider)}
            onOpenChange={
              isPending
                ? undefined
                : (isOpen) => {
                    if (!isOpen) {
                      onClose();
                    }
                  }
            }
          />
        )}
        content={(
          <LayoutContent>
            <MetadataList>
              <MetadataListItem label="Source">
                <Text>{source.sourceNativeId}</Text>
              </MetadataListItem>
              <MetadataListItem label="Current Revision">
                <Code>{source.resolvedRevision}</Code>
              </MetadataListItem>
              <MetadataListItem label="Update Revision">
                <Code>{candidate.resolvedRevision}</Code>
              </MetadataListItem>
            </MetadataList>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={isPending}
                onClick={onClose}
              />
              <Button
                label="Apply Update"
                variant="primary"
                isLoading={isPending}
                onClick={onApply}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function formatSkillTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
