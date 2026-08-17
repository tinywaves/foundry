import {
  Bot,
  FileText,
  MessagesSquare,
  Plug,
  Wrench,
} from 'lucide-react';
import { McpIcon } from '@renderer/components/mcp-icon';

export {
  LayoutDashboard as dashboardIcon,
  Settings as settingsIcon,
} from 'lucide-react';

export const agentRuntimeIcons = {
  providers: Plug,
  runtimes: Bot,
};

export const agentExtensionIcons = {
  skills: Wrench,
  mcpServers: McpIcon,
  prompts: FileText,
};

export const agentObservabilityIcons = {
  sessions: MessagesSquare,
};
