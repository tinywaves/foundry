import { BoxIcon, BracesIcon, FlaskConicalIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import JsonViewTool from './json-view';
import Mock1Tool from './mock1';
import Mock2Tool from './mock2';

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  component: ComponentType;
};

export const tools: ToolDefinition[] = [
  {
    id: 'json-view',
    name: 'JSON View',
    description: 'Format and validate JSON',
    icon: BracesIcon,
    component: JsonViewTool,
  },
  {
    id: 'mock1',
    name: 'Mock Tool 1',
    description: 'Placeholder utility',
    icon: BoxIcon,
    component: Mock1Tool,
  },
  {
    id: 'mock2',
    name: 'Mock Tool 2',
    description: 'Placeholder utility',
    icon: FlaskConicalIcon,
    component: Mock2Tool,
  },
];

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.id === id);
}
