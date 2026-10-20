import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { useI18n } from '@renderer/i18n/use-i18n';

export default function OverviewPage() {
  const { t } = useI18n();
  return (
    <VStack gap={2}>
      <Text type="supporting">{t('overview.description')}</Text>
    </VStack>
  );
}
