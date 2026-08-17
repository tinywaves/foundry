import { Markdown } from '@astryxdesign/core/Markdown';
import { VStack } from '@astryxdesign/core/Stack';
import {
  borderVars,
  colorVars,
  radiusVars,
  spacingVars,
  typeScaleVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

export const PROMPT_MARKDOWN_PREVIEW_HEIGHT = `calc(
  ${typeScaleVars['--text-code-size']}
  * ${typeScaleVars['--text-code-leading']}
  * 20
  + ${spacingVars['--spacing-4']} * 2
)`;

const styles = stylex.create({
  root: {
    backgroundColor: colorVars['--color-background-surface'],
    borderColor: colorVars['--color-border-emphasized'],
    borderRadius: radiusVars['--radius-element'],
    borderStyle: 'solid',
    borderWidth: borderVars['--border-width'],
    boxSizing: 'border-box',
    height: PROMPT_MARKDOWN_PREVIEW_HEIGHT,
    minWidth: 0,
    overflowY: 'auto',
    padding: spacingVars['--spacing-4'],
  },
});

function handleLinkClick(href: string): false | undefined {
  if (href.startsWith('https://') || href.startsWith('http://')) {
    return undefined;
  }
  return false;
}

interface PromptMarkdownPreviewProps {
  id?: string;
  labelId?: string;
  value: string;
}

export function PromptMarkdownPreview({
  id,
  labelId,
  value,
}: PromptMarkdownPreviewProps) {
  return (
    <VStack
      id={id}
      width="100%"
      role="region"
      aria-label={labelId ? undefined : 'Content preview'}
      aria-labelledby={labelId}
      xstyle={styles.root}
    >
      <Markdown
        density="compact"
        headingLevelStart={2}
        contentWidth="100%"
        onLinkClick={handleLinkClick}
      >
        {value}
      </Markdown>
    </VStack>
  );
}
