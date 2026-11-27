import type { Agent, Instruction } from '@dhzh/foundry-shared';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVerticalIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  agentDropId,
  assignedInstructionDragId,
} from '../drag';

import { AgentIcon } from './agent-icon';

interface AgentCardProps {
  agent: Agent;
  instructionsById: Map<string, Instruction>;
  isInstructionsLoading: boolean;
  isPending: boolean;
  isReapplying: boolean;
  onRemoveInstruction: (agentId: string, instructionId: string) => void;
  onToggle: (agentId: string, isEnabled: boolean) => void;
  onReapply: (agentId: string) => void;
  onOpenFile: (agentId: string) => void;
}

export function AgentCard({
  agent,
  instructionsById,
  isInstructionsLoading,
  isPending,
  isReapplying,
  onRemoveInstruction,
  onToggle,
  onReapply,
  onOpenFile,
}: AgentCardProps) {
  const { t } = useTranslation();
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: agentDropId(agent.id),
    data: {
      type: 'agent',
      agentId: agent.id,
    },
    disabled: isPending,
  });
  const canEnable = agent.enabled || agent.instructionIds.length > 0;
  const reapplyHint = agent.enabled
    ? t('agents.reapplyHint')
    : t('agents.reapplyDisabledHint');
  const toggleHint = canEnable
    ? t(agent.enabled ? 'agents.toggleOnHint' : 'agents.toggleOffHint')
    : t('agents.enableRequiresInstruction');

  return (
    <Card
      data-agent-id={agent.id}
      ref={setNodeRef}
      className={cn(
        'gap-0 py-0 transition-shadow',
        isOver && 'ring-2 ring-ring/40',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <AgentIcon icon={agent.icon} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{agent.name}</div>
          <button
            type="button"
            className="
              block max-w-full truncate font-mono text-[11px]
              text-muted-foreground
              hover:text-foreground hover:underline
            "
            aria-label={t('agents.openFileAria', { name: agent.name })}
            onClick={() => {
              onOpenFile(agent.id);
            }}
          >
            {agent.instructionFile}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('agents.reapplyAria', { name: agent.name })}
                disabled={isPending || !agent.enabled}
                onClick={() => {
                  onReapply(agent.id);
                }}
              >
                <RefreshCwIcon className={cn(isReapplying && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{reapplyHint}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Switch
                checked={agent.enabled}
                disabled={isPending || !canEnable}
                aria-label={t('agents.toggleAria', { name: agent.name })}
                onCheckedChange={(checked) => {
                  onToggle(agent.id, checked);
                }}
              />
            </TooltipTrigger>
            <TooltipContent>{toggleHint}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="border-t border-border/60 p-3">
        {agent.instructionIds.length === 0
          ? (
              <div
                className="
                  flex min-h-20 items-center justify-center rounded-md border
                  border-dashed border-border px-4 text-center text-xs
                  text-muted-foreground
                "
              >
                {t('agents.emptyAssigned')}
              </div>
            )
          : (
              <SortableContext
                items={agent.instructionIds.map((instructionId) =>
                  assignedInstructionDragId(agent.id, instructionId))}
                strategy={verticalListSortingStrategy}
              >
                <ol className="flex flex-col gap-1">
                  {agent.instructionIds.map((instructionId, index) => {
                    const instruction = instructionsById.get(instructionId);
                    const instructionName = instruction?.name ?? instructionId;

                    return (
                      <SortableAssignedInstructionRow
                        key={instructionId}
                        agentId={agent.id}
                        index={index}
                        instructionId={instructionId}
                        instructionName={
                          isInstructionsLoading && !instruction
                            ? t('agents.loadingInstruction')
                            : instructionName
                        }
                        isPending={isPending}
                        onRemove={onRemoveInstruction}
                      />
                    );
                  })}
                </ol>
              </SortableContext>
            )}
      </div>
    </Card>
  );
}

interface SortableAssignedInstructionRowProps {
  agentId: string;
  index: number;
  instructionId: string;
  instructionName: string;
  isPending: boolean;
  onRemove: (agentId: string, instructionId: string) => void;
}

function SortableAssignedInstructionRow({
  agentId,
  index,
  instructionId,
  instructionName,
  isPending,
  onRemove,
}: SortableAssignedInstructionRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    isDragging,
    isOver,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: assignedInstructionDragId(agentId, instructionId),
    animateLayoutChanges: () => false,
    data: {
      type: 'assigned-instruction',
      agentId,
      instructionId,
    },
    disabled: isPending,
  });

  return (
    <li
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      data-instruction-id={instructionId}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        `
          group flex items-center gap-2 rounded-md border border-transparent
          bg-muted/40 px-2 py-1.5
        `,
        isOver && 'border-ring bg-muted',
        isDragging && 'z-10',
        isPending
          ? 'cursor-default'
          : `
            cursor-grab
            active:cursor-grabbing
          `,
      )}
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="
          size-3.5 shrink-0 text-muted-foreground
          group-active:cursor-grabbing
        "
      />
      <span
        className="
          w-4 shrink-0 text-center font-mono text-[10px] text-muted-foreground
        "
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">
        {instructionName}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('agents.removeInstructionAria', {
          name: instructionName,
        })}
        disabled={isPending}
        onClick={() => {
          onRemove(agentId, instructionId);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <XIcon />
      </Button>
    </li>
  );
}
