import { Icon } from '@astryxdesign/core/Icon';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg?url';
import codexIcon from '@lobehub/icons-static-svg/icons/codex-color.svg?url';
import cursorIcon from '@lobehub/icons-static-svg/icons/cursor.svg?url';
import geminiIcon from '@lobehub/icons-static-svg/icons/gemini-color.svg?url';
import githubCopilotIcon from '@lobehub/icons-static-svg/icons/githubcopilot.svg?url';
import openClawIcon from '@lobehub/icons-static-svg/icons/openclaw-color.svg?url';
import openCodeIcon from '@lobehub/icons-static-svg/icons/opencode.svg?url';
import * as stylex from '@stylexjs/stylex';
import { Bot, Folder, Wrench } from 'lucide-react';
import type { SkillTargetKind } from '../../../../shared/skill-contract';

const targetIconUrls: Partial<Record<SkillTargetKind, string>> = {
  'claude-code': claudeCodeIcon,
  'gemini-cli': geminiIcon,
  'opencode': openCodeIcon,
  'cursor': cursorIcon,
  'github-copilot': githubCopilotIcon,
  'openclaw': openClawIcon,
  'codex-legacy': codexIcon,
};

const styles = stylex.create({
  image: {
    display: 'block',
    flexShrink: 0,
    width: spacingVars['--spacing-6'],
    height: spacingVars['--spacing-6'],
  },
});

export function SkillTargetIcon({ kind }: { kind: SkillTargetKind }) {
  const iconUrl = targetIconUrls[kind];
  if (iconUrl) {
    return (
      <img
        {...stylex.props(styles.image)}
        src={iconUrl}
        alt=""
        width={24}
        height={24}
        draggable={false}
      />
    );
  }
  const icon = kind === 'generic-agent-skills'
    ? Wrench
    : (kind === 'custom' ? Folder : Bot);
  return <Icon icon={icon} size="md" color="secondary" />;
}
