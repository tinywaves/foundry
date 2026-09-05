import type {
  ClaudeApiKeyHeader,
  ClaudeModelCapability,
  ClaudeModelConfiguration,
  CreateProviderRequest,
  ProviderAvatar,
  ProviderAvatarMimeType,
  ProviderRuntime,
} from '@dhzh/foundry-api-contract';
import {
  claudeModelCapabilities,
  providerAvatarMimeTypes,
  providerRuntimes,
} from '@dhzh/foundry-api-contract';
import type { SyntheticEvent } from 'react';
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import {
  Field,
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
import { useCreateProvider } from '#/hooks/use-providers';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const runtimeLabels = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
} satisfies Record<ProviderRuntime, string>;

const capabilityLabels = {
  adaptive_thinking: 'Adaptive thinking',
  effort: 'Effort',
  interleaved_thinking: 'Interleaved thinking',
  max_effort: 'Max effort',
  thinking: 'Thinking',
  xhigh_effort: 'XHigh effort',
} satisfies Record<ClaudeModelCapability, string>;

interface CommonDraft {
  avatar: ProviderAvatar | null;
  name: string;
  officialWebsite: string;
  remark: string;
}

interface CodexDraft {
  apiKey: string;
  baseUrl: string;
  primaryModel: string;
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
  primaryModel: ClaudeModelDraft;
  sonnetModel: ClaudeModelDraft;
  subagentModel: string;
}

function createCommonDraft(): CommonDraft {
  return { avatar: null, name: '', officialWebsite: '', remark: '' };
}

function createCodexDraft(): CodexDraft {
  return { apiKey: '', baseUrl: '', primaryModel: '', reviewModel: '' };
}

function createClaudeModelDraft(): ClaudeModelDraft {
  return {
    description: '',
    displayName: '',
    model: '',
    supportedCapabilities: [],
  };
}

