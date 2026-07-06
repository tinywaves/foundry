import { BoxIcon, BracesIcon, FlaskConicalIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
};

export const tools: ToolDefinition[] = [
  {
    id: 'json-view',
    name: 'JSON View',
    description: 'Format and validate JSON',
    icon: BracesIcon,
    component: lazy(() => import('./json-view')),
  },
  {
    id: 'mock1',
    name: 'Mock Tool 1',
    description: 'Placeholder utility',
    icon: BoxIcon,
    component: lazy(() => import('./mock1')),
  },
  {
    id: 'mock2',
    name: 'Mock Tool 2',
    description: 'Placeholder utility',
    icon: FlaskConicalIcon,
    component: lazy(() => import('./mock2')),
  },
];

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.id === id);
}
