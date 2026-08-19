import { Section } from '@astryxdesign/core/Section';
import { SizeProvider } from '@astryxdesign/core/SizeContext';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import type { HStackProps } from '@astryxdesign/core/Stack';
import type { ReactNode } from 'react';

interface SkillActionBarProps {
  endContent?: ReactNode;
  label: string;
  slotGap?: HStackProps['gap'];
  startContent?: ReactNode;
}

export function SkillActionBar({
  endContent,
  label,
  slotGap = 1,
  startContent,
}: SkillActionBarProps) {
  const hasEndContent = endContent != null;
  const hasStartContent = startContent != null;

  return (
    <Section
      variant="transparent"
      paddingBlock={2}
      role="group"
      aria-label={label}
    >
      <SizeProvider value="sm">
        <HStack
          gap={slotGap}
          width="100%"
          hAlign={hasStartContent ? 'start' : 'end'}
          vAlign="center"
        >
          {hasStartContent
            ? (
                <StackItem size={hasEndContent ? 'fill' : 'static'}>
                  {startContent}
                </StackItem>
              )
            : null}
          {hasEndContent
            ? (
                <StackItem>
                  {endContent}
                </StackItem>
              )
            : null}
        </HStack>
      </SizeProvider>
    </Section>
  );
}
