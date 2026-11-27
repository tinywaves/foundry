import type { Instruction } from '@dhzh/foundry-shared';
import {
  FileTextIcon,
  GripVerticalIcon,
  PencilIcon,
  RotateCwIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Empty } from '@/components/empty';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Popover,
  PopoverContent,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { INSTRUCTION_DRAG_TYPE } from '@/features/agents/drag';

interface InstructionLibraryProps {
  assignedInstructionIds: ReadonlySet<string>;
  instructions: Instruction[];
  isAssignmentStateReady: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit: (instruction: Instruction) => void;
  onDelete: (instruction: Instruction) => void;
  onPreload: () => void;
}

interface PendingDelete {
  anchor: HTMLElement;
  instruction: Instruction;
}

export function InstructionLibrary({
  assignedInstructionIds,
  instructions,
  isAssignmentStateReady,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onPreload,
}: InstructionLibraryProps) {
  const { t } = useTranslation();
  const rowRef = useRef(new Map<string, HTMLElement>());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="divide-y">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-center gap-2 p-3">
              <Skeleton className="size-3.5 rounded-sm" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="items-start gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          {t('instructions.loadError')}
        </p>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCwIcon />
          <span>{t('common.retry')}</span>
        </Button>
      </Card>
    );
  }

  if (instructions.length === 0) {
    return (
      <Card className="gap-0 py-0">
        <Empty
          icon={FileTextIcon}
          title={t('instructions.emptyTitle')}
          description={t('instructions.emptyDescription')}
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <ul aria-label={t('instructions.listAria')} className="divide-y">
        {instructions.map((instruction) => {
          const isInUse = assignedInstructionIds.has(instruction.id);

          return (
            <ContextMenu key={instruction.id}>
              <ContextMenuTrigger
                ref={(node) => {
                  if (node) {
                    rowRef.current.set(instruction.id, node);
                  } else {
                    rowRef.current.delete(instruction.id);
                  }
                }}
                render={(
                  <li
                    data-instruction-id={instruction.id}
                    draggable
                    className="
                      flex cursor-grab items-center gap-2 px-3 py-2.5
                      hover:bg-muted/40
                      active:cursor-grabbing
                    "
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        INSTRUCTION_DRAG_TYPE,
                        instruction.id,
                      );
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                  />
                )}
              >
                <GripVerticalIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <button
                  type="button"
                  className="
                    flex min-w-0 flex-1 cursor-grab items-center gap-2 text-left
                    text-xs outline-none
                    focus-visible:underline focus-visible:underline-offset-3
                    active:cursor-grabbing
                  "
                  onClick={() => {
                    onEdit(instruction);
                  }}
                  onFocus={onPreload}
                  onPointerEnter={onPreload}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {instruction.name}
                  </span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => {
                    onEdit(instruction);
                  }}
                >
                  <PencilIcon />
                  <span>{t('instructions.edit')}</span>
                </ContextMenuItem>
                <ContextMenuItem
                  variant="destructive"
                  disabled={!isAssignmentStateReady || isInUse}
                  onClick={() => {
                    const anchor = rowRef.current.get(instruction.id);
                    if (anchor) {
                      setPendingDelete({ anchor, instruction });
                    }
                  }}
                >
                  <Trash2Icon />
                  <span>{t('instructions.delete')}</span>
                  {isInUse && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {t('instructions.inUse')}
                    </span>
                  )}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </ul>
      <Popover
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <PopoverContent
          anchor={pendingDelete?.anchor}
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-64 p-3"
        >
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium">
              {t('instructions.deleteConfirmTitle')}
            </div>
            <p className="text-xs/relaxed text-muted-foreground">
              {t('instructions.deleteConfirmDescription', {
                name: pendingDelete?.instruction.name ?? '',
              })}
            </p>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPendingDelete(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pendingDelete) {
                  return;
                }
                const { instruction } = pendingDelete;
                setPendingDelete(null);
                onDelete(instruction);
              }}
            >
              {t('instructions.delete')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </Card>
  );
}
