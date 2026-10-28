import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { useI18n } from '../../i18n';

export default function PromptsPage() {
  const { t } = useI18n();
  return (
    <VStack gap={2}>
      <Text type="supporting">{t('prompts.description')}</Text>
    </VStack>
  );
}
