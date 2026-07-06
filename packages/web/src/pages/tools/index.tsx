import { Link } from 'react-router';
import { tools } from '@/tools/registry';
import { cn } from '@/lib/utils';

export function ToolsIndexPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm">
          Small utilities for everyday dev tasks.
        </p>
      </div>
      <div
        className="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={`/tools/${tool.id}`}
            className={cn(
              `
                bg-card text-card-foreground flex flex-col gap-3 rounded-xl
                border p-4 transition-colors
              `,
              `hover:border-primary/30 hover:shadow-sm`,
            )}
          >
            <tool.icon className="text-muted-foreground size-8" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">{tool.name}</span>
              <span className="text-muted-foreground text-sm">{tool.description}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
