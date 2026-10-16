import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <VStack gap={2}>
      <Heading level={1}>Page not found</Heading>
      <Text type="supporting">
        No page is registered for
        {pathname}
        .
      </Text>
    </VStack>
  );
}
