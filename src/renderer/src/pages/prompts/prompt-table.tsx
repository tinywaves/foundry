import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack } from '@astryxdesign/core/Stack';
import { Table, pixel, proportional } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { sizeVars } from '@astryxdesign/core/theme/tokens.stylex';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { PromptSummary } from '../../../../shared/prompt-contract';
import { routePaths } from '@renderer/routes';

type PromptTableRow = PromptSummary & Record<string, unknown>;

interface PromptTableProps {
  prompts: PromptSummary[];
  isCopying: (promptId: string) => boolean;
  onCopy: (promptId: string) => void;
  onEdit: (promptId: string) => void;
  onMoveToTrash: (prompt: PromptSummary) => void;
}

const titleWidth = proportional(2);
const descriptionWidth = proportional(3);
const updatedAtWidth = pixel(180);
const actionsWidth = pixel(128);

export function PromptTable({
  prompts,
  isCopying,
  onCopy,
  onEdit,
  onMoveToTrash,
}: PromptTableProps) {
  const columns = useMemo<Array<TableColumn<PromptTableRow>>>(() => [
    {
      key: 'title',
      header: 'Title',
      width: titleWidth,
      renderCell: (prompt) => (
        <Link
          href={routePaths.agentExtensionsPrompt(prompt.id)}
          isStandalone
          weight="medium"
          maxLines={1}
        >
          {prompt.title}
        </Link>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: descriptionWidth,
      renderCell: (prompt) => (
        <Text type="supporting" color="secondary" maxLines={1}>
          {prompt.description ?? 'None'}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated At',
      width: updatedAtWidth,
      renderCell: (prompt) => (
        <Timestamp value={new Date(prompt.updatedAt).toISOString()} format="auto" />
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
            label={`Copy ${prompt.title}`}
            tooltip="Copy Prompt"
            icon={<Icon icon={Copy} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isLoading={isCopying(prompt.id)}
            onClick={() => onCopy(prompt.id)}
          />
          <IconButton
            label={`Edit ${prompt.title}`}
            tooltip="Edit Prompt"
            icon={<Icon icon={Pencil} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            onClick={() => onEdit(prompt.id)}
          />
          <IconButton
            label={`Move ${prompt.title} to Trash`}
            tooltip="Move to Trash"
            icon={<Icon icon={Trash2} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            onClick={() => onMoveToTrash(prompt)}
          />
        </HStack>
      ),
    },
  ], [isCopying, onCopy, onEdit, onMoveToTrash]);

  return (
    <Table
      data={prompts as PromptTableRow[]}
      columns={columns}
      idKey="id"
      density="compact"
      dividers="rows"
      hasHover
      textOverflow="truncate"
    />
  );
}

interface LoadingPromptRow extends Record<string, unknown> {
  id: string;
}

const loadingRows: LoadingPromptRow[] = Array.from({ length: 5 }, (_, index) => ({
  id: `loading-${index}`,
}));

const loadingColumns: Array<TableColumn<LoadingPromptRow>> = [
  {
    key: 'title',
    header: 'Title',
    width: titleWidth,
    renderCell: (row) => (
      <Skeleton width="70%" height={sizeVars['--size-element-sm']} index={Number(row.id.at(-1))} />
    ),
  },
  {
    key: 'description',
    header: 'Description',
    width: descriptionWidth,
    renderCell: (row) => (
      <Skeleton width="85%" height={sizeVars['--size-element-sm']} index={Number(row.id.at(-1))} />
    ),
  },
  {
    key: 'updatedAt',
    header: 'Updated At',
    width: updatedAtWidth,
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

export function PromptTableLoading() {
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
