import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { CaptureComposer } from '@renderer/components/capture-composer';
import { useI18n } from '@renderer/i18n/use-i18n';

export default function OverviewPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <VStack gap={5}>
      <VStack gap={2}>
        <Heading level={1}>{t('overview.title')}</Heading>
        <Text type="supporting">{t('overview.description')}</Text>
      </VStack>
      <CaptureComposer
        onCreated={(result) => {
          void navigate(`/base/captures?capture=${encodeURIComponent(result.capture.id)}`);
        }}
      />
    </VStack>
  );
}
