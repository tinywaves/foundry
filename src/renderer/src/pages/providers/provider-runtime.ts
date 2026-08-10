import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg?url';
import codexIcon from '@lobehub/icons-static-svg/icons/codex-color.svg?url';
import type { ProviderRuntime } from '../../../../shared/provider-contract';

export const providerRuntimeLabels: Record<ProviderRuntime, string> = {
  'codex': 'Codex',
  'claude-code': 'Claude Code',
};

export const providerRuntimeIconUrls: Record<ProviderRuntime, string> = {
  'codex': codexIcon,
  'claude-code': claudeCodeIcon,
};
