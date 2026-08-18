import { Section } from '@astryxdesign/core/Section';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { VStack } from '@astryxdesign/core/Stack';
import { sizeVars } from '@astryxdesign/core/theme/tokens.stylex';

export function SkillInventoryLoading() {
  return (
    <Section padding={4} height="100%">
      <VStack gap={2} width="100%">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton
            key={index}
            index={index}
            width="100%"
            height={sizeVars['--size-element-lg']}
          />
        ))}
      </VStack>
    </Section>
  );
}
