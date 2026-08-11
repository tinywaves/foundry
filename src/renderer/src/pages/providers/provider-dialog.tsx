import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Code } from '@astryxdesign/core/Code';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
} from '@astryxdesign/core/Layout';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  CreateProviderInput,
  ProviderAvatar,
  ProviderAvatarSelection,
  ProviderConnectionSummary,
  ProviderConnectionTestInput,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import { createProviderAvatarUrl } from './provider-avatar-url';
import {
  createProviderFormValues,
  createProviderFormValuesFromDetail,
  getProviderAvatarUpdate,
  getProviderFormApiErrorState,
  hasProviderFormChanges,
  isValidProviderConnectionSummary,
  setProviderFormField,
  validateProviderConnectionForm,
  validateProviderForm,
} from './provider-form-model';
import type {
  ProviderAvatarIntent,
  ProviderFormErrors,
  ProviderFormField,
  ProviderFormValues,
} from './provider-form-model';
import { ProviderForm } from './provider-form';
import {
  getProviderAvatarQueryOptions,
  getProviderDetailQueryOptions,
  isMatchingCustomProvider,
  ProviderRequestError,
  removeProviderDetail,
  resetProviderDetail,
  resetProviderList,
  resolveProviderRequest,
} from './provider-query';
import { providerRuntimeLabels } from './provider-runtime';

export type ProviderDialogRequest
  = | {
    key: number;
    mode: 'add';
    runtime: ProviderRuntime;
  }
  | {
    key: number;
    mode: 'edit';
    provider: ProviderSummary;
  };

interface AvatarView {
  url?: string;
}

type StoredAvatarState
  = | { status: 'none' | 'pending' | 'error' }
    | { status: 'success'; avatar: ProviderAvatar };

interface ProviderDialogProps {
  request: ProviderDialogRequest;
  onClose: () => void;
  onSaved: (runtime: ProviderRuntime) => void;
}

interface ConnectionTestFeedback {
  variant: 'success' | 'error';
  message: string;
}

const STORED_AVATAR_WARNING
  = 'The stored avatar could not be loaded. Saving will preserve it unless you remove or replace it.';

function getRequestRuntime(request: ProviderDialogRequest): ProviderRuntime {
  if (request.mode === 'edit') {
    return request.provider.runtime;
  }
  return request.runtime;
}

function getConnectionTestFeedback(
  result: ProviderConnectionSummary | undefined,
  error: string | undefined,
): ConnectionTestFeedback | undefined {
  if (error !== undefined) {
    return { variant: 'error', message: `Connection test failed: ${error}` };
  }
  if (result?.status === 'connected') {
    return { variant: 'success', message: 'Connection successful' };
  }
  if (result?.status === 'failed') {
    return {
      variant: 'error',
      message: `Connection failed: ${result.lastError ?? 'Unknown error'}`,
    };
  }
  return undefined;
}

function ConnectionTestMethod({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <VStack gap={1.5} maxWidth="min(48ch, 80vw)">
      {runtime === 'codex'
        ? (
            <Text type="body" display="block" textWrap="pretty">
              {'Sends a '}
              <Code>GET</Code>
              {' request to '}
              <Code>/models</Code>
              {'. When provided, the API key is sent as '}
              <Code>Authorization: Bearer &lt;API key&gt;</Code>
              .
            </Text>
          )
        : (
            <Text type="body" display="block" textWrap="pretty">
              {'Sends a '}
              <Code>GET</Code>
              {' request to '}
              <Code>/v1/models</Code>
              {', or '}
              <Code>/models</Code>
              {' when the Base URL ends in '}
              <Code>/v1</Code>
              {'. Authentication uses '}
              <Code>x-api-key</Code>
              {' and '}
              <Code>anthropic-version: 2023-06-01</Code>
              .
            </Text>
          )}
      <Text type="supporting" display="block" textWrap="pretty">
        {'Any '}
        <Code>2xx</Code>
        {' response passes. Redirects fail. Timeout: '}
        <Code>15s</Code>
        .
      </Text>
    </VStack>
  );
}

function focusFirstFormError(formId: string, errors: ProviderFormErrors): void {
  const fields = Object.keys(errors) as ProviderFormField[];
  if (fields.length === 0) {
    return;
  }
  const field = fields[0];
  queueMicrotask(() => {
    const form = document.getElementById(formId);
    form?.querySelector<HTMLElement>(`[name="${CSS.escape(field)}"]`)?.focus();
  });
}

