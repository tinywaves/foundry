import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SettingsItemProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  controlClassName?: string;
}

export function SettingsItem({
  label,
  description,
  children,
  className,
  controlClassName,
}: SettingsItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 p-4 min-[680px]:min-h-16 min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:gap-8',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn('min-w-0 max-[680px]:w-full min-[680px]:shrink-0', controlClassName)}>
        {children}
      </div>
    </div>
  );
}
