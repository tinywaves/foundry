import type { Instruction } from '@dhzh/foundry-shared';
import { FileTextIcon, GripVerticalIcon, RotateCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { INSTRUCTION_DRAG_TYPE } from '@/features/agents/drag';

interface InstructionLibraryProps {
  instructions: Instruction[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function InstructionLibrary({
  instructions,
  isLoading,
  isError,
  onRetry,
}: InstructionLibraryProps) {
  const { t } = useTranslation();

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
      <Card className="items-center gap-2 px-4 py-10 text-center">
        <div
          className="
            flex size-8 items-center justify-center rounded-md bg-muted
            text-muted-foreground
          "
        >
          <FileTextIcon className="size-4" />
        </div>
        <div className="text-sm font-medium">{t('instructions.emptyTitle')}</div>
        <p className="max-w-64 text-xs/relaxed text-muted-foreground">
          {t('instructions.emptyDescription')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <ul aria-label={t('instructions.listAria')} className="divide-y">
        {instructions.map((instruction) => (
          <li
            key={instruction.id}
            data-instruction-id={instruction.id}
            draggable
            className="
              group flex cursor-grab items-center gap-2 px-3 py-2.5
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
          >
            <GripVerticalIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate text-xs">
              {instruction.name}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
