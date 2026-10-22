import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Token } from '@astryxdesign/core/Token';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Popover } from '@astryxdesign/core/Popover';
import { useAppToast } from '@renderer/hooks/use-app-toast';
import { ArrowPathIcon, EyeIcon, EyeSlashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import type { CustomModel, ProviderInput, ProviderProtocol, RemoteModel } from '../../../../shared/providers';
import { providerKeys } from '@renderer/apis/providers';
import { styles } from './styles';
import { useI18n } from '@renderer/i18n/use-i18n';

type FormModel = (RemoteModel & { source: 'remote' }) | (CustomModel & { source: 'custom' });

const protocols: Array<{ value: ProviderProtocol; label: string }> = [
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'openai-compatible-chat-completions', label: 'OpenAI-compatible Chat Completions' },
];

export default function ProviderFormPage() {
  const { providerId } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<ProviderProtocol>('openai-responses');
  const [baseURL, setBaseURL] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isModelHelpOpen, setIsModelHelpOpen] = useState(false);
  const modelHelpCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [models, setModels] = useState<FormModel[]>([]);
  const [modelID, setModelID] = useState('');
  const [modelName, setModelName] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // The titlebar is committed alongside the route outlet, so resolve its portal target after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setTitlebarActions(document.getElementById('window-titlebar-actions'));
  }, []);

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
      toast({
        body: t('providers.failedFetchModels'),
        type: 'error',
      });
    } finally {
      setIsFetching(false);
    }
  }, [apiKey, baseURL, canFetch, protocol, t, toast]);

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

  const save = useCallback(async () => {
    if (!canSave) {
      return;
    }
    setIsSaving(true);
    const input: ProviderInput = { name: name.trim(), protocol, baseURL: baseURL.trim(), apiKey, customModels: customModels.map(({ source: _source, ...model }) => model) };
    try {
      await globalThis.api.providers.save(input, providerId);
      await queryClient.invalidateQueries({ queryKey: providerKeys.all });
      void navigate('/providers');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, baseURL, canSave, customModels, navigate, name, providerId, protocol, queryClient]);

  const cancel = useCallback(() => {
    void navigate('/providers');
  }, [navigate]);
  const submit = useCallback(() => {
    void save();
  }, [save]);
  const openModelHelp = useCallback(() => {
    if (modelHelpCloseTimerRef.current) {
      clearTimeout(modelHelpCloseTimerRef.current);
    }
    setIsModelHelpOpen(true);
  }, []);
  const closeModelHelp = useCallback(() => {
    modelHelpCloseTimerRef.current = setTimeout(() => {
      setIsModelHelpOpen(false);
    }, 120);
  }, []);
  return (
    <>
      {titlebarActions && createPortal(
        <HStack gap={2}>
          <Button label={t('providers.cancel')} variant="ghost" size="sm" onClick={cancel} />
          <Button
            label={t('providers.save')}
            variant="primary"
            size="sm"
            isDisabled={!canSave}
            isLoading={isSaving}
            onClick={submit}
          />
        </HStack>,
        titlebarActions,
      )}
      <VStack gap={5}>
        <VStack gap={4}>
          <HStack gap={3} wrap="wrap" xstyle={styles.formFieldRow}>
            <TextInput containerXstyle={styles.formNameField} size="sm" label={t('providers.name')} value={name} onChange={setName} isRequired />
            <Selector containerXstyle={styles.formProtocolField} size="sm" label={t('providers.protocol')} options={protocols} value={protocol} onChange={(value) => setProtocol(value as ProviderProtocol)} isDisabled={Boolean(providerId)} isRequired />
          </HStack>
          <TextInput size="sm" label={t('providers.baseUrl')} value={baseURL} onChange={setBaseURL} placeholder="https://api.example.com/v1" isRequired />
          <InputGroup
            label={t('providers.apiKey')}
            size="sm"
            isRequired={protocol !== 'openai-compatible-chat-completions'}
            xstyle={styles.formApiKeyField}
          >
            <TextInput
              size="sm"
              label={t('providers.apiKey')}
              isLabelHidden
              type={isApiKeyVisible ? 'text' : 'password'}
              value={apiKey}
              onChange={setApiKey}
            />
            <InputGroupText xstyle={styles.apiKeyVisibilityAddon}>
              <IconButton
                label={t(isApiKeyVisible ? 'providers.hideApiKey' : 'providers.showApiKey')}
                tooltip={t(isApiKeyVisible ? 'providers.hideApiKey' : 'providers.showApiKey')}
                icon={isApiKeyVisible ? <EyeSlashIcon /> : <EyeIcon />}
                variant="ghost"
                size="sm"
                onClick={() => setIsApiKeyVisible((visible) => !visible)}
              />
            </InputGroupText>
          </InputGroup>
        </VStack>
        <VStack gap={3}>
          <HStack gap={1} vAlign="center">
            <Text type="label" color="secondary">{t('providers.models')}</Text>
            <Text type="supporting">
              ·
              {t('providers.required')}
            </Text>
            <Popover
              label={t('providers.modelSources')}
              placement="below"
              alignment="start"
              isOpen={isModelHelpOpen}
              isEnabled={false}
              onOpenChange={setIsModelHelpOpen}
              content={(
                <VStack gap={1} onMouseEnter={openModelHelp} onMouseLeave={closeModelHelp}>
                  <Text type="supporting">{t('providers.modelsTemporary')}</Text>
                </VStack>
              )}
            >
              <button
                type="button"
                aria-label={t('providers.aboutModelSources')}
                {...stylex.props(styles.modelHelpTrigger)}
                onMouseEnter={openModelHelp}
                onMouseLeave={closeModelHelp}
              >
                <Icon icon={QuestionMarkCircleIcon} size="sm" />
              </button>
            </Popover>
            <IconButton
              label={t('providers.fetchModels')}
              tooltip={t('providers.fetchModels')}
              icon={<ArrowPathIcon />}
              variant="ghost"
              size="sm"
              isDisabled={!canFetch}
              isLoading={isFetching}
              onClick={() => {
                void fetchModels();
              }}
            />
          </HStack>
          {models.length > 0 && (
            <HStack gap={1} wrap="wrap">
              {models.map((model) => (
                <Token
                  size="sm"
                  key={`${model.source}-${model.id}`}
                  label={model.displayName || model.id}
                  color={model.source === 'custom' ? 'blue' : 'default'}
                  onRemove={model.source === 'custom' ? () => setModels((current) => current.filter((candidate) => candidate !== model)) : undefined}
                />
              ))}
            </HStack>
          )}
          <HStack gap={2} wrap="wrap">
            <TextInput
              size="sm"
              containerXstyle={styles.formModelInput}
              label={t('providers.modelId')}
              isLabelHidden
              value={modelID}
              onChange={setModelID}
              placeholder={t('providers.customModelId')}
              isRequired
            />
            <TextInput
              size="sm"
              containerXstyle={styles.formModelNameInput}
              label={t('providers.displayName')}
              isLabelHidden
              value={modelName}
              onChange={setModelName}
              isOptional
              placeholder={t('providers.displayNameOptional')}
            />
            <Button label={t('providers.addCustomModel')} variant="secondary" size="sm" isDisabled={!modelID.trim()} onClick={addCustomModel} />
          </HStack>
        </VStack>
      </VStack>
    </>
  );
}
