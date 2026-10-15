import type {
  ClaudeApiKeyHeader,
  ClaudeModelCapability,
  ClaudeModelConfiguration,
  CreateProviderRequest,
  Provider,
  ProviderAvatar as ProviderAvatarData,
  ProviderAvatarMimeType,
  ProviderRuntime,
  ProviderSummary,
} from '@dhzh/foundry-api-contract';
import {
  claudeModelCapabilities,
  providerAvatarMimeTypes,
  providerRuntimes,
} from '@dhzh/foundry-api-contract';
import type { SyntheticEvent } from 'react';
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';

import { CollapsibleSection } from '#/components/collapsible-section';
import { ProviderAvatar } from '#/components/provider-avatar';
import { RuntimeOption } from '#/components/runtime-option';
import { SecretInput } from '#/components/secret-input';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '#/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Spinner } from '#/components/ui/spinner';
import { Skeleton } from '#/components/ui/skeleton';
import { toast } from '#/components/ui/toast';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '#/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { Textarea } from '#/components/ui/textarea';
import {
  useCopyProvider,
  useCreateProvider,
  useProvider,
  useUpdateProvider,
} from '#/hooks/use-providers';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const capabilityLabels = {
  adaptive_thinking: 'Adaptive thinking',
  effort: 'Effort',
  interleaved_thinking: 'Interleaved thinking',
  max_effort: 'Max effort',
  thinking: 'Thinking',
  xhigh_effort: 'XHigh effort',
} satisfies Record<ClaudeModelCapability, string>;

const claudeOtherOptions = [
  {
    description: 'Remove Claude Code attribution from commits, pull requests, and session links.',
    key: 'hideAiAttribution',
    label: 'Hide AI attribution',
  },
  {
    description: 'Enable experimental agent teams for interactive sessions.',
    key: 'teammatesMode',
    label: 'Teammates mode',
  },
  {
    description: 'Discover MCP tools on demand. The configured endpoint must support tool references.',
    key: 'enableToolSearch',
    label: 'Enable tool search',
  },
  {
    description: 'Force Claude Code sessions to use the maximum available reasoning effort.',
    key: 'maxEffortThinking',
    label: 'Max effort thinking',
  },
  {
    description: 'Disable background update checks while keeping manual updates available.',
    key: 'disableAutoUpdater',
    label: 'Disable auto-updater',
  },
] as const;

interface CommonDraft {
  avatar: ProviderAvatarData | null;
  name: string;
  officialWebsite: string;
  remark: string;
}

interface CodexDraft {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  reviewModel: string;
}

interface ClaudeModelDraft {
  description: string;
  displayName: string;
  model: string;
  supportedCapabilities: ClaudeModelCapability[];
}

interface ClaudeDraft {
  apiKey: string;
  apiKeyHeader: ClaudeApiKeyHeader;
  baseUrl: string;
  fableModel: ClaudeModelDraft;
  haikuModel: ClaudeModelDraft;
  opusModel: ClaudeModelDraft;
  defaultModel: string;
  sonnetModel: ClaudeModelDraft;
  subagentModel: string;
  subagentModelForce: boolean;
  hideAiAttribution: boolean;
  teammatesMode: boolean;
  enableToolSearch: boolean;
  maxEffortThinking: boolean;
  disableAutoUpdater: boolean;
}

function createCommonDraft(provider?: Provider, isCopy = false): CommonDraft {
  return {
    avatar: provider?.avatar ?? null,
    name: provider ? `${provider.name}${isCopy ? ' Copy' : ''}` : '',
    officialWebsite: provider?.officialWebsite ?? '',
    remark: provider?.remark ?? '',
  };
}

function createCodexDraft(
  provider?: Extract<Provider, { runtime: 'codex' }>,
): CodexDraft {
  return {
    apiKey: provider?.configuration.apiKey ?? '',
    baseUrl: provider?.configuration.baseUrl ?? '',
    defaultModel: provider?.configuration.defaultModel ?? '',
    reviewModel: provider?.configuration.reviewModel ?? '',
  };
}

