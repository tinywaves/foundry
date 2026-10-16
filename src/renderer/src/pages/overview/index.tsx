import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';

export default function OverviewPage() {
  return (
    <VStack gap={2}>
      <Heading level={1}>Overview</Heading>
      <Text type="supporting">A summary of the local workspace.</Text>
    </VStack>
  );
}
