import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { HStack } from '@astryxdesign/core/Stack';
import { sizeVars } from '@astryxdesign/core/theme/tokens.stylex';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  action?: ReactNode;
  text: string;
}

export function PageHeader({ action, text }: PageHeaderProps) {
  return (
    <Section padding={4} paddingBlock={2}>
      <HStack
        gap={3}
        minHeight={sizeVars['--size-element-md']}
        hAlign="between"
        vAlign="center"
      >
        <Heading level={3} accessibilityLevel={1}>{text}</Heading>
        {action}
      </HStack>
    </Section>
  );
}
