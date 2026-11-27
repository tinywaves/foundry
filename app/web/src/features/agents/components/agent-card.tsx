import type { Agent, Instruction } from '@dhzh/foundry-shared';
import {
  GripVerticalIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
  ASSIGNED_INSTRUCTION_DRAG_TYPE,
  hasDragType,
  INSTRUCTION_DRAG_TYPE,
  readAssignedInstructionDrag,
} from '../drag';

import { AgentIcon } from './agent-icon';

interface AgentCardProps {
  agent: Agent;
  instructionsById: Map<string, Instruction>;
  isInstructionsLoading: boolean;
  isPending: boolean;
  isReapplying: boolean;
  onAddInstruction: (agentId: string, instructionId: string) => void;
  onRemoveInstruction: (agentId: string, instructionId: string) => void;
  onReorderInstruction: (
    agentId: string,
    instructionId: string,
    beforeInstructionId?: string,
  ) => void;
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
  onAddInstruction,
  onRemoveInstruction,
  onReorderInstruction,
  onToggle,
  onReapply,
  onOpenFile,
}: AgentCardProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const canEnable = agent.enabled || agent.instructionIds.length > 0;
  const reapplyHint = agent.enabled
    ? t('agents.reapplyHint')
    : t('agents.reapplyDisabledHint');
  const toggleHint = canEnable
    ? t(agent.enabled ? 'agents.toggleOnHint' : 'agents.toggleOffHint')
    : t('agents.enableRequiresInstruction');

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (
      !hasDragType(event.dataTransfer, INSTRUCTION_DRAG_TYPE)
      && !hasDragType(event.dataTransfer, ASSIGNED_INSTRUCTION_DRAG_TYPE)
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = hasDragType(
      event.dataTransfer,
      INSTRUCTION_DRAG_TYPE,
    )
      ? 'copy'
      : 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }

    setIsDragOver(false);
    setDropTargetId(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    setDropTargetId(null);

    const instructionId = event.dataTransfer.getData(INSTRUCTION_DRAG_TYPE);
    if (instructionId) {
      if (agent.instructionIds.includes(instructionId)) {
        toast.error(t('agents.duplicateError'));
        return;
      }
      onAddInstruction(agent.id, instructionId);
      return;
    }

    const assigned = readAssignedInstructionDrag(event.dataTransfer);
    if (assigned?.agentId !== agent.id) {
      return;
    }
    const lastInstructionId = agent.instructionIds.at(-1);
    if (assigned.instructionId !== lastInstructionId) {
      onReorderInstruction(agent.id, assigned.instructionId);
    }
  }

  return (
    <Card
      data-agent-id={agent.id}
      className={cn(
        'gap-0 py-0 transition-shadow',
        isDragOver && 'ring-2 ring-ring/40',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
              <ol className="flex flex-col gap-1">
                {agent.instructionIds.map((instructionId, index) => {
                  const instruction = instructionsById.get(instructionId);
                  const instructionName = instruction?.name ?? instructionId;
                  const isDropTarget = dropTargetId === instructionId;

                  return (
                    <li
                      key={instructionId}
                      data-instruction-id={instructionId}
                      draggable={!isPending}
                      className={cn(
                        `
                          group flex items-center gap-2 rounded-md border
                          border-transparent bg-muted/40 px-2 py-1.5
                        `,
                        isDropTarget && 'border-ring bg-muted',
                      )}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          ASSIGNED_INSTRUCTION_DRAG_TYPE,
                          JSON.stringify({
                            agentId: agent.id,
                            instructionId,
                          }),
                        );
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(event) => {
                        if (
                          !hasDragType(
                            event.dataTransfer,
                            ASSIGNED_INSTRUCTION_DRAG_TYPE,
                          )
                        ) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        setDropTargetId(instructionId);
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.relatedTarget
                          || !event.currentTarget.contains(
                            event.relatedTarget as Node,
                          )
                        ) {
                          setDropTargetId(null);
                        }
                      }}
                      onDrop={(event) => {
                        const assigned = readAssignedInstructionDrag(
                          event.dataTransfer,
                        );
                        if (assigned?.agentId !== agent.id) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        setDropTargetId(null);
                        setIsDragOver(false);
                        if (assigned.instructionId === instructionId) {
                          return;
                        }
                        onReorderInstruction(
                          agent.id,
                          assigned.instructionId,
                          instructionId,
                        );
                      }}
                    >
                      <GripVerticalIcon
                        aria-hidden="true"
                        className="
                          size-3.5 shrink-0 cursor-grab text-muted-foreground
                          group-active:cursor-grabbing
                        "
                      />
                      <span
                        className="
                          w-4 shrink-0 text-center font-mono text-[10px]
                          text-muted-foreground
                        "
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs">
                        {isInstructionsLoading && !instruction
                          ? t('agents.loadingInstruction')
                          : instructionName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        draggable={false}
                        aria-label={t('agents.removeInstructionAria', {
                          name: instructionName,
                        })}
                        disabled={isPending}
                        onClick={() => {
                          onRemoveInstruction(agent.id, instructionId);
                        }}
                      >
                        <XIcon />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            )}
      </div>
    </Card>
  );
}