function createClaudeModelDraft(
  configuration?: ClaudeModelConfiguration | null,
): ClaudeModelDraft {
  return {
    description: configuration?.description ?? '',
    displayName: configuration?.displayName ?? '',
    model: configuration?.model ?? '',
    supportedCapabilities: configuration?.supportedCapabilities ?? [],
  };
}

function createClaudeDraft(
  provider?: Extract<Provider, { runtime: 'claude-code' }>,
): ClaudeDraft {
  const configuration = provider?.configuration;
  return {
    apiKey: configuration?.apiKey ?? '',
    apiKeyHeader: configuration?.apiKeyHeader ?? 'authorization',
    baseUrl: configuration?.baseUrl ?? '',
    fableModel: createClaudeModelDraft(configuration?.fableModel),
    haikuModel: createClaudeModelDraft(configuration?.haikuModel),
    opusModel: createClaudeModelDraft(configuration?.opusModel),
    defaultModel: configuration?.defaultModel ?? '',
    sonnetModel: createClaudeModelDraft(configuration?.sonnetModel),
    subagentModel: configuration?.subagentModel ?? '',
    subagentModelForce: configuration?.subagentModelForce ?? false,
    hideAiAttribution: configuration?.hideAiAttribution ?? false,
    teammatesMode: configuration?.teammatesMode ?? false,
    enableToolSearch: configuration?.enableToolSearch ?? false,
    maxEffortThinking: configuration?.maxEffortThinking ?? false,
    disableAutoUpdater: configuration?.disableAutoUpdater ?? false,
  };
}

function nullableText(value: string): string | null {
  return value.trim() || null;
}

function toClaudeModelConfiguration(
  draft: ClaudeModelDraft,
): ClaudeModelConfiguration | null {
  const model = draft.model.trim();
  return model === ''
    ? null
    : {
        description: nullableText(draft.description),
        displayName: nullableText(draft.displayName),
        model,
        supportedCapabilities: draft.supportedCapabilities,
      };
}

function readAvatar(file: File): Promise<ProviderAvatarData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('error', () => reject(new Error('Avatar could not be read.')));
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Avatar could not be read.'));
        return;
      }

      const separatorIndex = reader.result.indexOf(',');
      if (separatorIndex === -1) {
        reject(new Error('Avatar could not be read.'));
        return;
      }

      resolve({
        data: reader.result.slice(separatorIndex + 1),
        mimeType: file.type as ProviderAvatarMimeType,
      });
    });
    reader.readAsDataURL(file);
  });
}

interface ClaudeModelFieldsProps {
  id: string;
  label: string;
  value: ClaudeModelDraft;
  onChange: (value: ClaudeModelDraft) => void;
}

