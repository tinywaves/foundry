import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { useLocation } from 'react-router-dom';
import { useI18n } from '@renderer/i18n/use-i18n';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <VStack gap={2}>
      <Text type="supporting">
        {t('navigation.notFound')}
        :
        {pathname}
      </Text>
    </VStack>
  );
}
