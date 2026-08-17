import type { CSSProperties, ReactNode } from 'react';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';

interface WindowDragRegionProps {
  children?: ReactNode;
  isDraggable?: boolean;
  variant?: 'compact' | 'header';
}

interface ElectronAppRegionStyle extends CSSProperties {
  WebkitAppRegion: 'drag' | 'no-drag';
}

const styles = stylex.create({
  root: {
    flexShrink: 0,
  },
  compact: {
    height: spacingVars['--spacing-7'],
  },
  header: {
    boxSizing: 'border-box',
    height: spacingVars['--spacing-7'],
  },
  macHeader: {
    paddingInlineStart: `calc(${spacingVars['--spacing-12']} + ${spacingVars['--spacing-8']})`,
  },
});

const dragRegionStyle: ElectronAppRegionStyle = {
  WebkitAppRegion: 'drag',
};

export function WindowDragRegion({
  children,
  isDraggable = true,
  variant = 'compact',
}: WindowDragRegionProps) {
  return (
    <HStack
      width="100%"
      hAlign="end"
      vAlign="center"
      xstyle={[
        styles.root,
        variant === 'compact' ? styles.compact : styles.header,
        isDraggable && variant === 'header' && styles.macHeader,
      ]}
      style={isDraggable ? dragRegionStyle : undefined}
    >
      {children ? <StackItem size="fill">{children}</StackItem> : null}
    </HStack>
  );
}
