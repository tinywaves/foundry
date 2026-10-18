import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Switch } from '@astryxdesign/core/Switch';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Section } from '@astryxdesign/core/Section';
import type { ProviderListItem } from '../../../../shared/providers';
import { listProviders, providerKeys } from '@renderer/providers';

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

  return (
    <VStack gap={5}>
      <HStack vAlign="center">
        <VStack gap={1}>
          <Heading level={1}>Providers</Heading>
          <Text type="supporting">Manage the model service connections used by Foundry.</Text>
        </VStack>
        <Button label="Add provider" variant="primary" size="sm" href="/providers/new" as={Link} />
      </HStack>
      {providers.length === 0
        ? (
            <Section variant="muted" padding={5}>
              <VStack gap={2}>
                <Heading level={2}>No providers yet</Heading>
                <Text type="supporting">Add a provider to make model services available to the application.</Text>
                <Button label="Add your first provider" href="/providers/new" as={Link} />
              </VStack>
            </Section>
          )
        : (
            <VStack gap={2}>
              {providers.map((provider) => (
                <Section key={provider.id} padding={4}>
                  <HStack vAlign="center">
                    <VStack gap={1}>
                      <Heading level={3}>{provider.name}</Heading>
                      <Text type="supporting">
                        {protocolLabels[provider.protocol]}
                        {' · '}
                        {provider.baseURL}
                      </Text>
                      <HStack gap={1}>
                        <Badge label={`${provider.customModels.length} custom model${provider.customModels.length === 1 ? '' : 's'}`} variant="neutral" />
                        {provider.isInUse && <Badge label="In use" variant="info" />}
                      </HStack>
                    </VStack>
                    <HStack gap={2} vAlign="center">
                      <Switch
                        label={provider.status === 'active' ? 'Enabled' : 'Disabled'}
                        value={provider.status === 'active'}
                        onChange={(isChecked) => {
                          setStatus(provider, isChecked);
                        }}
                        isDisabled={provider.isInUse}
                        labelSpacing="hug"
                        size="sm"
                      />
                      <Button label="Edit" href={`/providers/${provider.id}`} as={Link} variant="secondary" />
                      <Button
                        label="Delete"
                        variant="destructive"
                        size="sm"
                        isDisabled={provider.isInUse}
                        onClick={() => {
                          removeProvider(provider);
                        }}
                      />
                    </HStack>
                  </HStack>
                </Section>
              ))}
            </VStack>
          )}
    </VStack>
  );
}
