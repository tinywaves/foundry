import type { ComponentProps } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function RequiredLabel({
  children,
  className,
  ...props
}: ComponentProps<typeof Label>) {
  return (
    <Label className={cn('gap-1', className)} {...props}>
      {children}
      <span aria-hidden="true" className="text-destructive">*</span>
    </Label>
  );
}
