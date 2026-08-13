import { McpIcon } from '@renderer/components/mcp-icon';
import { UnavailableFeaturePage } from '@renderer/pages/unavailable-feature-page';

export function McpServersPage() {
  return (
    <UnavailableFeaturePage
      title="MCP Servers"
      unavailableTitle="MCP Servers Aren't Available Yet"
      description="MCP Server discovery and configuration aren't connected in this build."
      icon={McpIcon}
    />
  );
}