function ProviderDialogFrame({
  request,
  activeRuntime,
  content,
  formId,
  isFormReady,
  isSaving = false,
  isTesting = false,
  connectionFeedback,
  onClose,
  onTestConnection,
}: {
  request: ProviderDialogRequest;
  activeRuntime?: ProviderRuntime;
  content: ReactNode;
  formId?: string;
  isFormReady: boolean;
  isSaving?: boolean;
  isTesting?: boolean;
  connectionFeedback?: ConnectionTestFeedback;
  onClose: () => void;
  onTestConnection?: () => void;
}) {
  const title = request.mode === 'add' ? 'Add Provider' : 'Edit Provider';
  const titleId = useId();
  const saveLabel = request.mode === 'add' ? 'Add Provider' : 'Save Changes';
  const runtime = activeRuntime ?? getRequestRuntime(request);
  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}
      purpose={isSaving ? 'required' : 'form'}
      width={720}
      maxHeight="85vh"
      aria-labelledby={titleId}
    >
      <Layout
        header={(
          <LayoutHeader hasDivider>
            <HStack gap={3} hAlign="between" vAlign="center">
              <Heading
                id={titleId}
                level={3}
                accessibilityLevel={2}
                maxLines={1}
                tabIndex={-1}
                data-autofocus
              >
                {title}
              </Heading>
              {!isSaving && (
                <IconButton
                  label="Close Provider Dialog"
                  tooltip="Close"
                  icon={<Icon icon={X} size="sm" color="inherit" />}
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                />
              )}
            </HStack>
          </LayoutHeader>
        )}
        content={<LayoutContent isScrollable>{content}</LayoutContent>}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} width="100%" vAlign="center">
              <HoverCard
                placement="above"
                alignment="start"
                focusTrigger="always"
                hasHoverIndication={false}
                label="Connection test method"
                content={<ConnectionTestMethod runtime={runtime} />}
              >
                <Button
                  label="Test Connection"
                  variant="secondary"
                  isDisabled={!isFormReady || isSaving}
                  isLoading={isTesting}
                  onClick={onTestConnection}
                />
              </HoverCard>
              {connectionFeedback && (
                <StatusDot
                  variant={connectionFeedback.variant}
                  label={connectionFeedback.message}
                />
              )}
              <StackItem size="fill">
                {connectionFeedback && (
                  <Text type="supporting" maxLines={1} hasTruncateTooltip>
                    {connectionFeedback.message}
                  </Text>
                )}
              </StackItem>
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={isSaving}
                onClick={handleClose}
              />
              <Button
                label={saveLabel}
                variant="primary"
                type="submit"
                form={formId}
                isDisabled={!isFormReady}
                isLoading={isSaving}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function ProviderDialogFormSession({
  request,
  initialValues,
  storedAvatarState,
  onClose,
  onSaved,
}: ProviderDialogProps & {
  initialValues: ProviderFormValues;
  storedAvatarState: StoredAvatarState;
}) {
  const hasStoredAvatar = request.mode === 'edit' && request.provider.hasCustomAvatar;
  const formId = useId();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const previewUrlRef = useRef<string | undefined>(undefined);
  const [runtime, setRuntime] = useState(() => getRequestRuntime(request));
  const [initialValuesSnapshot, setInitialValuesSnapshot] = useState(() => initialValues);
  const [values, setValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState<ProviderFormErrors>({});
  const [avatarError, setAvatarError] = useState<string>();
  const [avatarIntent, setAvatarIntent] = useState<ProviderAvatarIntent>({ kind: 'preserve' });
  const [avatarView, setAvatarView] = useState<AvatarView>({});
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] = useState(false);
  const [pendingRuntime, setPendingRuntime] = useState<ProviderRuntime>();
  const {
    error: saveError,
    isPending: isSaving,
    mutate: saveProvider,
    reset: resetSave,
  } = useMutation<ProviderSummary, ProviderRequestError, CreateProviderInput>({
    mutationFn: async (input) => {
      const savedProvider = request.mode === 'add'
        ? await resolveProviderRequest<ProviderSummary>(
            () => globalThis.api.providers.createProvider(input),
            'The provider could not be saved.',
          )
        : await resolveProviderRequest<ProviderSummary>(
            () => globalThis.api.providers.updateProvider({
              ...input,
              id: request.provider.id,
            }),
            'The provider could not be saved.',
          );
      if (!isMatchingCustomProvider(savedProvider, input.runtime)) {
        throw new ProviderRequestError('The saved provider response was invalid.');
      }
      return savedProvider;
    },
    onSuccess: (_, input) => {
      void resetProviderList(queryClient, input.runtime);
    },
  });
  const {
    data: connectionResult,
    error: testError,
    isPending: isTesting,
    mutate: testConnection,
    reset: resetTestConnection,
  } = useMutation<
    ProviderConnectionSummary,
    ProviderRequestError,
    ProviderConnectionTestInput
  >({
    mutationFn: async (input) => {
      const connection = await resolveProviderRequest<ProviderConnectionSummary>(
        () => globalThis.api.providers.testDraftProviderConnection(input),
        'The connection could not be tested.',
      );
      if (!isValidProviderConnectionSummary(connection)) {
        throw new ProviderRequestError('The connection result was invalid.');
      }
      return connection;
    },
  });
  const {
    isPending: isSelectingAvatar,
    mutate: selectAvatar,
    reset: resetSelectAvatar,
  } = useMutation<ProviderAvatarSelection | null, ProviderRequestError>({
    mutationFn: () => resolveProviderRequest(
      () => globalThis.api.providers.selectProviderAvatar(),
      'The selected avatar could not be read.',
    ),
  });

  const revokePreviewUrl = useCallback(() => {
    if (!previewUrlRef.current) {
      return;
    }
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = undefined;
  }, []);

  const showAvatar = useCallback((avatar: ProviderAvatar) => {
    const url = createProviderAvatarUrl(avatar);
    revokePreviewUrl();
    previewUrlRef.current = url;
    setAvatarView({ url });
  }, [revokePreviewUrl]);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const storedAvatar = storedAvatarState.status === 'success'
    ? storedAvatarState.avatar
    : undefined;
  useEffect(() => {
    if (storedAvatar === undefined || avatarIntent.kind !== 'preserve') {
      return;
    }
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) {
        showAvatar(storedAvatar);
      }
    });
    return () => {
      isActive = false;
    };
  }, [avatarIntent.kind, showAvatar, storedAvatar]);

  const handleFieldChange = useCallback((field: ProviderFormField, value: string) => {
    if (field === 'baseUrl' || field === 'apiKey') {
      resetTestConnection();
    }
    setValues((current) => setProviderFormField(current, field, value));
    setFormErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, [resetTestConnection]);

  const handleTestConnection = useCallback(() => {
    if (isTesting) {
      return;
    }
    const validation = validateProviderConnectionForm(values);
    if (!validation.ok) {
      resetTestConnection();
      setFormErrors((current) => ({ ...current, ...validation.errors }));
      focusFirstFormError(formId, validation.errors);
      return;
    }

    testConnection(validation.input, {
      onError: (error) => {
        const baseUrlError = error.apiError?.fields?.find((fieldError) => (
          fieldError.field === 'baseUrl'
        ));
        if (baseUrlError) {
          const nextErrors = { baseUrl: baseUrlError.message };
          setFormErrors((current) => ({ ...current, ...nextErrors }));
          focusFirstFormError(formId, nextErrors);
        }
      },
    });
  }, [formId, isTesting, resetTestConnection, testConnection, values]);

  const handleSelectAvatar = useCallback(() => {
    if (isSelectingAvatar) {
      return;
    }
    setAvatarError(undefined);
    selectAvatar(undefined, {
      onError: (error) => {
        const avatarFieldError = error.apiError?.fields?.find((fieldError) => (
          fieldError.field === 'avatar' || fieldError.field.startsWith('avatar.')
        ));
        setAvatarError(avatarFieldError?.message ?? error.message);
      },
      onSuccess: (selection) => {
        if (selection === null) {
          return;
        }
        showAvatar(selection.avatar);
        setAvatarIntent({ kind: 'replace', selection });
      },
    });
  }, [isSelectingAvatar, selectAvatar, showAvatar]);

  const handleRemoveAvatar = useCallback(() => {
    revokePreviewUrl();
    setAvatarView({});
    setAvatarIntent(hasStoredAvatar ? { kind: 'remove' } : { kind: 'preserve' });
    setAvatarError(undefined);
  }, [hasStoredAvatar, revokePreviewUrl]);

  const handleSave = useCallback(() => {
    if (isSaving) {
      return;
    }
    const validation = validateProviderForm(values);
    if (!validation.ok) {
      resetSave();
      setFormErrors(validation.errors);
      focusFirstFormError(formId, validation.errors);
      return;
    }

    setFormErrors({});
    setAvatarError(undefined);
    const input: CreateProviderInput = {
      ...validation.input,
      ...getProviderAvatarUpdate(avatarIntent),
    };
    saveProvider(input, {
      onError: (error) => {
        if (error.apiError === undefined) {
          return;
        }
        const errorState = getProviderFormApiErrorState(error.apiError);
        setFormErrors(errorState.formErrors);
        setAvatarError(errorState.avatarError);
        focusFirstFormError(formId, errorState.formErrors);
      },
      onSuccess: (savedProvider) => {
        showToast({
          body: request.mode === 'add' ? 'Provider added' : 'Provider updated',
          uniqueID: `provider-${request.mode}-success`,
        });
        onSaved(savedProvider.runtime);
        onClose();
      },
    });
  }, [
    avatarIntent,
    formId,
    isSaving,
    onClose,
    onSaved,
    request,
    resetSave,
    saveProvider,
    showToast,
    values,
  ]);

  const saveApiErrorState = saveError?.apiError === undefined
    ? undefined
    : getProviderFormApiErrorState(saveError.apiError);
  const generalError = saveError === null
    ? undefined
    : saveApiErrorState?.generalError
      ?? (saveError.apiError === undefined ? saveError.message : undefined);
  const baseUrlTestError = testError?.apiError?.fields?.find((fieldError) => (
    fieldError.field === 'baseUrl'
  ));
  const connectionError = testError !== null && baseUrlTestError === undefined
    ? testError.message
    : undefined;
  const connectionFeedback = isTesting
    ? undefined
    : getConnectionTestFeedback(connectionResult, connectionError);

  const hasAvatar = avatarIntent.kind === 'replace'
    || (hasStoredAvatar && avatarIntent.kind !== 'remove');
  const hasStoredAvatarWarning = avatarIntent.kind === 'preserve'
    && storedAvatarState.status === 'error';
  const hasUnsavedChanges = hasProviderFormChanges(
    values,
    initialValuesSnapshot,
    avatarIntent,
  );
  const applyRuntimeChange = useCallback((nextRuntime: ProviderRuntime) => {
    if (request.mode !== 'add' || nextRuntime === runtime) {
      return;
    }
    const nextValues = createProviderFormValues(nextRuntime);
    revokePreviewUrl();
    resetSave();
    resetTestConnection();
    resetSelectAvatar();
    setRuntime(nextRuntime);
    setInitialValuesSnapshot(nextValues);
    setValues(nextValues);
    setFormErrors({});
    setAvatarError(undefined);
    setAvatarIntent({ kind: 'preserve' });
    setAvatarView({});
    setPendingRuntime(undefined);
  }, [
    request.mode,
    resetSave,
    resetSelectAvatar,
    resetTestConnection,
    revokePreviewUrl,
    runtime,
  ]);
  const requestRuntimeChange = useCallback((nextRuntime: ProviderRuntime) => {
    if (
      request.mode !== 'add'
      || nextRuntime === runtime
      || isSaving
      || isTesting
    ) {
      return;
    }
    if (hasUnsavedChanges) {
      setPendingRuntime(nextRuntime);
      return;
    }
    applyRuntimeChange(nextRuntime);
  }, [
    applyRuntimeChange,
    hasUnsavedChanges,
    isSaving,
    isTesting,
    request.mode,
    runtime,
  ]);
  const confirmRuntimeChange = useCallback(() => {
    if (pendingRuntime === undefined) {
      return;
    }
    applyRuntimeChange(pendingRuntime);
  }, [applyRuntimeChange, pendingRuntime]);
  let runtimeChangeDisabledMessage: string | undefined;
  if (isTesting) {
    runtimeChangeDisabledMessage
      = 'Wait for the connection test to finish before switching runtime.';
  } else if (isSaving) {
    runtimeChangeDisabledMessage
      = 'Wait for the provider to finish saving before switching runtime.';
  }
  const requestClose = () => {
    if (hasUnsavedChanges) {
      setIsDiscardConfirmationOpen(true);
      return;
    }
    onClose();
  };
  const content = (
    <VStack gap={4}>
      {generalError && (
        <Banner status="error" title="Couldn't Save Provider" description={generalError} />
      )}
      {hasStoredAvatarWarning && (
        <Banner status="warning" title="Avatar Unavailable" description={STORED_AVATAR_WARNING} />
      )}
      <ProviderForm
        formId={formId}
        values={values}
        errors={formErrors}
        avatarUrl={avatarView.url}
        avatarError={avatarError}
        hasAvatar={hasAvatar}
        isDisabled={isSaving}
        isSelectingAvatar={isSelectingAvatar}
        isRuntimeChangeDisabled={isSaving || isTesting}
        runtimeChangeDisabledMessage={runtimeChangeDisabledMessage}
        onFieldChange={handleFieldChange}
        onRuntimeChange={request.mode === 'add' ? requestRuntimeChange : undefined}
        onSelectAvatar={handleSelectAvatar}
        onRemoveAvatar={handleRemoveAvatar}
        onSubmit={handleSave}
      />
    </VStack>
  );

  return (
    <>
      <ProviderDialogFrame
        request={request}
        activeRuntime={runtime}
        content={content}
        formId={formId}
        isFormReady
        isSaving={isSaving}
        isTesting={isTesting}
        connectionFeedback={connectionFeedback}
        onClose={requestClose}
        onTestConnection={handleTestConnection}
      />
      <AlertDialog
        isOpen={isDiscardConfirmationOpen}
        onOpenChange={setIsDiscardConfirmationOpen}
        title="Discard Changes?"
        description="Your unsaved provider changes will be lost."
        actionLabel="Discard Changes"
        actionVariant="destructive"
        onAction={onClose}
      />
      {pendingRuntime && (
        <AlertDialog
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setPendingRuntime(undefined);
            }
          }}
          title="Switch Runtime?"
          description={`Switching to ${providerRuntimeLabels[pendingRuntime]} will clear the current Provider details.`}
          actionLabel={`Switch to ${providerRuntimeLabels[pendingRuntime]}`}
          actionVariant="destructive"
          onAction={confirmRuntimeChange}
        />
      )}
    </>
  );
}

