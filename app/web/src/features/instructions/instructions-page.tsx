import type { Instruction } from '@dhzh/foundry-shared';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Active,
  CollisionDetection,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  GripVerticalIcon,
  PlusIcon,
  RotateCwIcon,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PageHeaderActions } from '@/app/page-header-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentCard } from '@/features/agents/components/agent-card';
import {
  agentDropId,
  isAgentDropData,
  isAssignedInstructionDragData,
  isAssignedInstructionDragId,
  isLibraryInstructionDragData,
} from '@/features/agents/drag';
import { useAgents } from '@/features/agents/state/use-agents';

import {
  deleteInstruction,
  InstructionApiError,
} from './api';
import { InstructionLibrary } from './components/instruction-library';
import InstructionEditorDialog from './components/instruction-editor-dialog';
import { preloadMarkdownEditor } from './components/markdown-editor-loader';
import {
  instructionsQueryKey,
  useInstructions,
} from './state/use-instructions';

const instructionCollisionDetection: CollisionDetection = (args) => {
  const activeData = args.active.data.current;
  if (isAssignedInstructionDragData(activeData)) {
    return closestAssignedInstruction(args, activeData.agentId);
  }
  const collisions = args.pointerCoordinates
    ? pointerWithin(args)
    : closestCenter(args);
  const assignedInstructionCollisions = collisions.filter(({ id }) =>
    isAssignedInstructionDragId(id));
  return assignedInstructionCollisions.length > 0
    ? assignedInstructionCollisions
    : collisions;
};

function closestAssignedInstruction(
  args: Parameters<CollisionDetection>[0],
  agentId: string,
) {
  const centerX = args.collisionRect.left + args.collisionRect.width / 2;
  const centerY = args.collisionRect.top + args.collisionRect.height / 2;
  const agentRect = args.droppableRects.get(agentDropId(agentId));
  if (
    agentRect
    && (centerX < agentRect.left
      || centerX > agentRect.left + agentRect.width
      || centerY < agentRect.top
      || centerY > agentRect.top + agentRect.height)
  ) {
    return [];
  }
  let closest: { id: string | number; distance: number } | undefined;

  for (const container of args.droppableContainers) {
    const data = container.data.current;
    if (
      !isAssignedInstructionDragData(data)
      || data.agentId !== agentId
    ) {
      continue;
    }
    const rect = args.droppableRects.get(container.id);
    if (!rect) {
      continue;
    }
    const distance = (rect.left + rect.width / 2 - centerX) ** 2
      + (rect.top + rect.height / 2 - centerY) ** 2;
    if (!closest || distance < closest.distance) {
      closest = { id: container.id, distance };
    }
  }

  return closest ? [{ id: closest.id }] : [];
}

