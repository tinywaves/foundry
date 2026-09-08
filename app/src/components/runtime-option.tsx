import type { ProviderRuntime } from '@dhzh/foundry-api-contract';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg';
import codexIcon from '@lobehub/icons-static-svg/icons/codex-color.svg';

const runtimeOptions = {
  'claude-code': {
    icon: claudeCodeIcon,
    label: 'Claude Code',
  },
  'codex': {
    icon: codexIcon,
    label: 'Codex',
  },
} satisfies Record<ProviderRuntime, { icon: string; label: string }>;

export function RuntimeOption({ runtime }: { runtime: ProviderRuntime }) {
  const option = runtimeOptions[runtime];

  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        data-icon="inline-start"
        data-runtime-icon={runtime}
        height="16"
        src={option.icon}
        width="16"
      />
      {option.label}
    </>
  );
}
