import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import type { IconType } from '@astryxdesign/core/Icon';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  emptyState: {
    minHeight: '100%',
  },
});

interface PageEmptyStateProps {
  icon: IconType;
  text: string;
}

export function PageEmptyState({ icon, text }: PageEmptyStateProps) {
  return (
    <EmptyState
      headingLevel={2}
      title={text}
      icon={<Icon icon={icon} size="lg" color="secondary" />}
      xstyle={styles.emptyState}
    />
  );
}
