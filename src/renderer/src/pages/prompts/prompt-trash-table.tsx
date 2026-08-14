import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack } from '@astryxdesign/core/Stack';
import { Table, pixel, proportional } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { sizeVars } from '@astryxdesign/core/theme/tokens.stylex';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { TrashedPromptSummary } from '../../../../shared/prompt-contract';
import { routePaths } from '@renderer/routes';

type PromptTrashTableRow = TrashedPromptSummary & Record<string, unknown>;

interface PromptTrashTableProps {
  isBusy: boolean;
  isRestoring: (promptId: string) => boolean;
  onRemove: (prompt: TrashedPromptSummary) => void;
  onRestore: (prompt: TrashedPromptSummary) => void;
  prompts: TrashedPromptSummary[];
}

const titleWidth = proportional(1);
const trashedAtWidth = pixel(200);
const actionsWidth = pixel(88);

export function PromptTrashTable({
  isBusy,
  isRestoring,
  onRemove,
  onRestore,
  prompts,
}: PromptTrashTableProps) {
  const columns = useMemo<Array<TableColumn<PromptTrashTableRow>>>(() => [
    {
      key: 'title',
      header: 'Title',
      width: titleWidth,
      renderCell: (prompt) => (
        <Link
          href={routePaths.agentExtensionsTrashedPrompt(prompt.id)}
          isStandalone
          weight="medium"
          maxLines={1}
        >
          {prompt.title}
        </Link>
      ),
    },
    {
      key: 'trashedAt',
      header: 'Moved to Trash',
      width: trashedAtWidth,
      renderCell: (prompt) => (
        <Timestamp value={new Date(prompt.trashedAt).toISOString()} format="auto" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: actionsWidth,
      align: 'end',
      resizable: false,
      renderCell: (prompt) => (
        <HStack gap={1} hAlign="end" vAlign="center">
          <IconButton
            label={`Restore ${prompt.title}`}
            tooltip="Restore Prompt"
            icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isLoading={isRestoring(prompt.id)}
            isDisabled={isBusy && !isRestoring(prompt.id)}
            onClick={() => onRestore(prompt)}
          />
          <IconButton
            label={`Remove ${prompt.title} from Trash`}
            tooltip="Remove from Trash"
            icon={<Icon icon={Trash2} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isDisabled={isBusy}
            onClick={() => onRemove(prompt)}
          />
        </HStack>
      ),
    },
  ], [isBusy, isRestoring, onRemove, onRestore]);

  return (
    <Table
      data={prompts as PromptTrashTableRow[]}
      columns={columns}
      idKey="id"
      density="compact"
      dividers="rows"
      hasHover
      textOverflow="truncate"
    />
  );
}

interface LoadingTrashRow extends Record<string, unknown> {
  id: string;
}

const loadingRows: LoadingTrashRow[] = Array.from({ length: 5 }, (_, index) => ({
  id: `trash-loading-${index}`,
}));

const loadingColumns: Array<TableColumn<LoadingTrashRow>> = [
  {
    key: 'title',
    header: 'Title',
    width: titleWidth,
    renderCell: (row) => (
      <Skeleton width="70%" height={sizeVars['--size-element-sm']} index={Number(row.id.at(-1))} />
    ),
  },
  {
    key: 'trashedAt',
    header: 'Moved to Trash',
    width: trashedAtWidth,
    renderCell: (row) => (
      <Skeleton width="80%" height={sizeVars['--size-element-sm']} index={Number(row.id.at(-1))} />
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    width: actionsWidth,
    align: 'end',
    resizable: false,
    renderCell: (row) => (
      <Skeleton width="100%" height={sizeVars['--size-element-sm']} index={Number(row.id.at(-1))} />
    ),
  },
];

export function PromptTrashTableLoading() {
  return (
    <Table
      data={loadingRows}
      columns={loadingColumns}
      idKey="id"
      density="compact"
      dividers="rows"
      textOverflow="truncate"
    />
  );
}