function ClaudeModelFields({
  id,
  label,
  value,
  onChange,
}: ClaudeModelFieldsProps) {
  const hasModel = value.model.trim() !== '';

  return (
    <FieldSet>
      <FieldLegend>{label}</FieldLegend>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-model`}>Model ID</FieldLabel>
            <Input
              id={`${id}-model`}
              maxLength={200}
              value={value.model}
              onChange={(event) => onChange({ ...value, model: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-display-name`}>Display name</FieldLabel>
            <Input
              disabled={!hasModel}
              id={`${id}-display-name`}
              maxLength={100}
              value={value.displayName}
              onChange={(event) => onChange({
                ...value,
                displayName: event.target.value,
              })}
            />
          </Field>
        </div>
        <CollapsibleSection label="Advanced model options">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
              <Textarea
                disabled={!hasModel}
                id={`${id}-description`}
                maxLength={2000}
                value={value.description}
                onChange={(event) => onChange({
                  ...value,
                  description: event.target.value,
                })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-capabilities`}>
                Supported capabilities
              </FieldLabel>
              <Select
                disabled={!hasModel}
                id={`${id}-capabilities`}
                multiple
                value={value.supportedCapabilities}
                onValueChange={(capabilities) => onChange({
                  ...value,
                  supportedCapabilities: claudeModelCapabilities.filter(
                    (capability) => capabilities.includes(capability),
                  ),
                })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => value.supportedCapabilities.length === 0
                      ? 'Select capabilities'
                      : value.supportedCapabilities
                          .map((capability) => capabilityLabels[capability])
                          .join(', ')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {claudeModelCapabilities.map((capability) => (
                      <SelectItem key={capability} value={capability}>
                        {capabilityLabels[capability]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CollapsibleSection>
      </FieldGroup>
    </FieldSet>
  );
}

type ProviderFormMode = 'add' | 'copy' | 'edit';

function ProviderForm({
  mode,
  provider,
}: {
  mode: ProviderFormMode;
  provider?: Provider;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const providerCreation = useCreateProvider();
  const providerCopy = useCopyProvider(provider?.id ?? '');
  const providerUpdate = useUpdateProvider(provider?.id ?? '');
  const isCopy = mode === 'copy';
  const isEditing = mode === 'edit';
  const codexProvider = provider?.runtime === 'codex' ? provider : undefined;
  const claudeProvider = provider?.runtime === 'claude-code' ? provider : undefined;
  const [runtime, setRuntime] = useState<ProviderRuntime | null>(provider?.runtime ?? null);
  const [pendingRuntime, setPendingRuntime] = useState<ProviderRuntime | null>(null);
  const [common, setCommon] = useState(() => createCommonDraft(provider, isCopy));
  const [codex, setCodex] = useState(() => createCodexDraft(codexProvider));
  const [claude, setClaude] = useState(() => createClaudeDraft(claudeProvider));
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const apiKeyLabel = runtime === 'claude-code'
    && claude.apiKeyHeader === 'authorization'
    ? 'Auth Token'
    : 'API Key';
  const hasSubagentModel = claude.subagentModel.trim() !== '';
  const requiresApiKey = runtime === 'claude-code';
  const returnTo = typeof location.state?.returnTo === 'string'
    ? location.state.returnTo
    : `/providers?runtime=${provider?.runtime ?? 'codex'}`;
  const isDirty = JSON.stringify(common) !== JSON.stringify(createCommonDraft(provider, isCopy))
    || (runtime === 'codex'
      && JSON.stringify(codex) !== JSON.stringify(createCodexDraft(codexProvider)))
    || (runtime === 'claude-code'
      && JSON.stringify(claude) !== JSON.stringify(createClaudeDraft(claudeProvider)));
  const isSaveError = providerCreation.isError
    || providerCopy.isError
    || providerUpdate.isError;
  const isSavePending = providerCreation.isPending
    || providerCopy.isPending
    || providerUpdate.isPending;
  let heading = 'Add Provider';
  let runtimeDescription = 'Choose the Runtime this Provider can be applied to.';
  let submitLabel = 'Add Provider';
  if (isEditing) {
    heading = 'Edit Provider';
    runtimeDescription = 'A Provider Runtime cannot be changed after creation.';
    submitLabel = 'Save Changes';
  } else if (isCopy) {
    heading = 'Create from Provider';
    runtimeDescription = 'A copy keeps the source Provider Runtime.';
    submitLabel = 'Create Provider';
  }

  const resetFields = () => {
    setCommon(createCommonDraft());
    setCodex(createCodexDraft());
    setClaude(createClaudeDraft());
    setAvatarError(null);
    providerCreation.reset();
    providerCopy.reset();
    providerUpdate.reset();
  };

  const changeRuntime = (nextRuntime: ProviderRuntime) => {
    resetFields();
    setRuntime(nextRuntime);
    setPendingRuntime(null);
  };

  const requestRuntimeChange = (nextRuntime: ProviderRuntime) => {
    if (mode !== 'add' || nextRuntime === runtime) {
      return;
    }
    if (runtime !== null && isDirty) {
      setPendingRuntime(nextRuntime);
      return;
    }
    changeRuntime(nextRuntime);
  };

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) {
      setCommon((draft) => ({ ...draft, avatar: null }));
      setAvatarError(null);
      return;
    }
    if (
      !providerAvatarMimeTypes.includes(file.type as ProviderAvatarMimeType)
      || file.size > MAX_AVATAR_BYTES
    ) {
      setCommon((draft) => ({ ...draft, avatar: null }));
      setAvatarError('Choose a PNG, JPEG, WebP, or SVG image no larger than 2 MB.');
      return;
    }

    try {
      const avatar = await readAvatar(file);
      setCommon((draft) => ({ ...draft, avatar }));
      setAvatarError(null);
    } catch {
      setCommon((draft) => ({ ...draft, avatar: null }));
      setAvatarError('The avatar could not be read.');
    }
  };

  const removeAvatar = () => {
    setCommon((draft) => ({ ...draft, avatar: null }));
    setAvatarError(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (runtime === null || avatarError !== null) {
      return;
    }

    let input: CreateProviderRequest;
    if (runtime === 'codex') {
      input = {
        avatar: common.avatar,
        configuration: {
          apiKey: codex.apiKey || null,
          baseUrl: codex.baseUrl,
          defaultModel: codex.defaultModel,
          protocol: 'responses',
          reviewModel: nullableText(codex.reviewModel),
        },
        name: common.name,
        officialWebsite: nullableText(common.officialWebsite),
        remark: nullableText(common.remark),
        runtime,
      };
    } else {
      const defaultModel = claude.defaultModel.trim();
      if (defaultModel === '') {
        return;
      }
      input = {
        avatar: common.avatar,
        configuration: {
          apiKey: claude.apiKey,
          apiKeyHeader: claude.apiKeyHeader,
          baseUrl: claude.baseUrl,
          fableModel: toClaudeModelConfiguration(claude.fableModel),
          haikuModel: toClaudeModelConfiguration(claude.haikuModel),
          opusModel: toClaudeModelConfiguration(claude.opusModel),
          defaultModel,
          protocol: 'messages',
          sonnetModel: toClaudeModelConfiguration(claude.sonnetModel),
          subagentModel: nullableText(claude.subagentModel),
          subagentModelForce: claude.subagentModelForce,
          hideAiAttribution: claude.hideAiAttribution,
          teammatesMode: claude.teammatesMode,
          enableToolSearch: claude.enableToolSearch,
          maxEffortThinking: claude.maxEffortThinking,
          disableAutoUpdater: claude.disableAutoUpdater,
        },
        name: common.name,
        officialWebsite: nullableText(common.officialWebsite),
        remark: nullableText(common.remark),
        runtime,
      };
    }

    const onSuccess = (savedProvider: ProviderSummary) => {
      if (isEditing) {
        toast.add({
          title: 'Provider updated',
          type: 'success',
        });
      } else {
        toast.add({
          title: 'Provider created',
          type: 'success',
        });
      }
      void navigate(
        mode === 'add' ? `/providers?runtime=${savedProvider.runtime}` : returnTo,
        { replace: true },
      );
    };
    if (mode === 'add') {
      providerCreation.mutate(input, { onSuccess });
      return;
    }

    if (isCopy) {
      providerCopy.mutate(input, { onSuccess });
    } else {
      providerUpdate.mutate(input, { onSuccess });
    }
  };

  return (
    <main className="w-full pb-12">
      <header className="pb-5">
        <h1 className="text-xl font-semibold">
          {heading}
        </h1>
      </header>

      <form key={runtime ?? 'unselected'} onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel required>Runtime</FieldLabel>
            <ToggleGroup
              aria-label="Runtime"
              disabled={mode !== 'add'}
              spacing={0}
              value={runtime ? [runtime] : []}
              variant="outline"
              onValueChange={(values) => {
                const [nextRuntime] = values.slice(-1);
                if (providerRuntimes.includes(nextRuntime as ProviderRuntime)) {
                  requestRuntimeChange(nextRuntime as ProviderRuntime);
                }
              }}
            >
              {providerRuntimes.map((providerRuntime) => (
                <ToggleGroupItem key={providerRuntime} value={providerRuntime}>
                  <RuntimeOption runtime={providerRuntime} />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>{runtimeDescription}</FieldDescription>
          </Field>

          {runtime === null
            ? (
                <Alert>
                  <AlertTitle>Choose a Runtime</AlertTitle>
                  <AlertDescription>
                    Provider fields appear after a Runtime is selected.
                  </AlertDescription>
                </Alert>
              )
            : (
                <>
                  <FieldSeparator>Provider</FieldSeparator>
                  <Field>
                    <FieldLabel htmlFor="provider-name" required>Name</FieldLabel>
                    <Input
                      id="provider-name"
                      maxLength={100}
                      required
                      value={common.name}
                      onChange={(event) => setCommon({
                        ...common,
                        name: event.target.value,
                      })}
                    />
                  </Field>
                  <Field data-invalid={avatarError !== null || undefined}>
                    <FieldLabel htmlFor="provider-avatar">Avatar</FieldLabel>
                    <div className="flex items-center gap-3">
                      <button
                        aria-label="Choose provider avatar"
                        className="size-10 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <ProviderAvatar
                          alt="Provider avatar preview"
                          avatar={common.avatar}
                          name={common.name}
                          size="lg"
                        />
                      </button>
                      <Button
                        disabled={common.avatar === null}
                        type="button"
                        variant="outline"
                        onClick={removeAvatar}
                      >
                        Remove avatar
                      </Button>
                      <Input
                        accept={providerAvatarMimeTypes.join(',')}
                        aria-invalid={avatarError !== null || undefined}
                        className="sr-only size-px"
                        id="provider-avatar"
                        ref={avatarInputRef}
                        type="file"
                        onChange={(event) => {
                          void handleAvatarChange(event.target.files?.[0]);
                        }}
                      />
                    </div>
                    <FieldDescription>Click the avatar to choose a PNG, JPEG, WebP, or SVG up to 2 MB.</FieldDescription>
                    <FieldError>{avatarError}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="provider-website">Official website</FieldLabel>
                    <Input
                      id="provider-website"
                      maxLength={2048}
                      placeholder="https://example.com"
                      type="url"
                      value={common.officialWebsite}
                      onChange={(event) => setCommon({
                        ...common,
                        officialWebsite: event.target.value,
                      })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="provider-remark">Remark</FieldLabel>
                    <Textarea
                      id="provider-remark"
                      maxLength={2000}
                      value={common.remark}
                      onChange={(event) => setCommon({
                        ...common,
                        remark: event.target.value,
                      })}
                    />
                  </Field>

                  <FieldSeparator>Connection</FieldSeparator>
                  <Field>
                    <FieldLabel htmlFor="provider-protocol">Protocol</FieldLabel>
                    <Input
                      id="provider-protocol"
                      readOnly
                      value={runtime === 'codex' ? 'Responses API' : 'Anthropic Messages API'}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="provider-base-url" required>Base URL</FieldLabel>
                    <Input
                      id="provider-base-url"
                      maxLength={2048}
                      placeholder={runtime === 'codex'
                        ? 'https://example.com/v1'
                        : 'https://example.com'}
                      required
                      type="url"
                      value={runtime === 'codex' ? codex.baseUrl : claude.baseUrl}
                      onChange={(event) => {
                        if (runtime === 'codex') {
                          setCodex({ ...codex, baseUrl: event.target.value });
                        } else {
                          setClaude({ ...claude, baseUrl: event.target.value });
                        }
                      }}
                    />
                  </Field>
                  {runtime === 'claude-code'
                    ? (
                        <Field>
                          <FieldLabel required>Authentication method</FieldLabel>
                          <ToggleGroup
                            aria-label="Authentication method"
                            spacing={0}
                            value={[claude.apiKeyHeader]}
                            variant="outline"
                            onValueChange={(values) => {
                              const [apiKeyHeader] = values.slice(-1);
                              if (apiKeyHeader === 'authorization' || apiKeyHeader === 'x-api-key') {
                                setClaude({ ...claude, apiKeyHeader });
                              }
                            }}
                          >
                            <Tooltip>
                              <TooltipTrigger
                                render={<ToggleGroupItem value="authorization" />}
                              >
                                Auth Token
                              </TooltipTrigger>
                              <TooltipContent>
                                <code className="font-mono">
                                  {'Authorization: Bearer <xxx>'}
                                </code>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={<ToggleGroupItem value="x-api-key" />}
                              >
                                API Key
                              </TooltipTrigger>
                              <TooltipContent>
                                <code className="font-mono">{'X-Api-Key: <xxx>'}</code>
                              </TooltipContent>
                            </Tooltip>
                          </ToggleGroup>
                        </Field>
                      )
                    : null}
                  <Field>
                    <FieldLabel
                      htmlFor="provider-api-key"
                      required={requiresApiKey}
                    >
                      {apiKeyLabel}
                    </FieldLabel>
                    <SecretInput
                      autoComplete="off"
                      id="provider-api-key"
                      maxLength={16 * 1024}
                      required={requiresApiKey}
                      value={runtime === 'codex' ? codex.apiKey : claude.apiKey}
                      onChange={(event) => {
                        if (runtime === 'codex') {
                          setCodex({ ...codex, apiKey: event.target.value });
                        } else {
                          setClaude({ ...claude, apiKey: event.target.value });
                        }
                      }}
                    />
                    {runtime === 'codex' && (
                      <FieldDescription>
                        Leave blank only when the endpoint accepts requests without credentials.
                      </FieldDescription>
                    )}
                  </Field>

                  {runtime === 'codex'
                    ? (
                        <>
                          <FieldSeparator>Models</FieldSeparator>
                          <Field>
                            <FieldLabel htmlFor="codex-default-model" required>
                              Default model
                            </FieldLabel>
                            <Input
                              id="codex-default-model"
                              maxLength={200}
                              required
                              value={codex.defaultModel}
                              onChange={(event) => setCodex({
                                ...codex,
                                defaultModel: event.target.value,
                              })}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="codex-review-model">Review model</FieldLabel>
                            <Input
                              id="codex-review-model"
                              maxLength={200}
                              value={codex.reviewModel}
                              onChange={(event) => setCodex({
                                ...codex,
                                reviewModel: event.target.value,
                              })}
                            />
                          </Field>
                        </>
                      )
                    : (
                        <>
                          <FieldSeparator>Models</FieldSeparator>
                          <Field>
                            <FieldLabel htmlFor="claude-default-model" required>
                              Default model
                            </FieldLabel>
                            <Input
                              id="claude-default-model"
                              maxLength={200}
                              required
                              value={claude.defaultModel}
                              onChange={(event) => setClaude({
                                ...claude,
                                defaultModel: event.target.value,
                              })}
                            />
                          </Field>
                          {([
                            ['opusModel', 'Opus model'],
                            ['sonnetModel', 'Sonnet model'],
                            ['haikuModel', 'Haiku model'],
                            ['fableModel', 'Fable model'],
                          ] as const).map(([key, label]) => (
                            <ClaudeModelFields
                              id={`claude-${key}`}
                              key={key}
                              label={label}
                              value={claude[key]}
                              onChange={(value) => setClaude({
                                ...claude,
                                [key]: value,
                              })}
                            />
                          ))}
                          <Field>
                            <FieldLabel htmlFor="claude-subagent-model">Subagent model</FieldLabel>
                            <Input
                              id="claude-subagent-model"
                              maxLength={200}
                              value={claude.subagentModel}
                              onChange={(event) => {
                                const subagentModel = event.target.value;
                                setClaude({
                                  ...claude,
                                  subagentModel,
                                  subagentModelForce: subagentModel.trim() === ''
                                    ? false
                                    : claude.subagentModelForce,
                                });
                              }}
                            />
                          </Field>
                          <Field data-disabled={!hasSubagentModel} orientation="horizontal">
                            <Checkbox
                              checked={claude.subagentModelForce}
                              disabled={!hasSubagentModel}
                              id="claude-subagent-model-force"
                              onCheckedChange={(subagentModelForce) => setClaude({
                                ...claude,
                                subagentModelForce,
                              })}
                            />
                            <FieldContent>
                              <FieldLabel htmlFor="claude-subagent-model-force">
                                Force subagent model
                              </FieldLabel>
                              <FieldDescription>
                                Force Claude Code to use the configured subagent model.
                              </FieldDescription>
                            </FieldContent>
                          </Field>
                          <FieldSeparator>Others</FieldSeparator>
                          <FieldSet>
                            <FieldLegend className="sr-only">
                              Other Claude Code options
                            </FieldLegend>
                            <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {claudeOtherOptions.map((option) => {
                                const id = `claude-${option.key}`;
                                return (
                                  <Field className="min-w-0" key={option.key} orientation="horizontal">
                                    <Checkbox
                                      checked={claude[option.key]}
                                      id={id}
                                      onCheckedChange={(checked) => setClaude({
                                        ...claude,
                                        [option.key]: checked,
                                      })}
                                    />
                                    <FieldContent className="min-w-0">
                                      <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
                                      <FieldDescription>{option.description}</FieldDescription>
                                    </FieldContent>
                                  </Field>
                                );
                              })}
                            </FieldGroup>
                          </FieldSet>
                        </>
                      )}

                  {isSaveError
                    ? (
                        <Alert variant="destructive">
                          <AlertTitle>Provider was not saved</AlertTitle>
                          <AlertDescription>
                            Check the fields and Foundry Server, then try again.
                          </AlertDescription>
                        </Alert>
                      )
                    : null}

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      nativeButton={false}
                      render={<Link to={returnTo} replace />}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button disabled={isSavePending || avatarError !== null} type="submit">
                      {isSavePending
                        ? <Spinner data-icon="inline-start" />
                        : null}
                      <span>{submitLabel}</span>
                    </Button>
                  </div>
                </>
              )}
        </FieldGroup>
      </form>

      <AlertDialog
        open={pendingRuntime !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRuntime(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Runtime?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the Runtime will clear the information you&apos;ve entered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRuntime) {
                  changeRuntime(pendingRuntime);
                }
              }}
            >
              Change Runtime
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export function ProviderAddPage() {
  return <ProviderForm mode="add" />;
}

function ExistingProviderForm({ mode }: { mode: 'copy' | 'edit' }) {
  const { providerId = '' } = useParams();
  const provider = useProvider(providerId);

  if (provider.isPending) {
    return (
      <main className="w-full" aria-label="Loading Provider" role="status">
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }
  if (provider.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Provider could not be loaded</AlertTitle>
        <AlertDescription>{provider.error.message}</AlertDescription>
      </Alert>
    );
  }

  return <ProviderForm mode={mode} provider={provider.data} />;
}

export function ProviderCopyPage() {
  return <ExistingProviderForm mode="copy" />;
}

export function ProviderEditPage() {
  return <ExistingProviderForm mode="edit" />;
}
