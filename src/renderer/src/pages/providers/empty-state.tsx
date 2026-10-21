import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { CloudIcon, CpuChipIcon, PlusIcon, ServerStackIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useI18n } from '@renderer/i18n/use-i18n';
import { styles } from './styles';

function ProviderConnectionGraphic() {
  return (
    <HStack gap={2} vAlign="center" xstyle={styles.emptyStateIllustration}>
      <HStack
        hAlign="center"
        vAlign="center"
        xstyle={styles.emptyStateSatelliteNode}
      >
        <Icon icon={CloudIcon} size="sm" color="secondary" />
      </HStack>
      <VStack xstyle={styles.emptyStateConnector} />
      <HStack
        hAlign="center"
        vAlign="center"
        xstyle={styles.emptyStateCoreNode}
      >
        <Icon icon={ServerStackIcon} size="lg" color="accent" />
      </HStack>
      <VStack xstyle={styles.emptyStateConnector} />
      <HStack
        hAlign="center"
        vAlign="center"
        xstyle={styles.emptyStateSatelliteNode}
      >
        <Icon icon={CpuChipIcon} size="sm" color="secondary" />
      </HStack>
    </HStack>
  );
}

export function ProviderEmptyState() {
  const { t } = useI18n();

  return (
    <HStack width="100%" hAlign="center">
      <Card width="100%" maxWidth={720} padding={0}>
        <EmptyState
          headingLevel={2}
          icon={<ProviderConnectionGraphic />}
          title={t('providers.emptyTitle')}
          description={t('providers.empty')}
          actions={(
            <Button
              label={t('providers.addFirst')}
              size="sm"
              variant="primary"
              icon={<PlusIcon />}
              href="/providers/new"
              as={Link}
            />
          )}
        />
      </Card>
    </HStack>
  );
}
