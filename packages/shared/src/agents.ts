export interface Agent {
  id: string;
  name: string;
  icon: string;
  instructionFile: string;
  enabled: boolean;
  instructionIds: string[];
}

export interface AgentInstructionsRecord {
  instructionIds: string[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AgentRecord {
  id: string;
  instructions: AgentInstructionsRecord;
}

export interface UpdateAgentInstructionsInput {
  instructionIds: string[];
}

export interface UpdateAgentEnabledInput {
  enabled: boolean;
}
