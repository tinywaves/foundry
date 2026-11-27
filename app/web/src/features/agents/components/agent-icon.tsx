import openaiIcon from '@lobehub/icons-static-svg/icons/openai.svg?url';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg?url';
import { BotIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const agentIcons = new Map<string, { src: string; className?: string }>([
  ['openai', { src: openaiIcon, className: 'dark:invert' }],
  ['claudecode', { src: claudeCodeIcon }],
]);

export function AgentIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const iconConfig = agentIcons.get(icon);

  return (
    <div
      aria-hidden="true"
      className={cn(
        `
          flex size-8 shrink-0 items-center justify-center rounded-md bg-muted
          text-foreground
        `,
        className,
      )}
    >
      {iconConfig
        ? (
            <img
              src={iconConfig.src}
              alt=""
              draggable={false}
              className={cn('size-4', iconConfig.className)}
            />
          )
        : <BotIcon className="size-4" />}
    </div>
  );
}
