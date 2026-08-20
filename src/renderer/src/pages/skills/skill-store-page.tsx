import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, Import, PackagePlus, Search, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import type {
  SkillDiscoveryResult,
  SkillStorePackageView,
} from '../../../../shared/skill-contract';
import { routePaths } from '@renderer/routes';
import { SkillActionBar } from './skill-action-bar';
import { SkillImportIssuesDialog } from './skill-import-issues-dialog';
import {
  buildSkillImportIssues,
  describeSkillImport,
  getSkillImportWarningCount,
} from './skill-import-result-model';
import { filterSkillStorePackages } from './skill-inventory-model';
import { SkillInventoryLoading } from './skill-loading';
import {
  getSkillStorePackagesQueryOptions,
  getSkillTargetsQueryOptions,
  invalidateSkillQueries,
  resolveSkillRequest,
} from './skill-query';
import type { SkillRequestError } from './skill-query';
import { SkillDistributionDialog } from './skill-distribution-dialog';
import { SkillStoreCorruptionDialog } from './skill-store-corruption-dialog';
import { SkillStoreDeletionDialog } from './skill-store-deletion-dialog';

interface SkillStoreRow extends Record<string, unknown> {
  id: string;
  distributionName: string;
  skillPackage: SkillStorePackageView;
  fingerprint: string;
}

const IMPORT_RESULT_AUTO_HIDE_MS = 8000;

export function SkillStorePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [importResult, setImportResult] = useState<SkillDiscoveryResult>();
  const [areImportIssuesOpen, setAreImportIssuesOpen] = useState(false);
  const [packageToDistribute, setPackageToDistribute] = useState<SkillStorePackageView>();
  const [corruptPackage, setCorruptPackage] = useState<SkillStorePackageView>();
  const [packageToDelete, setPackageToDelete] = useState<SkillStorePackageView>();
  const storeQuery = useQuery(getSkillStorePackagesQueryOptions());
  const targetsQuery = useQuery(getSkillTargetsQueryOptions());
  const importIssues = useMemo(() => importResult
    ? buildSkillImportIssues(importResult, targetsQuery.data ?? [])
    : [], [importResult, targetsQuery.data]);
  const importMutation = useMutation<SkillDiscoveryResult, SkillRequestError>({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.importExisting(),
      'Installed Skills could not be imported.',
    ),
    onSuccess: (result) => {
      setAreImportIssuesOpen(false);
      setImportResult(result);
      void invalidateSkillQueries(queryClient);
    },
  });
  useEffect(() => {
    if (!importResult || areImportIssuesOpen) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setImportResult((currentResult) => (
        currentResult === importResult ? undefined : currentResult
      ));
    }, IMPORT_RESULT_AUTO_HIDE_MS);
    return () => clearTimeout(timeoutId);
  }, [areImportIssuesOpen, importResult]);
  const filteredPackages = filterSkillStorePackages(storeQuery.data ?? [], search);
  const rows = useMemo<SkillStoreRow[]>(() => filteredPackages.map((skillPackage) => ({
    id: skillPackage.id,
    distributionName: skillPackage.distributionName,
    skillPackage,
    fingerprint: skillPackage.fingerprint.slice(0, 15),
  })), [filteredPackages]);
  const columns = useMemo<Array<TableColumn<SkillStoreRow>>>(() => [
    {
      key: 'distributionName',
      header: 'Skill',
      width: proportional(3),
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
      key: 'fingerprint',
      header: 'Fingerprint',
      width: proportional(1),
    },
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
            onClick={() => setPackageToDistribute(row.skillPackage)}
          />
        </HStack>
      ),
    },
  ], []);

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
            status={getSkillImportWarningCount(importResult) > 0
              ? 'warning'
              : 'success'}
            container="section"
            title="Import Finished"
            description={describeSkillImport(importResult)}
            endContent={importIssues.length > 0
              ? (
                  <Button
                    label="View Details"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAreImportIssuesOpen(true)}
                  />
                )
              : undefined}
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
          onStoreCorrupt={() => {
            setPackageToDistribute(undefined);
            setCorruptPackage(packageToDistribute);
          }}
        />
      )}
      {corruptPackage && (
        <SkillStoreCorruptionDialog
          isOpen
          skillPackage={corruptPackage}
          onDismiss={() => setCorruptPackage(undefined)}
          onDelete={() => {
            setPackageToDelete(corruptPackage);
            setCorruptPackage(undefined);
          }}
        />
      )}
      {packageToDelete && (
        <SkillStoreDeletionDialog
          skillPackage={packageToDelete}
          onClose={() => setPackageToDelete(undefined)}
          onDeleted={() => setPackageToDelete(undefined)}
        />
      )}
      {areImportIssuesOpen && importIssues.length > 0 && (
        <SkillImportIssuesDialog
          issues={importIssues}
          onClose={() => setAreImportIssuesOpen(false)}
        />
      )}
    </>
  );
}
