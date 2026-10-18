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
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Section } from '@astryxdesign/core/Section';
import { PencilSquareIcon, Square3Stack3DIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { ProviderListItem } from '../../../../shared/providers';
import { listProviders, providerKeys } from '@renderer/providers';
import { styles } from './styles';

const protocolLabels = {
  'openai-responses': 'OpenAI Responses',
  'anthropic-messages': 'Anthropic Messages',
  'openai-compatible-chat-completions': 'OpenAI-compatible Chat Completions',
} as const;

export default function ProvidersPage() {
  const queryClient = useQueryClient();
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
  const providers: ProviderListItem[] = providersQuery.data ?? [];

  function setStatus(provider: ProviderListItem, isChecked: boolean) {
    if (provider.status === 'deleted' || provider.isInUse) {
      return;
    }
    statusMutation.mutate({ id: provider.id, status: isChecked ? 'active' : 'disabled' });
  }

  function removeProvider(provider: ProviderListItem) {
    if (provider.status === 'deleted' || provider.isInUse) {
      return;
    }
    statusMutation.mutate({ id: provider.id, status: 'deleted' });
  }

  function getToggleTooltip(provider: ProviderListItem) {
    if (provider.isInUse) {
      return 'Provider is currently in use';
    }
    return provider.status === 'active' ? 'Disable provider' : 'Enable provider';
  }

  return (
    <VStack gap={5}>
      {providers.length === 0
        ? (
            <Section variant="muted" padding={5}>
              <VStack gap={2}>
                <Text type="supporting">Add a provider to make model services available to the application.</Text>
                <Button label="Add your first provider" size="sm" href="/providers/new" as={Link} />
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
                    <HStack gap={1} wrap="wrap" xstyle={styles.providerDescription}>
                      <Token size="sm" label={protocolLabels[provider.protocol]} />
                      <Text type="supporting">·</Text>
                      <Text type="supporting" maxLines={1} xstyle={styles.providerBaseURL}>{provider.baseURL}</Text>
                      <Text type="supporting">·</Text>
                      <Text type="supporting">{`${provider.customModels.length} custom models`}</Text>
                    </HStack>
                  )}
                  endContent={(
                    <HStack gap={2} vAlign="center" xstyle={styles.providerActions}>
                      <IconButton
                        label={`Edit ${provider.name}`}
                        tooltip="Edit provider"
                        icon={<PencilSquareIcon />}
                        variant="ghost"
                        size="sm"
                        href={`/providers/${provider.id}`}
                        as={Link}
                      />
                      <IconButton
                        label={`Delete ${provider.name}`}
                        tooltip="Delete provider"
                        icon={<TrashIcon />}
                        variant="ghost"
                        size="sm"
                        isDisabled={provider.isInUse}
                        onClick={() => {
                          removeProvider(provider);
                        }}
                      />
                      <Tooltip
                        content={getToggleTooltip(provider)}
                      >
                        <Switch
                          label={`${provider.name} enabled`}
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
  );
}
