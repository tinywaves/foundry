import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { sizeVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';

const styles = stylex.create({
  title: {
    minWidth: 0,
  },
});

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
        wrap="wrap"
      >
        <StackItem size="fill" xstyle={styles.title}>
          <Heading
            level={3}
            accessibilityLevel={1}
            wordBreak="break-word"
            textWrap="pretty"
          >
            {text}
          </Heading>
        </StackItem>
        {action ? <StackItem>{action}</StackItem> : null}
      </HStack>
    </Section>
  );
}
