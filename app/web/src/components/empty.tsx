import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyProps {
  className?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
}

export function Empty({
  className,
  description,
  icon: Icon,
  title,
}: EmptyProps) {
  let descriptionElement: ReactNode = null;
  if (description != null) {
    descriptionElement = (
      <p className="max-w-64 text-xs/relaxed text-muted-foreground">
        {description}
      </p>
    );
  }

  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-col items-center gap-2 px-4 py-10 text-center',
        className,
      )}
    >
      {Icon && (
        <div
          className="
            flex size-8 items-center justify-center rounded-md bg-muted
            text-muted-foreground
          "
        >
          <Icon aria-hidden="true" className="size-4" />
        </div>
      )}
      <div className="text-sm font-medium">{title}</div>
      {descriptionElement}
    </div>
  );
}
