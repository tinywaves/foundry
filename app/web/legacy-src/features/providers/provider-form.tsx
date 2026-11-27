import { X, RefreshCw as ArrowPathIcon, Eye as EyeIcon, EyeOff as EyeSlashIcon, CircleHelp as QuestionMarkCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FormInput, SelectField, FieldGroup, FieldAddon, ActionPopover, IconGlyph } from '@/components/workbench';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../../lib/api';
import type { CustomModel, ProviderInput, ProviderProtocol, RemoteModel } from './types';
import { fetchModelsForInput, getProvider, providerKeys, saveProvider } from './api';
import { useI18n } from '../../i18n';
import { TitlebarActions } from '../../components/titlebar-actions';
import { ProviderAvatarField } from './provider-avatar-field';

const protocols: Array<{
  value: ProviderProtocol;
  label: string;
}> = [
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'openai-compatible-chat-completions', label: 'OpenAI-compatible Chat Completions' },
];
export default function ProviderFormPage() {
  type FormModel = (RemoteModel & {
    source: 'remote';
  }) | (CustomModel & {
    source: 'custom';
  });
  const { providerId } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isReadingAvatar, setIsReadingAvatar] = useState(false);
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
  useEffect(() => {
    if (!providerId) {
      return;
    }
    void getProvider(providerId).then((provider) => {
      if (!provider) {
        return;
      }
      setName(provider.name);
      setAvatar(provider.avatar ?? null);
      setProtocol(provider.protocol);
      setBaseURL(provider.baseURL);
      setApiKey(provider.apiKey);
      setModels(provider.customModels.map((model) => ({ ...model, source: 'custom' as const })));
    });
  }, [providerId]);
  const canFetch = Boolean(baseURL.trim() && (protocol === 'openai-compatible-chat-completions' || apiKey.trim()));
  const canSave = models.length > 0 && !isFetching && !isSaving && !isReadingAvatar && Boolean(name.trim() && baseURL.trim());
  const customModels = useMemo(() => models.filter((model): model is CustomModel & {
    source: 'custom';
  } => model.source === 'custom'), [models]);
  const fetchModels = useCallback(async () => {
    if (!canFetch) {
      return;
    }
    setIsFetching(true);
    try {
      const remote = await fetchModelsForInput({ protocol, baseURL, apiKey });
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
    const input: ProviderInput = {
      avatar,
      name: name.trim(),
      protocol,
      baseURL: baseURL.trim(),
      apiKey,
      customModels: customModels.map(({ source: _source, ...model }) => model),
    };
    try {
      await saveProvider(input, providerId);
      await queryClient.invalidateQueries({ queryKey: providerKeys.all });
      void navigate('/providers');
    } catch {
      toast({ body: t('providers.saveFailed'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [
    avatar,
    apiKey,
    baseURL,
    canSave,
    customModels,
    navigate,
    name,
    providerId,
    protocol,
    queryClient,
    t,
    toast,
  ]);
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
      <TitlebarActions>
        <div className="flex flex-row gap-2">
          <Button onClick={cancel} variant="ghost" size="sm">
            <span>{t('providers.cancel')}</span>
          </Button>
          <Button onClick={submit} variant="default" size="sm" disabled={!canSave || isSaving}>
            {isSaving && <Spinner />}
            <span>{t('providers.save')}</span>
          </Button>
        </div>
      </TitlebarActions>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <ProviderAvatarField value={avatar} onChange={setAvatar} isDisabled={isSaving} isReading={isReadingAvatar} onReadingChange={setIsReadingAvatar} />
          <div className="w-full flex flex-row flex-wrap gap-3">
            <FormInput size="sm" label={t('providers.name')} value={name} onChange={setName} isRequired className="min-w-[min(100%,14rem)] flex-[1_1_14rem]" />
            <SelectField size="sm" label={t('providers.protocol')} options={protocols} value={protocol} onChange={(value) => setProtocol(value as ProviderProtocol)} isDisabled={Boolean(providerId)} isRequired className="min-w-[min(100%,18rem)] flex-[1_1_18rem]" />
          </div>
          <FormInput size="sm" label={t('providers.baseUrl')} value={baseURL} onChange={setBaseURL} placeholder="https://api.example.com/v1" isRequired />
          <FieldGroup label={t('providers.apiKey')} size="sm" isRequired={protocol !== 'openai-compatible-chat-completions'} className="w-full">
            <FormInput size="sm" label={t('providers.apiKey')} isLabelHidden type={isApiKeyVisible ? 'text' : 'password'} value={apiKey} onChange={setApiKey} />
            <FieldAddon className="bg-background">
              <Button onClick={() => setIsApiKeyVisible((visible) => !visible)} variant="ghost" size="icon-sm" aria-label={t(isApiKeyVisible ? 'providers.hideApiKey' : 'providers.showApiKey')} title={t(isApiKeyVisible ? 'providers.hideApiKey' : 'providers.showApiKey')}>
                <span>{isApiKeyVisible ? <EyeSlashIcon /> : <EyeIcon />}</span>
              </Button>
            </FieldAddon>
          </FieldGroup>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground">{t('providers.models')}</span>
            <span className="text-xs text-muted-foreground">
              ·
              {t('providers.required')}
            </span>
            <ActionPopover
              label={t('providers.modelSources')}
              placement="below"
              alignment="start"
              isOpen={isModelHelpOpen}
              isEnabled={false}
              onOpenChange={setIsModelHelpOpen}
              content={(
                <div onMouseEnter={openModelHelp} onMouseLeave={closeModelHelp} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t('providers.modelsTemporary')}</span>
                </div>
              )}
            >
              <button type="button" aria-label={t('providers.aboutModelSources')} onMouseEnter={openModelHelp} onMouseLeave={closeModelHelp} className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <IconGlyph icon={QuestionMarkCircleIcon} className="size-4 shrink-0" />
              </button>
            </ActionPopover>
            <Button
              onClick={() => {
                void fetchModels();
              }}
              variant="ghost"
              size="icon-sm"
              disabled={!canFetch || isFetching}
              aria-label={t('providers.fetchModels')}
              title={t('providers.fetchModels')}
            >
              {isFetching && <Spinner />}
              <ArrowPathIcon />
            </Button>
          </div>
          {models.length > 0 && (
            <div className="flex flex-row flex-wrap gap-1">
              {models.map((model) => (
                <Badge key={`${model.source}-${model.id}`} variant="secondary">
                  <span>{model.displayName || model.id}</span>
                  {model.source === 'custom' && (
                    <button type="button" aria-label={`${t('providers.delete')} ${model.displayName || model.id}`} onClick={() => setModels((current) => current.filter((candidate) => candidate !== model))}>
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-row flex-wrap gap-2">
            <FormInput size="sm" label={t('providers.modelId')} isLabelHidden value={modelID} onChange={setModelID} placeholder={t('providers.customModelId')} isRequired className="min-w-[min(100%,18rem)] flex-[1_1_18rem]" />
            <FormInput size="sm" label={t('providers.displayName')} isLabelHidden value={modelName} onChange={setModelName} isOptional placeholder={t('providers.displayNameOptional')} className="min-w-[min(100%,14rem)] flex-[1_1_14rem]" />
            <Button onClick={addCustomModel} variant="secondary" size="sm" disabled={!modelID.trim()}>
              <span>{t('providers.addCustomModel')}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
