import type { ElementType, ReactNode } from 'react';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty';

export function FeatureEmptyState({ centerIcon: Icon, title, description, actions }: {
  startIcon: ElementType;
  centerIcon: ElementType;
  endIcon: ElementType;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions != null && <EmptyContent>{actions}</EmptyContent>}
    </Empty>
  );
}
