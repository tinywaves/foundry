import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';

export default function PromptsPage() {
  return (
    <VStack gap={2}>
      <Heading level={1}>Prompts</Heading>
      <Text type="supporting">Reusable text fragments for agent conversations.</Text>
    </VStack>
  );
}
