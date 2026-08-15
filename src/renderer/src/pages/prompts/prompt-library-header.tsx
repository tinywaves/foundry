import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';

const promptLibraryPaths = {
  all: routePaths.agentExtensionsPrompts,
  trash: routePaths.agentExtensionsPromptsTrash,
} as const;

type PromptLibraryTab = keyof typeof promptLibraryPaths;

interface PromptLibraryHeaderProps {
  selectedTab: PromptLibraryTab;
  toolbarAction?: ReactNode;
}

export function PromptLibraryHeader({
  selectedTab,
  toolbarAction,
}: PromptLibraryHeaderProps) {
  const navigate = useNavigate();

  const handleTabChange = (value: string) => {
    if (value !== 'all' && value !== 'trash') {
      return;
    }
    void navigate(promptLibraryPaths[value]);
  };

  return (
    <>
      <PageHeader
        text="Prompts"
        action={(
          <Button
            label="New Prompt"
            variant="primary"
            size="sm"
            icon={<Icon icon={Plus} size="sm" color="inherit" />}
            onClick={() => void navigate(routePaths.agentExtensionsPromptsNew)}
          />
        )}
      />
      <Toolbar
        label="Prompt Library"
        size="sm"
        startContent={(
          <TabList
            value={selectedTab}
            size="sm"
            onChange={handleTabChange}
            aria-label="Prompt Views"
          >
            <Tab value="all" label="All" />
            <Tab value="trash" label="Trash" />
          </TabList>
        )}
        endContent={toolbarAction}
      />
    </>
  );
}
