import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { Section } from '@astryxdesign/core/Section';
import { PencilSquareIcon, Square3Stack3DIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { ProviderListItem } from '../../../../shared/providers';
import { listProviders, providerKeys } from '@renderer/providers';
import { styles } from './styles';
import { useI18n } from '@renderer/i18n/use-i18n';

const protocolLabels = {
  'openai-responses': 'OpenAI Responses',
  'anthropic-messages': 'Anthropic Messages',
  'openai-compatible-chat-completions': 'OpenAI-compatible Chat Completions',
} as const;

export default function ProvidersPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [providerToDelete, setProviderToDelete] = useState<ProviderListItem | null>(null);
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);
  const providersQuery = useQuery({
    queryKey: providerKeys.list(),
    queryFn: listProviders,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' | 'deleted' }) =>
      globalThis.api.providers.setStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
  const providerRemoval = useMutation({
    mutationFn: (id: string) => globalThis.api.providers.setStatus(id, 'deleted'),
    onSuccess: () => {
      setProviderToDelete(null);
      void queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
  const providers: ProviderListItem[] = providersQuery.data ?? [];

  useEffect(() => {
    // The titlebar is committed with the layout, so resolve its portal target after the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setTitlebarActions(document.getElementById('window-titlebar-actions'));
  }, []);

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
      {titlebarActions && createPortal(
        <Button label={t('providers.add')} size="sm" variant="primary" href="/providers/new" as={Link} />,
        titlebarActions,
      )}
      <VStack gap={5}>
        {providers.length === 0
          ? (
              <Section variant="muted" padding={5}>
                <VStack gap={2}>
                  <Text type="supporting">{t('providers.empty')}</Text>
                  <Button label={t('providers.addFirst')} size="sm" href="/providers/new" as={Link} />
                </VStack>
              </Section>
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
