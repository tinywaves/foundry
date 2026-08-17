import { FullWindowHeader } from '@renderer/components/full-window-header';
import type { FullWindowHeaderProps } from '@renderer/components/full-window-header';

interface PromptWindowHeaderProps extends Omit<FullWindowHeaderProps, 'backLabel'> {
  backLabel?: string;
}

export function PromptWindowHeader({
  backLabel = 'Back to Prompts',
  ...props
}: PromptWindowHeaderProps) {
  return (
    <FullWindowHeader
      {...props}
      backLabel={backLabel}
    />
  );
}
