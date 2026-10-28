import { Heading, Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { useI18n } from '../../i18n';

export default function OverviewPage() {
  const { t } = useI18n();

  return (
    <VStack gap={5}>
      <VStack gap={2}>
        <Heading level={1}>{t('overview.title')}</Heading>
        <Text type="supporting">{t('overview.description')}</Text>
      </VStack>
    </VStack>
  );
}