export function InstructionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeDrag, setActiveDrag] = useState<Active | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInstructionId, setSelectedInstructionId] = useState<
    string | null
  >(null);
  const instructionState = useInstructions();
  const agentState = useAgents();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const assignedInstructionIds = useMemo(
    () => new Set(
      agentState.agents.flatMap(({ instructionIds }) => instructionIds),
    ),
    [agentState.agents],
  );
  const instructionsById = useMemo(
    () => new Map(
      instructionState.instructions.map((instruction) => [
        instruction.id,
        instruction,
      ]),
    ),
    [instructionState.instructions],
  );
  const selectedInstruction = selectedInstructionId
    ? instructionState.instructions.find(
        ({ id }) => id === selectedInstructionId,
      )
    : undefined;
  const activeDragData = activeDrag?.data.current;
  const activeInstructionId = readActiveInstructionId(activeDragData);
  const activeInstructionName = activeInstructionId
    ? instructionsById.get(activeInstructionId)?.name ?? activeInstructionId
    : '';
  const activeDragWidth = activeDrag?.rect.current.initial?.width;
  const instructionRemovalMutation = useMutation({
    mutationFn: (instruction: Instruction) => deleteInstruction(instruction.id),
    onSuccess: (_result, instruction) => {
      queryClient.setQueryData<Instruction[]>(
        instructionsQueryKey,
        (current) => current?.filter(({ id }) => id !== instruction.id),
      );
      void queryClient.invalidateQueries({ queryKey: instructionsQueryKey });
      toast.success(t('instructions.deleted'));
    },
    onError: (error) => {
      toast.error(t(
        error instanceof InstructionApiError
        && error.code === 'INSTRUCTION_IN_USE'
          ? 'instructions.deleteInUse'
          : 'instructions.deleteError',
      ));
    },
  });

  function addInstruction(
    agentId: string,
    instructionId: string,
    beforeInstructionId?: string,
  ) {
    const agent = agentState.agents.find(({ id }) => id === agentId);
    if (!agent || agentState.pendingAgentIds.has(agentId)) {
      return;
    }
    if (agent.instructionIds.includes(instructionId)) {
      toast.error(t('agents.duplicateError'));
      return;
    }

    const next = [...agent.instructionIds];
    const targetIndex = beforeInstructionId
      ? next.indexOf(beforeInstructionId)
      : -1;
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, instructionId);
    agentState.updateInstructions(agentId, next);
  }

  function removeInstruction(agentId: string, instructionId: string) {
    const agent = agentState.agents.find(({ id }) => id === agentId);
    if (!agent || agentState.pendingAgentIds.has(agentId)) {
      return;
    }
    agentState.updateInstructions(
      agentId,
      agent.instructionIds.filter((id) => id !== instructionId),
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null);
    if (!over) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (isLibraryInstructionDragData(activeData)) {
      if (isAgentDropData(overData)) {
        addInstruction(overData.agentId, activeData.instructionId);
        return;
      }
      if (isAssignedInstructionDragData(overData)) {
        addInstruction(
          overData.agentId,
          activeData.instructionId,
          overData.instructionId,
        );
      }
      return;
    }

    if (!isAssignedInstructionDragData(activeData)) {
      return;
    }
    const agent = agentState.agents.find(
      ({ id }) => id === activeData.agentId,
    );
    if (!agent || agentState.pendingAgentIds.has(agent.id)) {
      return;
    }
    const instructionIds = agent.instructionIds;
    const fromIndex = instructionIds.indexOf(activeData.instructionId);
    const toIndex = isAssignedInstructionDragData(overData)
      && overData.agentId === activeData.agentId
      ? instructionIds.indexOf(overData.instructionId)
      : (isAgentDropData(overData) && overData.agentId === activeData.agentId
          ? instructionIds.length - 1
          : -1);
    if (
      fromIndex === toIndex
      || fromIndex === -1
      || toIndex === -1
    ) {
      return;
    }
    const next = arrayMove([...instructionIds], fromIndex, toIndex);
    if (
      next.length === instructionIds.length
      && next.every((id, index) => id === instructionIds[index])
    ) {
      return;
    }
    agentState.updateInstructions(agent.id, next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={instructionCollisionDetection}
      onDragStart={({ active }) => {
        setActiveDrag(active);
      }}
      onDragCancel={() => {
        setActiveDrag(null);
      }}
      onDragEnd={handleDragEnd}
    >
      <div
        className="
          grid min-h-0 flex-1 gap-4 overflow-hidden p-4
          max-md:overflow-y-auto
          md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]
        "
      >
        <PageHeaderActions>
          <Button
            type="button"
            onFocus={preloadMarkdownEditor}
            onPointerEnter={preloadMarkdownEditor}
            onClick={() => {
              setIsCreateOpen(true);
            }}
          >
            <PlusIcon />
            <span>{t('instructions.create')}</span>
          </Button>
        </PageHeaderActions>

        <section className="flex min-h-0 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-xs font-medium text-muted-foreground">
              {t('nav.instructions')}
            </h2>
            <span className="truncate text-[11px] text-muted-foreground">
              {t('instructions.dragHint')}
            </span>
          </div>
          <div
            className="
              min-h-0 flex-1 overflow-y-auto p-1
              max-md:max-h-64
            "
          >
            <InstructionLibrary
              assignedInstructionIds={assignedInstructionIds}
              instructions={instructionState.instructions}
              isAssignmentStateReady={
                !agentState.isLoading && !agentState.isError
              }
              isLoading={instructionState.isLoading}
              isError={instructionState.isError}
              onRetry={() => {
                void instructionState.retry();
              }}
              onEdit={(instruction) => {
                setSelectedInstructionId(instruction.id);
              }}
              onDelete={(instruction) => {
                instructionRemovalMutation.mutate(instruction);
              }}
              onPreload={preloadMarkdownEditor}
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-xs font-medium text-muted-foreground">
              {t('agents.title')}
            </h2>
            <span className="truncate text-[11px] text-muted-foreground">
              {t('agents.orderHint')}
            </span>
          </div>
          <div
            className="
              flex min-h-0 flex-1 flex-col gap-3 p-1
              max-md:pb-2
              md:overflow-y-auto
            "
          >
            {agentState.isLoading && <AgentsSkeleton />}
            {!agentState.isLoading && agentState.isError && (
              <Card className="items-start gap-3 p-4">
                <p className="text-xs text-muted-foreground">
                  {t('agents.loadError')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void agentState.retry();
                  }}
                >
                  <RotateCwIcon />
                  <span>{t('common.retry')}</span>
                </Button>
              </Card>
            )}
            {!agentState.isLoading
              && !agentState.isError
              && agentState.agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  instructionsById={instructionsById}
                  isInstructionsLoading={instructionState.isLoading}
                  isPending={agentState.pendingAgentIds.has(agent.id)}
                  isReapplying={agentState.reapplyingAgentIds.has(agent.id)}
                  onRemoveInstruction={removeInstruction}
                  onToggle={(agentId, enabled) => {
                    agentState.setEnabled(agentId, enabled);
                  }}
                  onReapply={(agentId) => {
                    agentState.reapply(agentId);
                  }}
                  onOpenFile={(agentId) => {
                    agentState.openFile(agentId);
                  }}
                />
              ))}
          </div>
        </section>

        {isCreateOpen && (
          <InstructionEditorDialog
            onClose={() => {
              setIsCreateOpen(false);
            }}
          />
        )}
        {selectedInstruction && (
          <InstructionEditorDialog
            instruction={selectedInstruction}
            onClose={() => {
              setSelectedInstructionId(null);
            }}
          />
        )}
      </div>
      {isLibraryInstructionDragData(activeDragData) && (
        <DragOverlay dropAnimation={null}>
          {activeInstructionName && (
            <div
              style={{ width: activeDragWidth }}
              className="flex items-center gap-2 bg-card px-3 py-2.5 text-xs"
            >
              <GripVerticalIcon className="size-3.5 text-muted-foreground" />
              <span className="truncate">{activeInstructionName}</span>
            </div>
          )}
        </DragOverlay>
      )}
    </DndContext>
  );
}

function readActiveInstructionId(value: unknown): string | undefined {
  if (isLibraryInstructionDragData(value)) {
    return value.instructionId;
  }
  if (isAssignedInstructionDragData(value)) {
    return value.instructionId;
  }
  return undefined;
}

function AgentsSkeleton() {
  return (
    <>
      {[0, 1].map((index) => (
        <Card key={index} className="gap-0 py-0">
          <div className="flex items-center gap-3 p-3">
            <Skeleton className="size-8 rounded-md" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-7 rounded-full" />
          </div>
          <div className="border-t border-border/60 p-3">
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      ))}
    </>
  );
}
