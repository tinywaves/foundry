import { PlusIcon, RotateCwIcon } from 'lucide-react';
import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeaderActions } from '@/app/page-header-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentCard } from '@/features/agents/components/agent-card';
import { useAgents } from '@/features/agents/state/use-agents';

import { InstructionLibrary } from './components/instruction-library';
import { useInstructions } from './state/use-instructions';

const CreateInstructionDialog = lazy(
  () => import('./components/create-instruction-dialog'),
);

export function InstructionsPage() {
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const instructionState = useInstructions();
  const agentState = useAgents();
  const instructionsById = useMemo(
    () => new Map(
      instructionState.instructions.map((instruction) => [
        instruction.id,
        instruction,
      ]),
    ),
    [instructionState.instructions],
  );

  function addInstruction(agentId: string, instructionId: string) {
    const agent = agentState.agents.find(({ id }) => id === agentId);
    if (
      !agent
      || agentState.pendingAgentIds.has(agentId)
      || agent.instructionIds.includes(instructionId)
    ) {
      return;
    }
    agentState.updateInstructions(agentId, [
      ...agent.instructionIds,
      instructionId,
    ]);
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

  function reorderInstruction(
    agentId: string,
    instructionId: string,
    beforeInstructionId?: string,
  ) {
    const agent = agentState.agents.find(({ id }) => id === agentId);
    if (!agent || agentState.pendingAgentIds.has(agentId)) {
      return;
    }
    const next = agent.instructionIds.filter((id) => id !== instructionId);
    const targetIndex = beforeInstructionId
      ? next.indexOf(beforeInstructionId)
      : -1;
    if (targetIndex === -1) {
      next.push(instructionId);
    } else {
      next.splice(targetIndex, 0, instructionId);
    }
    if (
      next.length === agent.instructionIds.length
      && next.every((id, index) => id === agent.instructionIds[index])
    ) {
      return;
    }
    agentState.updateInstructions(agentId, next);
  }

  return (
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
            min-h-0 flex-1 overflow-y-auto pr-1
            max-md:max-h-64
          "
        >
          <InstructionLibrary
            instructions={instructionState.instructions}
            isLoading={instructionState.isLoading}
            isError={instructionState.isError}
            onRetry={() => {
              void instructionState.retry();
            }}
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
            flex min-h-0 flex-1 flex-col gap-3 pr-1
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
          {!agentState.isLoading && !agentState.isError && agentState.agents.map(
            (agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                instructionsById={instructionsById}
                isInstructionsLoading={instructionState.isLoading}
                isPending={agentState.pendingAgentIds.has(agent.id)}
                isReapplying={agentState.reapplyingAgentIds.has(agent.id)}
                onAddInstruction={addInstruction}
                onRemoveInstruction={removeInstruction}
                onReorderInstruction={reorderInstruction}
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
            ),
          )}
        </div>
      </section>

      {isCreateOpen && (
        <Suspense fallback={<CreateInstructionDialogFallback />}>
          <CreateInstructionDialog
            onClose={() => {
              setIsCreateOpen(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
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

function CreateInstructionDialogFallback() {
  const { t } = useTranslation();

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('instructions.createTitle')}</DialogTitle>
        </DialogHeader>
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-72 w-full" />
      </DialogContent>
    </Dialog>
  );
}
