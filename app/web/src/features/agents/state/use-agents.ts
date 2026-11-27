import type { Agent } from '@dhzh/foundry-shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  AgentApiError,
  listAgents,
  openAgentInstructionFile,
  reapplyAgent,
  updateAgentEnabled,
  updateAgentInstructions,
} from '../api';

export const agentsQueryKey = ['agents'] as const;
const agentsMutationKey = ['agents', 'update'] as const;

interface InstructionUpdate {
  agentId: string;
  instructionIds: string[];
}

interface EnabledUpdate {
  agentId: string;
  enabled: boolean;
}

export function useAgents() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: agentsQueryKey,
    queryFn: ({ signal }) => listAgents(signal),
    retry: false,
  });

  function replaceAgent(agent: Agent) {
    queryClient.setQueryData<Agent[]>(
      agentsQueryKey,
      (current) => current?.map((item) => (item.id === agent.id ? agent : item)),
    );
  }

  const instructionMutation = useMutation({
    mutationKey: agentsMutationKey,
    mutationFn: ({ agentId, instructionIds }: InstructionUpdate) =>
      updateAgentInstructions(agentId, instructionIds),
    onMutate: async ({ agentId, instructionIds }) => {
      await queryClient.cancelQueries({ queryKey: agentsQueryKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsQueryKey);
      queryClient.setQueryData<Agent[]>(
        agentsQueryKey,
        (current) => current?.map((agent) => (agent.id === agentId
          ? {
              ...agent,
              instructionIds,
              enabled: instructionIds.length > 0 && agent.enabled,
            }
          : agent)),
      );
      return { previous };
    },
    onError: (_error, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsQueryKey, context.previous);
      }
      toast.error(t('agents.updateError'));
    },
    onSuccess: replaceAgent,
    onSettled: () => queryClient.invalidateQueries({ queryKey: agentsQueryKey }),
  });

  const enabledMutation = useMutation({
    mutationKey: agentsMutationKey,
    mutationFn: ({ agentId, enabled: isEnabled }: EnabledUpdate) =>
      updateAgentEnabled(agentId, isEnabled),
    onMutate: async ({ agentId, enabled: isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: agentsQueryKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsQueryKey);
      queryClient.setQueryData<Agent[]>(
        agentsQueryKey,
        (current) => current?.map((agent) => (agent.id === agentId
          ? { ...agent, enabled: isEnabled }
          : agent)),
      );
      return { previous };
    },
    onError: (_error, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsQueryKey, context.previous);
      }
      toast.error(t('agents.enableError'));
    },
    onSuccess: (agent) => {
      replaceAgent(agent);
      toast.success(t(agent.enabled ? 'agents.applied' : 'agents.removed'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: agentsQueryKey }),
  });

  const reapplyMutation = useMutation({
    mutationKey: agentsMutationKey,
    mutationFn: (agentId: string) => reapplyAgent(agentId),
    onSuccess: (agent) => {
      replaceAgent(agent);
      toast.success(t('agents.reapplied'));
    },
    onError: () => {
      toast.error(t('agents.reapplyError'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: agentsQueryKey }),
  });

  const openMutation = useMutation({
    mutationKey: agentsMutationKey,
    mutationFn: (agentId: string) => openAgentInstructionFile(agentId),
    onError: (error) => {
      toast.error(t(
        error instanceof AgentApiError && error.code === 'AGENT_FILE_NOT_FOUND'
          ? 'agents.fileMissing'
          : 'agents.openFileError',
      ));
    },
  });

  const mutations = [
    instructionMutation,
    enabledMutation,
    reapplyMutation,
    openMutation,
  ];
  const pendingAgentIds = new Set<string>();
  for (const mutation of mutations) {
    if (!mutation.isPending) {
      continue;
    }
    const agentId = readAgentId(mutation.variables);
    if (agentId) {
      pendingAgentIds.add(agentId);
    }
  }
  const reapplyingAgentIds = new Set(
    reapplyMutation.isPending && typeof reapplyMutation.variables === 'string'
      ? [reapplyMutation.variables]
      : [],
  );

  return {
    agents: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError && query.data === undefined,
    retry: query.refetch,
    pendingAgentIds,
    reapplyingAgentIds,
    updateInstructions: (agentId: string, instructionIds: string[]) => {
      instructionMutation.mutate({ agentId, instructionIds });
    },
    setEnabled: (agentId: string, isEnabled: boolean) => {
      enabledMutation.mutate({ agentId, enabled: isEnabled });
    },
    reapply: (agentId: string) => {
      reapplyMutation.mutate(agentId);
    },
    openFile: (agentId: string) => {
      openMutation.mutate(agentId);
    },
  };
}

function readAgentId(variables: unknown): string | undefined {
  if (typeof variables === 'string') {
    return variables;
  }
  if (variables && typeof variables === 'object' && 'agentId' in variables) {
    const agentId: unknown = variables.agentId;
    return typeof agentId === 'string' ? agentId : undefined;
  }
  return undefined;
}
