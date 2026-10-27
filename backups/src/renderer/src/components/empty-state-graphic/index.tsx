import type { ComponentType, SVGProps } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { styles } from './styles';

type GraphicIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function EmptyStateGraphic({
  startIcon,
  centerIcon,
  endIcon,
}: {
  startIcon: GraphicIcon;
  centerIcon: GraphicIcon;
  endIcon: GraphicIcon;
}) {
  return (
    <HStack gap={2} vAlign="center" xstyle={styles.illustration}>
      <HStack
        hAlign="center"
        vAlign="center"
        xstyle={styles.satelliteNode}
      >
        <Icon icon={startIcon} size="sm" color="secondary" />
      </HStack>
      <VStack xstyle={styles.connector} />
      <HStack
        hAlign="center"
        vAlign="center"
        xstyle={styles.coreNode}
      >
        <Icon icon={centerIcon} size="lg" color="accent" />
      </HStack>
      <VStack xstyle={styles.connector} />
      <HStack
        hAlign="center"
        vAlign="center"
        xstyle={styles.satelliteNode}
      >
        <Icon icon={endIcon} size="sm" color="secondary" />
      </HStack>
    </HStack>
  );
}
