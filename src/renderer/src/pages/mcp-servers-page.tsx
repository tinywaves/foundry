import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { McpIcon } from '@renderer/components/mcp-icon';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';

export function McpServersPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="MCP Servers" />
      <StackItem size="fill">
        <PageEmptyState icon={McpIcon} text="MCP Servers Aren't Available Yet" />
      </StackItem>
    </VStack>
  );
}
