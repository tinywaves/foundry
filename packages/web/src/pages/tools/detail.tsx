import { useParams } from 'react-router';
import { getToolById } from '@/tools/registry';

export function ToolDetailPage() {
  const { toolId } = useParams();
  const tool = toolId ? getToolById(toolId) : undefined;

  if (!tool) {
    return (
      <div>
        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <h1 className="text-xl font-semibold">Tool not found</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            The requested tool does not exist.
          </p>
        </div>
      </div>
    );
  }

  const ToolComponent = tool.component;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ToolComponent />
    </div>
  );
}
