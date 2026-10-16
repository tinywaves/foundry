import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';

export default function SettingsPage() {
  return (
    <VStack gap={2}>
      <Heading level={1}>Settings</Heading>
      <Text type="supporting">Application preferences and local data.</Text>
    </VStack>
  );
}
