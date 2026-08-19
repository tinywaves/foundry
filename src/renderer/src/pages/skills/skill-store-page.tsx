import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, FolderOpen, Import, PackagePlus, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import type {
  SkillDiscoveryResult,
  SkillStorePackageView,
} from '../../../../shared/skill-contract';
import { routePaths } from '@renderer/routes';
import { SkillActionBar } from './skill-action-bar';
import {
  filterSkillStorePackages,
  getStoreObservationPresentation,
} from './skill-inventory-model';
import { SkillInventoryLoading } from './skill-loading';
import {
  getSkillStorePackagesQueryOptions,
  invalidateSkillQueries,
  resolveSkillRequest,
} from './skill-query';
import type { SkillRequestError } from './skill-query';
import { SkillDistributionDialog } from './skill-distribution-dialog';

interface SkillStoreRow extends Record<string, unknown> {
  id: string;
  distributionName: string;
  skillPackage: SkillStorePackageView;
  status: string;
  updated: string;
}

function formatUpdatedAt(updatedAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(updatedAt));
}

function describeImport(result: SkillDiscoveryResult): string {
  const warningCount = result.warnings.length + result.rootFailures.length;
  const summary = `Imported ${result.packagesImported} and adopted ${result.installationsAdopted}.`;
  return warningCount === 0
    ? `${summary} Inspected ${result.rootsInspected} targets.`
    : `${summary} ${warningCount} scan warnings need attention.`;
}

export function SkillStorePage() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [importResult, setImportResult] = useState<SkillDiscoveryResult>();
  const [packageToDistribute, setPackageToDistribute] = useState<SkillStorePackageView>();
  const storeQuery = useQuery(getSkillStorePackagesQueryOptions());
  const importMutation = useMutation<SkillDiscoveryResult, SkillRequestError>({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.importExisting(),
      'Installed Skills could not be imported.',
    ),
    onSuccess: (result) => {
      setImportResult(result);
      void invalidateSkillQueries(queryClient);
    },
  });
  const revealMutation = useMutation<null, SkillRequestError, string>({
    mutationFn: (skillId) => resolveSkillRequest(
      () => globalThis.api.skills.revealPackage(skillId),
      'The Store package could not be revealed.',
    ),
    onError: (error) => showToast({
      body: error.message,
      type: 'error',
      uniqueID: 'skill-store-reveal',
    }),
  });
  const filteredPackages = filterSkillStorePackages(storeQuery.data ?? [], search);
  const rows = useMemo<SkillStoreRow[]>(() => filteredPackages.map((skillPackage) => ({
    id: skillPackage.id,
    distributionName: skillPackage.distributionName,
    skillPackage,
    status: getStoreObservationPresentation(skillPackage.storeObservation.status).label,
    updated: formatUpdatedAt(skillPackage.updatedAt),
  })), [filteredPackages]);
  const columns = useMemo<Array<TableColumn<SkillStoreRow>>>(() => [
    {
      key: 'distributionName',
      header: 'Skill',
      width: proportional(2),
      renderCell: (row) => (
        <Link
          as={RouterLink}
          href={routePaths.agentExtensionsSkill(row.id)}
          isStandalone
        >
          {row.distributionName}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Store',
      width: proportional(1),
      renderCell: (row) => {
        const presentation = getStoreObservationPresentation(
          row.skillPackage.storeObservation.status,
        );
        return (
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={presentation.variant} label={presentation.label} />
            <Text type="supporting">{presentation.label}</Text>
          </HStack>
        );
      },
    },
    { key: 'updated', header: 'Observed', width: proportional(1) },
    {
      key: 'id',
      header: 'Actions',
      width: proportional(1),
      align: 'end',
      renderCell: (row) => (
        <HStack gap={1} hAlign="end" vAlign="center">
          <IconButton
            label={`Distribute ${row.distributionName}`}
            tooltip="Distribute"
            icon={<Icon icon={PackagePlus} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isDisabled={row.skillPackage.storeObservation.status !== 'available'}
            onClick={() => setPackageToDistribute(row.skillPackage)}
          />
          <IconButton
            label={`Reveal ${row.distributionName} in Finder`}
            tooltip="Reveal in Finder"
            icon={<Icon icon={FolderOpen} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isLoading={revealMutation.isPending && revealMutation.variables === row.id}
            onClick={() => revealMutation.mutate(row.id)}
          />
        </HStack>
      ),
    },
  ], [revealMutation]);

  let content;
  if (storeQuery.isPending) {
    content = <SkillInventoryLoading />;
  } else if (storeQuery.data === undefined) {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Skill Store"
        description={storeQuery.error.message}
      />
    );
  } else if (filteredPackages.length === 0) {
    const hasSearch = search.trim().length > 0;
    content = (
      <Section padding={4} height="100%">
        <EmptyState
          headingLevel={2}
          title={hasSearch ? 'No Matching Skills' : 'No Skills in Store'}
          description={hasSearch
            ? 'Try another name or clear the search.'
            : 'Import Skills already installed in recognized local targets.'}
          icon={<Icon icon={hasSearch ? Search : Wrench} size="lg" color="secondary" />}
          actions={hasSearch
            ? <Button label="Clear Search" variant="secondary" onClick={() => setSearch('')} />
            : (
                <Button
                  label="Import Existing"
                  variant="primary"
                  icon={<Icon icon={Import} size="sm" color="inherit" />}
                  isLoading={importMutation.isPending}
                  onClick={() => importMutation.mutate()}
                />
              )}
        />
      </Section>
    );
  } else {
    content = (
      <Table
        data={rows}
        columns={columns}
        idKey="id"
        density="compact"
        dividers="rows"
        textOverflow="truncate"
        aria-label="Skill Store packages"
      />
    );
  }

  return (
    <>
      <VStack width="100%" height="100%">
        <SkillActionBar
          label="Skill Store Controls"
          slotGap={4}
          startContent={(
            <TextInput
              label="Search Skill Store"
              value={search}
              onChange={setSearch}
              startIcon={Search}
              hasClear
              isLabelHidden
              placeholder="Search Store"
              width="100%"
            />
          )}
          endContent={(
            <HStack gap={2} vAlign="center">
              <Button
                as={RouterLink}
                href={routePaths.agentExtensionsSkillsDiscover}
                label="Discover"
                variant="secondary"
                icon={<Icon icon={Compass} size="sm" color="inherit" />}
              />
              <Button
                label="Import Existing"
                variant="primary"
                icon={<Icon icon={Import} size="sm" color="inherit" />}
                isLoading={importMutation.isPending}
                isDisabled={importMutation.isPending}
                onClick={() => importMutation.mutate()}
              />
            </HStack>
          )}
        />
        {importMutation.isError && (
          <Banner
            status="error"
            container="section"
            title="Import Couldn't Finish"
            description={importMutation.error.message}
          />
        )}
        {importResult && !importMutation.isError && (
          <Banner
            status={importResult.warnings.length + importResult.rootFailures.length > 0
              ? 'warning'
              : 'success'}
            container="section"
            title="Import Finished"
            description={describeImport(importResult)}
            isDismissable
            onDismiss={() => setImportResult(undefined)}
          />
        )}
        {storeQuery.isError && storeQuery.data !== undefined && (
          <Banner
            status="error"
            container="section"
            title="Couldn't Refresh Skill Store"
            description={storeQuery.error.message}
          />
        )}
        <StackItem size="fill">{content}</StackItem>
      </VStack>
      {packageToDistribute && (
        <SkillDistributionDialog
          skillPackage={packageToDistribute}
          onClose={() => setPackageToDistribute(undefined)}
        />
      )}
    </>
  );
}
