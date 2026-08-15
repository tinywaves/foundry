import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import type { IconType } from '@astryxdesign/core/Icon';
import { Section } from '@astryxdesign/core/Section';
import {
  borderVars,
  colorVars,
  radiusVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  emptyState: {
    gap: spacingVars['--spacing-3'],
    minHeight: '100%',
    borderWidth: borderVars['--border-width'],
    borderStyle: 'dashed',
    borderColor: colorVars['--color-border'],
    borderRadius: radiusVars['--radius-container'],
  },
});

interface PageEmptyStateProps {
  icon: IconType;
  text: string;
}

export function PageEmptyState({ icon, text }: PageEmptyStateProps) {
  return (
    <Section variant="transparent" padding={4} height="100%">
      <EmptyState
        headingLevel={2}
        title={text}
        icon={<Icon icon={icon} size="lg" color="secondary" />}
        isCompact
        xstyle={styles.emptyState}
      />
    </Section>
  );
}
