import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible';

export function CollapsibleSection({
  children,
  label,
  summary,
}: {
  children: ReactNode;
  label: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-fit items-center gap-1 rounded-sm py-1 text-xs/relaxed font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50">
        <HugeiconsIcon
          className="size-3 transition-transform group-data-panel-open:rotate-90 motion-reduce:transition-none"
          data-slot="collapsible-section-icon"
          icon={ArrowRight01Icon}
          strokeWidth={2}
        />
        <span>{label}</span>
        {summary !== undefined && (
          <span className="tabular-nums text-muted-foreground/80">{summary}</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent
        className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-150 motion-reduce:transition-none data-ending-style:h-0 data-starting-style:h-0"
        data-slot="collapsible-section-content"
      >
        <div
          className="ms-3 min-w-0 border-s border-border py-2 ps-4"
          data-slot="collapsible-section-body"
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
