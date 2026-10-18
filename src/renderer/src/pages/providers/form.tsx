import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Heading, Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Token } from '@astryxdesign/core/Token';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Section } from '@astryxdesign/core/Section';
import { useToast } from '@astryxdesign/core';
import type { CustomModel, ProviderInput, ProviderProtocol, RemoteModel } from '../../../../shared/providers';

type FormModel = (RemoteModel & { source: 'remote' }) | (CustomModel & { source: 'custom' });

const protocols: Array<{ value: ProviderProtocol; label: string }> = [
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'openai-compatible-chat-completions', label: 'OpenAI-compatible Chat Completions' },
];

export default function ProviderFormPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<ProviderProtocol>('openai-responses');
  const [baseURL, setBaseURL] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<FormModel[]>([]);
  const [modelID, setModelID] = useState('');
  const [modelName, setModelName] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!providerId) {
      return;
    }
    void globalThis.api.providers.get(providerId).then((provider) => {
      if (!provider) {
        return;
      }
      setName(provider.name);
      setProtocol(provider.protocol);
      setBaseURL(provider.baseURL);
      setApiKey(provider.apiKey);
      setModels(provider.customModels.map((model) => ({ ...model, source: 'custom' as const })));
    });
  }, [providerId]);

  const canFetch = Boolean(baseURL.trim() && (protocol === 'openai-compatible-chat-completions' || apiKey.trim()));
  const canSave = models.length > 0 && !isFetching && !isSaving && Boolean(name.trim() && baseURL.trim());
  const customModels = useMemo(() => models.filter((model): model is CustomModel & { source: 'custom' } => model.source === 'custom'), [models]);

  const fetchModels = useCallback(async () => {
    if (!canFetch) {
      return;
    }
    setIsFetching(true);
    try {
      const remote = await globalThis.api.providers.fetchModelsForInput({ protocol, baseURL, apiKey });
      setModels((current) => [
        ...remote.map((model) => ({ ...model, source: 'remote' as const })),
        ...current.filter((model) => model.source === 'custom'),
      ]);
    } catch {
      setModels((current) => current.filter((model) => model.source === 'custom'));
      toast({ body: 'Failed to fetch models', type: 'error' });
    } finally {
      setIsFetching(false);
    }
  }, [apiKey, baseURL, canFetch, protocol, toast]);

  useEffect(() => {
    if (!canFetch) {
      return;
    }
    const timer = setTimeout(() => {
      void fetchModels();
    }, 500);
    return () => clearTimeout(timer);
  }, [canFetch, fetchModels]);

  function addCustomModel() {
    const id = modelID.trim();
    if (!id || customModels.some((model) => model.id === id)) {
      return;
    }
    setModels((current) => [...current, { id, displayName: modelName.trim() || null, source: 'custom' }]);
    setModelID('');
    setModelName('');
  }

  async function save() {
    if (!canSave) {
      return;
    }
    setIsSaving(true);
    const input: ProviderInput = { name: name.trim(), protocol, baseURL: baseURL.trim(), apiKey, customModels: customModels.map(({ source: _source, ...model }) => model) };
    try {
      await globalThis.api.providers.save(input, providerId);
      void navigate('/providers');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={1}>{providerId ? 'Edit provider' : 'New provider'}</Heading>
        <Text type="supporting">Connect a model service using one of Foundry's supported protocols.</Text>
      </VStack>
      <Section padding={5}>
        <VStack gap={4}>
          <TextInput size="sm" label="Name" value={name} onChange={setName} isRequired />
          <Selector size="sm" label="Protocol" options={protocols} value={protocol} onChange={(value) => setProtocol(value as ProviderProtocol)} isDisabled={Boolean(providerId)} isRequired />
          <TextInput size="sm" label="Base URL" value={baseURL} onChange={setBaseURL} placeholder="https://api.example.com/v1" isRequired />
          <TextInput size="sm" label="API key" type="password" value={apiKey} onChange={setApiKey} isRequired={protocol !== 'openai-compatible-chat-completions'} />
          <HStack vAlign="center">
            <Button
              label="Fetch models"
              variant="secondary"
              isDisabled={!canFetch}
              isLoading={isFetching}
              onClick={() => {
                void fetchModels();
              }}
            />
            {isFetching && <Text type="supporting">Loading models...</Text>}
          </HStack>
        </VStack>
      </Section>
      <Section padding={5}>
        <VStack gap={3}>
          <VStack gap={1}>
            <Heading level={2}>Models</Heading>
            <Text type="supporting">Fetched models are temporary. Add custom models when a service does not expose a model list.</Text>
          </VStack>
          <HStack gap={1} wrap="wrap">
            {models.map((model) => (
              <Token size="sm" key={`${model.source}-${model.id}`} label={model.displayName || model.id} color={model.source === 'custom' ? 'blue' : 'default'} onRemove={model.source === 'custom' ? () => setModels((current) => current.filter((candidate) => candidate !== model)) : undefined} />
            ))}
            <Token size="sm" label="Add custom model" color="green" onClick={addCustomModel} />
          </HStack>
          <HStack gap={2}>
            <TextInput
              label="Model ID"
              value={modelID}
              onChange={(value) => {
                setModelID(value);
                if (!modelName) {
                  setModelName(value);
                }
              }}
              isLabelHidden
              placeholder="Model ID"
            />
            <TextInput size="sm" label="Display name" value={modelName} onChange={setModelName} isLabelHidden isOptional placeholder="Display name (optional)" />
            <Button label="Add" variant="secondary" size="sm" isDisabled={!modelID.trim()} onClick={addCustomModel} />
          </HStack>
        </VStack>
      </Section>
      <HStack hAlign="end" gap={2}>
        <Button label="Cancel" variant="ghost" size="sm" onClick={() => navigate('/providers')} />
        <Button
          label="Save provider"
          variant="primary"
          isDisabled={!canSave}
          isLoading={isSaving}
          onClick={() => {
            void save();
          }}
        />
      </HStack>
    </VStack>
  );
}
