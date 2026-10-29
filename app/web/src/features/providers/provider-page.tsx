import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { Switch } from '@astryxdesign/core/Switch';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Popover } from '@astryxdesign/core/Popover';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import {
  CloudIcon,
  CpuChipIcon,
  PencilSquareIcon,
  PlusIcon,
  Square3Stack3DIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { ProviderListItem } from './types';
import { FeatureEmptyState } from '../../components/feature-empty-state';
import {
  listProviders,
  providerKeys,
  setProviderStatus,
} from './api';
import { useI18n } from '../../i18n';
import { TitlebarActions } from '../../components/titlebar-actions';

const styles = stylex.create({
  providerList: {
    gap: 'var(--spacing-2)',
  },
  providerItem: {
    borderWidth: 'var(--border-width)',
    borderStyle: 'solid',
    borderColor: 'var(--color-border-emphasized)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-surface)',
  },
  providerDescription: {
    minWidth: 0,
    overflow: 'hidden',
  },
  providerProtocol: {
    minWidth: 0,
    flexShrink: 1,
  },
  providerBaseURLGroup: {
    minWidth: 0,
    flex: '1 1 auto',
    flexShrink: 1,
  },
  providerCustomModelsGroup: {
    flexShrink: 0,
  },
  providerBaseURL: {
    maxWidth: 'min(34rem, 42vw)',
  },
  providerActions: {
    flexShrink: 0,
  },
  providerPopover: {
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized), var(--shadow-med)',
  },
});

const protocolLabels = {
  'openai-responses': 'OpenAI Responses',
  'anthropic-messages': 'Anthropic Messages',
  'openai-compatible-chat-completions': 'OpenAI-compatible Chat Completions',
} as const;

export default function ProvidersPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [providerToDelete, setProviderToDelete] = useState<ProviderListItem | null>(null);
  const providersQuery = useQuery({
    queryKey: providerKeys.list(),
    queryFn: listProviders,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' | 'deleted' }) =>
      setProviderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
  const providerRemoval = useMutation({
    mutationFn: (id: string) => setProviderStatus(id, 'deleted'),
    onSuccess: () => {
      setProviderToDelete(null);
      void queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
  const providers: ProviderListItem[] = providersQuery.data ?? [];

  function setStatus(provider: ProviderListItem, isChecked: boolean) {
    if (provider.status === 'deleted' || provider.isInUse) {
      return;
    }
    statusMutation.mutate({ id: provider.id, status: isChecked ? 'active' : 'disabled' });
  }

  function getToggleTooltip(provider: ProviderListItem) {
    if (provider.isInUse) {
      return t('providers.inUse');
    }
    return t(provider.status === 'active' ? 'providers.disable' : 'providers.enable');
  }

  return (
    <>
      <TitlebarActions>
        <Button label={t('providers.add')} size="sm" variant="primary" href="/providers/new" as={Link} />
      </TitlebarActions>
      <VStack gap={5}>
        {providers.length === 0
          ? (
              <FeatureEmptyState
                startIcon={CloudIcon}
                centerIcon={Square3Stack3DIcon}
                endIcon={CpuChipIcon}
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
            )
          : (
              <List density="balanced" hasDividers={false} xstyle={styles.providerList}>
                {providers.map((provider) => (
                  <ListItem
                    key={provider.id}
                    label={provider.name}
                    xstyle={styles.providerItem}
                    startContent={<Icon icon={Square3Stack3DIcon} size="lg" color="secondary" />}
                    description={(
                      <HStack gap={1} wrap="nowrap" xstyle={styles.providerDescription}>
                        <Token size="sm" label={protocolLabels[provider.protocol]} xstyle={styles.providerProtocol} />
                        <HStack gap={1} vAlign="center" xstyle={styles.providerBaseURLGroup}>
                          <Text type="supporting">·</Text>
                          <Text type="supporting" maxLines={1} xstyle={styles.providerBaseURL}>{provider.baseURL}</Text>
                        </HStack>
                        <HStack gap={1} vAlign="center" xstyle={styles.providerCustomModelsGroup}>
                          <Text type="supporting">·</Text>
                          <Text type="supporting" maxLines={1}>{`${provider.customModels.length} ${t('providers.customModels')}`}</Text>
                        </HStack>
                      </HStack>
                    )}
                    endContent={(
                      <HStack gap={2} vAlign="center" xstyle={styles.providerActions}>
                        <IconButton
                          label={`${t('providers.edit')} ${provider.name}`}
                          tooltip={t('providers.edit')}
                          icon={<PencilSquareIcon />}
                          variant="ghost"
                          size="sm"
                          href={`/providers/${provider.id}`}
                          as={Link}
                        />
                        <Popover
                          label={`${t('providers.deleteLabel')} ${provider.name}`}
                          xstyle={styles.providerPopover}
                          isOpen={providerToDelete?.id === provider.id}
                          isEnabled={!provider.isInUse}
                          onOpenChange={(isOpen) => {
                            setProviderToDelete(isOpen ? provider : null);
                          }}
                          content={(
                            <VStack gap={3}>
                              <VStack gap={1}>
                                <Text type="label">{t('providers.deleteQuestion')}</Text>
                              </VStack>
                              <HStack gap={2} hAlign="end">
                                <Button
                                  label={t('providers.cancel')}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setProviderToDelete(null);
                                  }}
                                />
                                <Button
                                  label={t('providers.delete')}
                                  variant="destructive"
                                  size="sm"
                                  isLoading={providerRemoval.isPending && providerToDelete?.id === provider.id}
                                  onClick={() => {
                                    providerRemoval.mutate(provider.id);
                                  }}
                                />
                              </HStack>
                            </VStack>
                          )}
                        >
                          <IconButton
                            label={`${t('providers.deleteLabel')} ${provider.name}`}
                            tooltip={t('providers.deleteLabel')}
                            icon={<TrashIcon />}
                            variant="ghost"
                            size="sm"
                            isDisabled={provider.isInUse}
                          />
                        </Popover>
                        <Tooltip
                          content={getToggleTooltip(provider)}
                        >
                          <Switch
                            label={`${provider.name} ${t('providers.enabled')}`}
                            isLabelHidden
                            value={provider.status === 'active'}
                            onChange={(isChecked) => {
                              setStatus(provider, isChecked);
                            }}
                            isDisabled={provider.isInUse}
                            size="sm"
                          />
                        </Tooltip>
                      </HStack>
                    )}
                  />
                ))}
              </List>
            )}
      </VStack>
    </>
  );
}
