import { ArrowLeftIcon } from 'lucide-react';
import { Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { getToolById } from '@/tools/registry';

function ToolLoadingFallback() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ToolDetailPage() {
  const { toolId } = useParams();
  const tool = toolId ? getToolById(toolId) : undefined;

  if (!tool) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Link
          to="/tools"
          className="
            text-muted-foreground
            hover:text-foreground
            inline-flex w-fit items-center gap-1.5 text-sm transition-colors
          "
        >
          <ArrowLeftIcon className="size-4" />
          Back to Tools
        </Link>
        <div className="bg-card text-card-foreground rounded-xl border p-6">
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
    <div className="flex flex-col gap-4 p-6">
      <Link
        to="/tools"
        className="
          text-muted-foreground
          hover:text-foreground
          inline-flex w-fit items-center gap-1.5 text-sm transition-colors
        "
      >
        <ArrowLeftIcon className="size-4" />
        Back to Tools
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tool.name}</h1>
        <p className="text-muted-foreground text-sm">{tool.description}</p>
      </div>
      <div
        className="bg-card text-card-foreground min-h-80 rounded-xl border p-4"
      >
        <Suspense fallback={<ToolLoadingFallback />}>
          <ToolComponent />
        </Suspense>
      </div>
    </div>
  );
}
