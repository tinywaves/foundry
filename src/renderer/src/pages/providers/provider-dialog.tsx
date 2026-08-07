import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  fileName?: string;
}

type StoredAvatarState
  = | { status: 'none' | 'pending' | 'error' }
    | { status: 'success'; avatar: ProviderAvatar };

interface ProviderDialogProps {
  request: ProviderDialogRequest;
  onClose: () => void;
  onSaved: (runtime: ProviderRuntime) => void;
}

const STORED_AVATAR_WARNING
  = 'The stored avatar could not be loaded. Saving will preserve it unless you remove or replace it.';

function getRequestRuntime(request: ProviderDialogRequest): ProviderRuntime {
  if (request.mode === 'edit') {
    return request.provider.runtime;
  }
  return request.runtime;
}

function ProviderDialogFrame({
  request,
  content,
  formId,
  isFormReady,
  isSaving = false,
  isTesting = false,
  onClose,
  onTestConnection,
}: {
  request: ProviderDialogRequest;
  content: ReactNode;
  formId?: string;
  isFormReady: boolean;
  isSaving?: boolean;
  isTesting?: boolean;
  onClose: () => void;
  onTestConnection?: () => void;
}) {
  const runtime = getRequestRuntime(request);
  const title = request.mode === 'add' ? 'Add provider' : 'Edit provider';
  const subtitle = `${providerRuntimeLabels[runtime]} custom provider`;
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
    >
      <Layout
        header={(
          <DialogHeader
            title={title}
            subtitle={subtitle}
            onOpenChange={isSaving ? undefined : handleClose}
          />
        )}
        content={<LayoutContent isScrollable padding={6}>{content}</LayoutContent>}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} width="100%" vAlign="center">
              <Button
                label="Test connection"
                variant="secondary"
                isDisabled={!isFormReady || isSaving}
                isLoading={isTesting}
                onClick={onTestConnection}
              />
              <StackItem size="fill" />
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={isSaving}
                onClick={handleClose}
              />
              <Button
                label="Save"
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
  const runtime = getRequestRuntime(request);
  const hasStoredAvatar = request.mode === 'edit' && request.provider.hasCustomAvatar;
  const formId = useId();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const previewUrlRef = useRef<string | undefined>(undefined);
  const [values, setValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState<ProviderFormErrors>({});
  const [avatarError, setAvatarError] = useState<string>();
  const [avatarIntent, setAvatarIntent] = useState<ProviderAvatarIntent>({ kind: 'preserve' });
  const [avatarView, setAvatarView] = useState<AvatarView>({});
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
            'The Provider could not be saved.',
          )
        : await resolveProviderRequest<ProviderSummary>(
            () => globalThis.api.providers.updateProvider({
              ...input,
              id: request.provider.id,
            }),
            'The Provider could not be saved.',
          );
      if (!isMatchingCustomProvider(savedProvider, runtime)) {
        throw new ProviderRequestError('The saved Provider response was invalid.');
      }
      return savedProvider;
    },
    onSuccess: () => {
      void resetProviderList(queryClient, runtime);
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

  const showAvatar = useCallback((avatar: ProviderAvatar, fileName?: string) => {
    const url = createProviderAvatarUrl(avatar);
    revokePreviewUrl();
    previewUrlRef.current = url;
    setAvatarView({ url, fileName });
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
      return;
    }

    testConnection(validation.input, {
      onError: (error) => {
        const baseUrlError = error.apiError?.fields?.find((fieldError) => (
          fieldError.field === 'baseUrl'
        ));
        if (baseUrlError) {
          setFormErrors((current) => ({ ...current, baseUrl: baseUrlError.message }));
        }
      },
    });
  }, [isTesting, resetTestConnection, testConnection, values]);

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
        showAvatar(selection.avatar, selection.fileName);
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
      },
      onSuccess: () => {
        showToast({
          body: request.mode === 'add' ? 'Provider added' : 'Provider updated',
          uniqueID: `provider-${request.mode}-success`,
        });
        onSaved(runtime);
        onClose();
      },
    });
  }, [
    avatarIntent,
    isSaving,
    onClose,
    onSaved,
    request,
    resetSave,
    runtime,
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

  const hasAvatar = avatarIntent.kind === 'replace'
    || (hasStoredAvatar && avatarIntent.kind !== 'remove');
  const hasStoredAvatarWarning = avatarIntent.kind === 'preserve'
    && storedAvatarState.status === 'error';
  const content = (
    <VStack gap={4}>
      {generalError && (
        <Banner status="error" title="Couldn't save provider" description={generalError} />
      )}
      {connectionError && (
        <Banner status="error" title="Couldn't test connection" description={connectionError} />
      )}
      {connectionResult?.status === 'connected' && (
        <Banner
          status="success"
          title="Connection successful"
          description="The Provider endpoint accepted the connection request."
        />
      )}
      {connectionResult?.status === 'failed' && (
        <Banner
          status="error"
          title="Connection failed"
          description={connectionResult.lastError}
        />
      )}
      {hasStoredAvatarWarning && (
        <Banner status="warning" title="Avatar unavailable" description={STORED_AVATAR_WARNING} />
      )}
      <ProviderForm
        formId={formId}
        values={values}
        errors={formErrors}
        avatarUrl={avatarView.url}
        avatarFileName={avatarView.fileName}
        avatarError={avatarError}
        hasAvatar={hasAvatar}
        isDisabled={isSaving}
        isSelectingAvatar={isSelectingAvatar}
        onFieldChange={handleFieldChange}
        onSelectAvatar={handleSelectAvatar}
        onRemoveAvatar={handleRemoveAvatar}
        onSubmit={handleSave}
      />
    </VStack>
  );

  return (
    <ProviderDialogFrame
      request={request}
      content={content}
      formId={formId}
      isFormReady
      isSaving={isSaving}
      isTesting={isTesting}
      onClose={onClose}
      onTestConnection={handleTestConnection}
    />
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
            <Spinner label="Loading provider details" />
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
            title="Couldn't load provider details"
            description={detailQuery.error.message}
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