function createClaudeDraft(): ClaudeDraft {
  return {
    apiKey: '',
    apiKeyHeader: 'authorization',
    baseUrl: '',
    fableModel: createClaudeModelDraft(),
    haikuModel: createClaudeModelDraft(),
    opusModel: createClaudeModelDraft(),
    primaryModel: createClaudeModelDraft(),
    sonnetModel: createClaudeModelDraft(),
    subagentModel: '',
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

function readAvatar(file: File): Promise<ProviderAvatar> {
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
  required?: boolean;
  value: ClaudeModelDraft;
  onChange: (value: ClaudeModelDraft) => void;
}

function ClaudeModelFields({
  id,
  label,
  required = false,
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
            <FieldLabel htmlFor={`${id}-model`} required={required}>Model ID</FieldLabel>
            <Input
              id={`${id}-model`}
              maxLength={200}
              required={required}
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
          <FieldLabel htmlFor={`${id}-capabilities`}>Supported capabilities</FieldLabel>
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
    </FieldSet>
  );
}

export function ProviderAddPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const providerCreation = useCreateProvider();
  const [runtime, setRuntime] = useState<ProviderRuntime | null>(null);
  const [pendingRuntime, setPendingRuntime] = useState<ProviderRuntime | null>(null);
  const [common, setCommon] = useState(createCommonDraft);
  const [codex, setCodex] = useState(createCodexDraft);
  const [claude, setClaude] = useState(createClaudeDraft);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const apiKeyLabel = runtime === 'claude-code'
    && claude.apiKeyHeader === 'authorization'
    ? 'Auth Token'
    : 'API Key';
  const returnTo = typeof location.state?.returnTo === 'string'
    ? location.state.returnTo
    : '/providers?runtime=codex';
  const isDirty = JSON.stringify(common) !== JSON.stringify(createCommonDraft())
    || (runtime === 'codex'
      && JSON.stringify(codex) !== JSON.stringify(createCodexDraft()))
    || (runtime === 'claude-code'
      && JSON.stringify(claude) !== JSON.stringify(createClaudeDraft()));

  const resetFields = () => {
    setCommon(createCommonDraft());
    setCodex(createCodexDraft());
    setClaude(createClaudeDraft());
    setAvatarError(null);
    providerCreation.reset();
  };

  const changeRuntime = (nextRuntime: ProviderRuntime) => {
    resetFields();
    setRuntime(nextRuntime);
    setPendingRuntime(null);
  };

  const requestRuntimeChange = (nextRuntime: ProviderRuntime) => {
    if (nextRuntime === runtime) {
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
          primaryModel: codex.primaryModel,
          protocol: 'responses',
          reviewModel: nullableText(codex.reviewModel),
        },
        name: common.name,
        officialWebsite: nullableText(common.officialWebsite),
        remark: nullableText(common.remark),
        runtime,
      };
    } else {
      const primaryModel = toClaudeModelConfiguration(claude.primaryModel);
      if (primaryModel === null) {
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
          primaryModel,
          protocol: 'messages',
          sonnetModel: toClaudeModelConfiguration(claude.sonnetModel),
          subagentModel: nullableText(claude.subagentModel),
        },
        name: common.name,
        officialWebsite: nullableText(common.officialWebsite),
        remark: nullableText(common.remark),
        runtime,
      };
    }

    providerCreation.mutate(input, {
      onSuccess: (provider) => {
        void navigate(`/providers?runtime=${provider.runtime}`, { replace: true });
      },
    });
  };

  return (
    <main className="w-full pb-12">
      <header className="pb-5">
        <h1 className="text-xl font-semibold">Add Provider</h1>
      </header>

      <form key={runtime ?? 'unselected'} onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel required>Runtime</FieldLabel>
            <ToggleGroup
              aria-label="Runtime"
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
                  {runtimeLabels[providerRuntime]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              Choose the Runtime this Provider can be applied to.
            </FieldDescription>
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
                        <Avatar size="lg">
                          {common.avatar
                            ? (
                                <AvatarImage
                                  alt="Provider avatar preview"
                                  src={`data:${common.avatar.mimeType};base64,${common.avatar.data}`}
                                />
                              )
                            : null}
                          <AvatarFallback>{common.name.trim().charAt(0) || 'P'}</AvatarFallback>
                        </Avatar>
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
                    <FieldLabel htmlFor="provider-api-key" required={runtime === 'claude-code'}>
                      {apiKeyLabel}
                    </FieldLabel>
                    <SecretInput
                      autoComplete="off"
                      id="provider-api-key"
                      maxLength={16 * 1024}
                      required={runtime === 'claude-code'}
                      value={runtime === 'codex' ? codex.apiKey : claude.apiKey}
                      onChange={(event) => {
                        if (runtime === 'codex') {
                          setCodex({ ...codex, apiKey: event.target.value });
                        } else {
                          setClaude({ ...claude, apiKey: event.target.value });
                        }
                      }}
                    />
                    {runtime === 'codex'
                      ? (
                          <FieldDescription>
                            Leave blank only when the endpoint accepts requests without credentials.
                          </FieldDescription>
                        )
                      : null}
                  </Field>

                  {runtime === 'codex'
                    ? (
                        <>
                          <FieldSeparator>Models</FieldSeparator>
                          <Field>
                            <FieldLabel htmlFor="codex-primary-model" required>
                              Primary model
                            </FieldLabel>
                            <Input
                              id="codex-primary-model"
                              maxLength={200}
                              required
                              value={codex.primaryModel}
                              onChange={(event) => setCodex({
                                ...codex,
                                primaryModel: event.target.value,
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
                          <ClaudeModelFields
                            id="claude-primary"
                            label="Primary model"
                            required
                            value={claude.primaryModel}
                            onChange={(primaryModel) => setClaude({
                              ...claude,
                              primaryModel,
                            })}
                          />
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
                              onChange={(event) => setClaude({
                                ...claude,
                                subagentModel: event.target.value,
                              })}
                            />
                          </Field>
                        </>
                      )}

                  {providerCreation.isError
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
                    <Button disabled={providerCreation.isPending || avatarError !== null} type="submit">
                      {providerCreation.isPending
                        ? <Spinner data-icon="inline-start" />
                        : null}
                      <span>Add Provider</span>
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
