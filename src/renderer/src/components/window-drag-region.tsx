import type { CSSProperties, ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';

interface WindowDragRegionProps {
  children?: ReactNode;
}

interface ElectronAppRegionStyle extends CSSProperties {
  WebkitAppRegion: 'drag' | 'no-drag';
}

const styles = stylex.create({
  root: {
    flexShrink: 0,
    height: spacingVars['--spacing-12'],
  },
});

const dragRegionStyle: ElectronAppRegionStyle = {
  WebkitAppRegion: 'drag',
};

const noDragRegionStyle: ElectronAppRegionStyle = {
  WebkitAppRegion: 'no-drag',
};

export function WindowDragRegion({ children }: WindowDragRegionProps) {
  return (
    <HStack
      width="100%"
      hAlign="end"
      vAlign="center"
      xstyle={styles.root}
      style={dragRegionStyle}
    >
      <HStack width="fit-content" vAlign="center" style={noDragRegionStyle}>
        {children}
      </HStack>
    </HStack>
  );
}
