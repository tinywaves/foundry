import { Icon } from '@astryxdesign/core/Icon';
import { useTheme } from '@astryxdesign/core/theme';
import {
  radiusVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg?url';
import codexIcon from '@lobehub/icons-static-svg/icons/codex-color.svg?url';
import cursorIcon from '@lobehub/icons-static-svg/icons/cursor.svg?url';
import geminiIcon from '@lobehub/icons-static-svg/icons/gemini-color.svg?url';
import githubCopilotIcon from '@lobehub/icons-static-svg/icons/githubcopilot.svg?url';
import hermesAgentIcon from '@lobehub/icons-static-svg/icons/hermesagent.svg?url';
import openClawIcon from '@lobehub/icons-static-svg/icons/openclaw-color.svg?url';
import openCodeIcon from '@lobehub/icons-static-svg/icons/opencode.svg?url';
import * as stylex from '@stylexjs/stylex';
import { Blocks, Bot } from 'lucide-react';
import agentSkillsIcon from '../../../../../resources/agent-skills.png?url';
import type { SkillTargetKind } from '../../../../shared/skill-contract';

interface TargetIconAsset {
  isMonochrome?: boolean;
  isRounded?: boolean;
  url: string;
}

const targetIconAssets: Partial<Record<SkillTargetKind, TargetIconAsset>> = {
  'generic-agent-skills': { url: agentSkillsIcon, isRounded: true },
  'claude-code': { url: claudeCodeIcon },
  'gemini-cli': { url: geminiIcon },
  'opencode': { url: openCodeIcon, isMonochrome: true },
  'cursor': { url: cursorIcon, isMonochrome: true },
  'github-copilot': { url: githubCopilotIcon, isMonochrome: true },
  'openclaw': { url: openClawIcon },
  'hermes': { url: hermesAgentIcon, isMonochrome: true },
  'codex-legacy': { url: codexIcon },
};

const styles = stylex.create({
  image: {
    display: 'block',
    flexShrink: 0,
    width: spacingVars['--spacing-6'],
    height: spacingVars['--spacing-6'],
  },
  monochromeImageDark: {
    filter: 'brightness(0) invert(1)',
  },
  roundedImage: {
    borderRadius: radiusVars['--radius-inner'],
  },
});

export function SkillTargetIcon({ kind }: { kind: SkillTargetKind }) {
  const { mode: themeMode } = useTheme();
  const iconAsset = targetIconAssets[kind];
  if (iconAsset) {
    return (
      <img
        {...stylex.props(
          styles.image,
          iconAsset.isRounded && styles.roundedImage,
          iconAsset.isMonochrome && themeMode === 'dark' && styles.monochromeImageDark,
        )}
        src={iconAsset.url}
        alt=""
        width={24}
        height={24}
        draggable={false}
      />
    );
  }
  const icon = kind === 'custom' ? Blocks : Bot;
  return <Icon icon={icon} size="md" color="secondary" />;
}