function EditProviderDialog({ request, onClose, onSaved }: ProviderDialogProps & {
  request: Extract<ProviderDialogRequest, { mode: 'edit' }>;
}) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery(getProviderDetailQueryOptions(request.provider));
  const avatarQuery = useQuery({
    ...getProviderAvatarQueryOptions(request.provider.runtime, request.provider.id),
    enabled: request.provider.hasCustomAvatar,
  });
  const handleClose = useCallback(() => {
    removeProviderDetail(queryClient, request.provider.runtime, request.provider.id);
    onClose();
  }, [onClose, queryClient, request.provider.id, request.provider.runtime]);
  const handleRetry = useCallback(() => {
    void resetProviderDetail(queryClient, request.provider);
  }, [queryClient, request.provider]);

  if (detailQuery.isPending) {
    return (
      <ProviderDialogFrame
        request={request}
        content={(
          <VStack hAlign="center" padding={8}>
            <Spinner label="Loading provider details…" />
          </VStack>
        )}
        isFormReady={false}
        onClose={handleClose}
      />
    );
  }
  if (detailQuery.isError) {
    return (
      <ProviderDialogFrame
        request={request}
        content={(
          <Banner
            status="error"
            title="Couldn't Load Provider Details"
            description={`${detailQuery.error.message} Retry to load this provider.`}
            endContent={<Button label="Retry" variant="ghost" onClick={handleRetry} />}
          />
        )}
        isFormReady={false}
        onClose={handleClose}
      />
    );
  }

  let storedAvatarState: StoredAvatarState = { status: 'none' };
  if (request.provider.hasCustomAvatar) {
    if (avatarQuery.isPending) {
      storedAvatarState = { status: 'pending' };
    } else if (avatarQuery.isError || avatarQuery.data === null) {
      storedAvatarState = { status: 'error' };
    } else {
      storedAvatarState = { status: 'success', avatar: avatarQuery.data };
    }
  }

  return (
    <ProviderDialogFormSession
      key={request.key}
      request={request}
      initialValues={createProviderFormValuesFromDetail(detailQuery.data)}
      storedAvatarState={storedAvatarState}
      onClose={handleClose}
      onSaved={onSaved}
    />
  );
}

export function ProviderDialog(props: ProviderDialogProps) {
  if (props.request.mode === 'edit') {
    return <EditProviderDialog {...props} request={props.request} />;
  }
  return (
    <ProviderDialogFormSession
      {...props}
      initialValues={createProviderFormValues(props.request.runtime)}
      storedAvatarState={{ status: 'none' }}
    />
  );
}
