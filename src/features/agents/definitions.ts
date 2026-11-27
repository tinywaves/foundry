import path from 'node:path';

export const SUPPORTED_AGENT_IDS = ['chatgpt', 'claude-code'] as const;

export interface AgentDefinition {
  id: string;
  name: string;
  icon: string;
  instructionFile: string;
  filePath: string;
}

export function getAgentDefinitions(homeDirectory: string): AgentDefinition[] {
  return [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      icon: 'openai',
      instructionFile: '~/.codex/AGENTS.md',
      filePath: path.join(homeDirectory, '.codex', 'AGENTS.md'),
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      icon: 'claudecode',
      instructionFile: '~/.claude/CLAUDE.md',
      filePath: path.join(homeDirectory, '.claude', 'CLAUDE.md'),
    },
  ];
}
