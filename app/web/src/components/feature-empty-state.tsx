import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';

type GraphicIcon = ComponentType<SVGProps<SVGSVGElement>>;

const styles = stylex.create({
  illustration: {
    paddingBlock: 'var(--spacing-1)',
  },
  satelliteNode: {
    width: 'var(--spacing-12)',
    height: 'var(--spacing-12)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-background-card)',
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized)',
  },
  coreNode: {
    width: 'calc(var(--spacing-10) * 2)',
    height: 'calc(var(--spacing-10) * 2)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-accent-muted)',
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized)',
  },
  connector: {
    width: 'var(--spacing-8)',
    height: 'var(--border-width)',
    backgroundColor: 'var(--color-border-emphasized)',
  },
});

export function FeatureEmptyState({
  startIcon,
  centerIcon,
  endIcon,
  title,
  description,
  actions,
}: {
  startIcon: GraphicIcon;
  centerIcon: GraphicIcon;
  endIcon: GraphicIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <HStack width="100%" hAlign="center">
      <Card width="100%" padding={0}>
        <EmptyState
          headingLevel={2}
          icon={(
            <HStack gap={2} vAlign="center" xstyle={styles.illustration}>
              <GraphicNode icon={startIcon} isCore={false} />
              <VStack xstyle={styles.connector} />
              <GraphicNode icon={centerIcon} isCore />
              <VStack xstyle={styles.connector} />
              <GraphicNode icon={endIcon} isCore={false} />
            </HStack>
          )}
          title={title}
          description={description}
          actions={actions}
        />
      </Card>
    </HStack>
  );
}

function GraphicNode({ icon, isCore }: { icon: GraphicIcon; isCore: boolean }) {
  return (
    <HStack
      hAlign="center"
      vAlign="center"
      xstyle={isCore ? styles.coreNode : styles.satelliteNode}
    >
      <Icon icon={icon} size={isCore ? 'lg' : 'sm'} color={isCore ? 'accent' : 'secondary'} />
    </HStack>
  );
}
