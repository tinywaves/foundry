import type { Agent } from '@dhzh/foundry-shared';

const agentsPath = '/api/agents';

export class AgentApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AgentApiError';
  }
}

export function listAgents(signal?: AbortSignal): Promise<Agent[]> {
  return requestJson<Agent[]>(agentsPath, { signal });
}

export function updateAgentInstructions(
  agentId: string,
  instructionIds: string[],
): Promise<Agent> {
  return requestJson<Agent>(agentPath(agentId, 'instructions'), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ instructionIds }),
  });
}

export function updateAgentEnabled(
  agentId: string,
  isEnabled: boolean,
): Promise<Agent> {
  return requestJson<Agent>(agentPath(agentId, 'enabled'), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: isEnabled }),
  });
}

export function reapplyAgent(agentId: string): Promise<Agent> {
  return requestJson<Agent>(agentPath(agentId, 'reapply'), {
    method: 'POST',
  });
}

export function openAgentInstructionFile(
  agentId: string,
): Promise<{ path: string }> {
  return requestJson<{ path: string }>(agentPath(agentId, 'open-file'), {
    method: 'POST',
  });
}

function agentPath(agentId: string, action: string): string {
  return `${agentsPath}/${encodeURIComponent(agentId)}/${action}`;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const error = await readError(response);
    throw new AgentApiError(error.code, error.message);
  }
  return response.json() as Promise<T>;
}

async function readError(
  response: Response,
): Promise<{ code: string; message: string }> {
  try {
    const payload = await response.json() as {
      error?: { code?: string; message?: string };
    };
    return {
      code: payload.error?.code ?? 'AGENT_REQUEST_FAILED',
      message: payload.error?.message
        ?? `Request failed with status ${response.status}`,
    };
  } catch {
    return {
      code: 'AGENT_REQUEST_FAILED',
      message: `Request failed with status ${response.status}`,
    };
  }
}
