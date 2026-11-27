export interface Agent {
  id: string;
  name: string;
  icon: string;
  instructionFile: string;
  enabled: boolean;
  instructionIds: string[];
}

export interface UpdateAgentInstructionsInput {
  instructionIds: string[];
}

export interface UpdateAgentEnabledInput {
  enabled: boolean;
}
