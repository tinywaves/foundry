import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';
import { SkillActionBar } from './skills/skill-action-bar';

const skillViews = [
  { value: 'store', label: 'Store', path: routePaths.agentExtensionsSkills },
  { value: 'discover', label: 'Discover', path: routePaths.agentExtensionsSkillsDiscover },
  { value: 'targets', label: 'Targets', path: routePaths.agentExtensionsSkillTargets },
  { value: 'trash', label: 'Trash', path: routePaths.agentExtensionsSkillsTrash },
] as const;

export function SkillsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeView = getActiveSkillView(pathname);

  const handleViewChange = (value: string) => {
    const view = skillViews.find((item) => item.value === value);
    if (view) {
      void navigate(view.path);
    }
  };

  return (
    <VStack width="100%" height="100%">
      <PageHeader text="Skills" />
      <SkillActionBar
        label="Skills View"
        startContent={(
          <TabList
            value={activeView}
            size="sm"
            onChange={handleViewChange}
            aria-label="Skills View"
          >
            {skillViews.map((view) => (
              <Tab key={view.value} value={view.value} label={view.label} />
            ))}
          </TabList>
        )}
      />
      <StackItem size="fill">
        <Outlet />
      </StackItem>
    </VStack>
  );
}

function getActiveSkillView(pathname: string): typeof skillViews[number]['value'] {
  if (pathname.startsWith(routePaths.agentExtensionsSkillsDiscover)) {
    return 'discover';
  }
  if (pathname.startsWith(routePaths.agentExtensionsSkillTargets)) {
    return 'targets';
  }
  if (pathname.startsWith(routePaths.agentExtensionsSkillsTrash)) {
    return 'trash';
  }
  return 'store';
}
