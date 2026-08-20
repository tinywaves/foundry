import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SkillTrashPackageView } from '../../../../shared/skill-contract';
import { SkillActionBar } from './skill-action-bar';
import { getEmptySkillTrashDescription } from './skill-detail-model';
import { SkillInventoryLoading } from './skill-loading';
import { getSkillTrashQueryOptions } from './skill-query';
import { useSkillTrashActions } from './use-skill-trash-actions';

interface SkillTrashRow extends Record<string, unknown> {
  id: string;
  skillId: string;
  distributionName: string;
  skillPackage: SkillTrashPackageView;
  deleted: string;
}

export function SkillTrashPage() {
  const trashQuery = useQuery(getSkillTrashQueryOptions());
  const { emptyMutation, removalMutation, restoreMutation } = useSkillTrashActions();
  const [packageToRemove, setPackageToRemove] = useState<SkillTrashPackageView>();
  const [packagesToEmpty, setPackagesToEmpty] = useState<SkillTrashPackageView[]>();
  const isBusy = emptyMutation.isPending
    || removalMutation.isPending
    || restoreMutation.isPending;
  const rows = useMemo<SkillTrashRow[]>(() => (trashQuery.data ?? []).map((skillPackage) => (
    {
      id: skillPackage.id,
      skillId: skillPackage.id,
      distributionName: skillPackage.distributionName,
      skillPackage,
      deleted: formatTrashTimestamp(skillPackage.trashedAt),
    }
  )), [trashQuery.data]);
  const columns = useMemo<Array<TableColumn<SkillTrashRow>>>(() => [
    {
      key: 'distributionName',
      header: 'Skill',
      width: proportional(2),
      renderCell: (row) => (
        <Text type="body" maxLines={1} hasTruncateTooltip>
          {row.distributionName}
        </Text>
      ),
    },
    { key: 'skillId', header: 'Skill ID', width: proportional(1) },
    { key: 'deleted', header: 'Deleted', width: proportional(1) },
    {
      key: 'id',
      header: 'Actions',
      width: proportional(1),
      align: 'end',
      renderCell: (row) => (
        <HStack gap={1} hAlign="end" vAlign="center">
          <IconButton
            label={`Restore ${row.distributionName}`}
            tooltip="Restore"
            icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isDisabled={isBusy}
            isLoading={restoreMutation.isPending
              && restoreMutation.variables.id === row.id}
            onClick={() => restoreMutation.mutate(row.skillPackage)}
          />
          <IconButton
            label={`Remove ${row.distributionName} from Foundry`}
            tooltip="Remove from Foundry"
            icon={<Icon icon={Trash2} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isDisabled={isBusy}
            onClick={() => setPackageToRemove(row.skillPackage)}
          />
        </HStack>
      ),
    },
  ], [isBusy, restoreMutation]);

  let content;
  if (trashQuery.isPending) {
    content = <SkillInventoryLoading />;
  } else if (trashQuery.data === undefined) {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Skill Trash"
        description={trashQuery.error.message}
      />
    );
  } else if (trashQuery.data.length === 0) {
    content = (
      <Section padding={4} height="100%">
        <EmptyState
          headingLevel={2}
          title="Trash Is Empty"
          icon={<Icon icon={Trash2} size="lg" color="secondary" />}
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
        aria-label="Trashed Skill Packages"
      />
    );
  }

  return (
    <>
      <VStack width="100%" height="100%">
        <SkillActionBar
          label="Skill Trash Controls"
          endContent={(
            <Button
              label="Empty Trash"
              variant="destructive"
              size="sm"
              icon={<Icon icon={Trash2} size="sm" color="inherit" />}
              isDisabled={isBusy || (trashQuery.data?.length ?? 0) === 0}
              onClick={() => setPackagesToEmpty(trashQuery.data)}
            />
          )}
        />
        {trashQuery.isError && trashQuery.data !== undefined && (
          <Banner
            status="error"
            container="section"
            title="Couldn't Refresh Skill Trash"
            description={trashQuery.error.message}
          />
        )}
        <StackItem size="fill">{content}</StackItem>
      </VStack>
      <AlertDialog
        isOpen={packageToRemove !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !removalMutation.isPending) {
            setPackageToRemove(undefined);
          }
        }}
        title="Remove Skill Package from Foundry?"
        description={packageToRemove
          ? `"${packageToRemove.distributionName}" will no longer appear in Foundry.`
          : 'This Skill Package will no longer appear in Foundry.'}
        actionLabel="Remove from Foundry"
        actionVariant="destructive"
        isActionLoading={removalMutation.isPending}
        onAction={() => {
          if (!packageToRemove || removalMutation.isPending) {
            return;
          }
          removalMutation.mutate(packageToRemove, {
            onSuccess: () => setPackageToRemove(undefined),
          });
        }}
      />
      <AlertDialog
        isOpen={packagesToEmpty !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !emptyMutation.isPending) {
            setPackagesToEmpty(undefined);
          }
        }}
        title="Empty Skill Trash?"
        description={getEmptySkillTrashDescription(packagesToEmpty?.length ?? 0)}
        actionLabel="Empty Trash"
        actionVariant="destructive"
        isActionLoading={emptyMutation.isPending}
        onAction={() => {
          if (!packagesToEmpty || emptyMutation.isPending) {
            return;
          }
          emptyMutation.mutate(packagesToEmpty, {
            onSuccess: () => setPackagesToEmpty(undefined),
          });
        }}
      />
    </>
  );
}

function formatTrashTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
