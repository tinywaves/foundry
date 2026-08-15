import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Toolbar } from '@astryxdesign/core/Toolbar';
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
  headerAction?: ReactNode;
  selectedTab: PromptLibraryTab;
}

export function PromptLibraryHeader({
  headerAction,
  selectedTab,
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
      <PageHeader text="Prompts" action={headerAction} />
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
      />
    </>
  );
}
