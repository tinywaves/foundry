import type { ProviderRuntime } from '@dhzh/foundry-api-contract';
import { providerRuntimeLabels } from '@dhzh/foundry-api-contract';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg';
import codexIcon from '@lobehub/icons-static-svg/icons/codex-color.svg';

const runtimeIcons = {
  'claude-code': claudeCodeIcon,
  'codex': codexIcon,
} satisfies Record<ProviderRuntime, string>;

export function RuntimeIcon({
  runtime,
  size = 16,
}: {
  runtime: ProviderRuntime;
  size?: number;
}) {
  return (
    <img
      alt=""
      aria-hidden="true"
      data-icon="inline-start"
      data-runtime-icon={runtime}
      height={size}
      src={runtimeIcons[runtime]}
      width={size}
    />
  );
}

export function RuntimeOption({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <>
      <RuntimeIcon runtime={runtime} />
      {providerRuntimeLabels[runtime]}
    </>
  );
}
