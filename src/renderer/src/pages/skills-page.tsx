import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { Wrench } from 'lucide-react';
import { routePaths } from '@renderer/routes';

const styles = stylex.create({
  emptyState: {
    minHeight: '100%',
  },
});

export function SkillsPage() {
  return (
    <VStack width="100%" height="100%">
      <Section padding={4} paddingBlock={2} dividers={['bottom']}>
        <Heading level={1}>Skills</Heading>
      </Section>
      <StackItem size="fill">
        <EmptyState
          headingLevel={2}
          title="Skills Aren't Available Yet"
          description="Skill discovery and management aren't connected in this build."
          icon={<Icon icon={Wrench} size="lg" color="secondary" />}
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
