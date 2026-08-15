import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';
import { agentExtensionIcons } from '@renderer/navigation-icons';

export function McpServersPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="MCP Servers" />
      <StackItem size="fill">
        <PageEmptyState
          icon={agentExtensionIcons.mcpServers}
          text="MCP Servers Aren't Available Yet"
        />
      </StackItem>
    </VStack>
  );
}
