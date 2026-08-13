import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import type { IconType } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { routePaths } from '@renderer/routes';

const styles = stylex.create({
  emptyState: {
    minHeight: '100%',
  },
});

interface UnavailableFeaturePageProps {
  description: string;
  icon: IconType;
  title: string;
  unavailableTitle: string;
}

export function UnavailableFeaturePage({
  description,
  icon,
  title,
  unavailableTitle,
}: UnavailableFeaturePageProps) {
  return (
    <VStack width="100%" height="100%">
      <Section padding={4} paddingBlock={2} dividers={['bottom']}>
        <Heading level={1}>{title}</Heading>
      </Section>
      <StackItem size="fill">
        <EmptyState
          headingLevel={2}
          title={unavailableTitle}
          description={description}
          icon={<Icon icon={icon} size="lg" color="secondary" />}
          actions={(
            <Link href={routePaths.dashboard} isStandalone>
              Return to Dashboard
            </Link>
          )}
          xstyle={styles.emptyState}
        />
      </StackItem>
    </VStack>
  );
}
