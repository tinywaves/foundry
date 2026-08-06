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
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  CreateProviderInput,
  ProviderApiError,
  ProviderAvatar,
  ProviderConnectionSummary,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import { createProviderAvatarUrl } from './provider-avatar-url';
import {
  createProviderFormValues,
  createProviderFormValuesFromDetail,
  getProviderAvatarUpdate,
  isProviderFormField,
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

function getRequestRuntime(request: ProviderDialogRequest): ProviderRuntime {
  if (request.mode === 'add') {
    return request.runtime;
  }
  return request.provider.runtime;
}

export function ProviderDialog({
  request,
  onClose,
  onSaved,
}: {
  request: ProviderDialogRequest;
  onClose: () => void;
  onSaved: (runtime: ProviderRuntime) => void;
}) {
  const runtime = getRequestRuntime(request);
  const hasStoredAvatar = request.mode === 'edit' && request.provider.hasCustomAvatar;
  const formId = useId();
  const showToast = useToast();
  const isActiveRef = useRef(true);
  const testRevisionRef = useRef(0);
  const previewUrlRef = useRef<string | undefined>(undefined);
  const [detailRevision, setDetailRevision] = useState(0);
  const [values, setValues] = useState<ProviderFormValues | undefined>(() => (
    request.mode === 'add' ? createProviderFormValues(request.runtime) : undefined
  ));
  const [detailError, setDetailError] = useState<string>();
  const [formErrors, setFormErrors] = useState<ProviderFormErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [avatarError, setAvatarError] = useState<string>();
  const [avatarWarning, setAvatarWarning] = useState<string>();
  const [avatarIntent, setAvatarIntent] = useState<ProviderAvatarIntent>({ kind: 'preserve' });
  const [avatarView, setAvatarView] = useState<AvatarView>({});
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ProviderConnectionSummary>();
  const [connectionError, setConnectionError] = useState<string>();

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

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      testRevisionRef.current += 1;
      revokePreviewUrl();
    };
  }, [revokePreviewUrl]);

  useEffect(() => {
    if (request.mode !== 'edit') {
      return;
    }
    const provider = request.provider;
    let isCancelled = false;
    const isObsolete = () => isCancelled || !isActiveRef.current;

    async function loadAvatar() {
      if (!provider.hasCustomAvatar) {
        return;
      }
      try {
        return await globalThis.api.providers.getProviderAvatar(provider.id);
      } catch {
        // The form remains editable and surfaces the stored-avatar warning below.
      }
    }
    const avatarRequest = loadAvatar();

    async function loadDetail(): Promise<void> {
      try {
        const detailResult = await globalThis.api.providers.getProviderForEdit(provider.id);
        if (isObsolete()) {
          return;
        }
        if (!detailResult.ok) {
          setDetailError(detailResult.error.message);
          return;
        }
        if (
          detailResult.value.id !== provider.id
          || detailResult.value.runtime !== provider.runtime
          || detailResult.value.source !== 'user-custom'
        ) {
          setDetailError('The selected Provider detail did not match this row.');
          return;
        }
        setValues(createProviderFormValuesFromDetail(detailResult.value));

        const avatarResponse = await avatarRequest;
        if (isObsolete() || !provider.hasCustomAvatar) {
          return;
        }
        if (!avatarResponse?.ok || avatarResponse.value === null) {
          setAvatarWarning(
            'The stored avatar could not be loaded. Saving will preserve it unless you remove or replace it.',
          );
          return;
        }
        showAvatar(avatarResponse.value);
      } catch {
        if (!isObsolete()) {
          setDetailError('Provider details could not be loaded.');
        }
      }
    }

    void loadDetail();
    return () => {
      isCancelled = true;
    };
  }, [detailRevision, request, showAvatar]);

  const applyApiError = useCallback((error: ProviderApiError) => {
    const nextErrors: ProviderFormErrors = {};
    let nextAvatarError: string | undefined;
    let hasUnknownField = false;
    const fieldErrors = error.fields ?? [];
    for (const fieldError of fieldErrors) {
      if (isProviderFormField(fieldError.field)) {
        nextErrors[fieldError.field] = fieldError.message;
      } else if (fieldError.field === 'avatar' || fieldError.field.startsWith('avatar.')) {
        nextAvatarError = fieldError.message;
      } else {
        hasUnknownField = true;
      }
    }
    setFormErrors(nextErrors);
    setAvatarError(nextAvatarError);
    setGeneralError(
      hasUnknownField || (error.fields?.length ?? 0) === 0 ? error.message : undefined,
    );
  }, []);

  const handleFieldChange = useCallback((field: ProviderFormField, value: string) => {
    if (field === 'baseUrl' || field === 'apiKey') {
      testRevisionRef.current += 1;
      setIsTesting(false);
      setConnectionResult(undefined);
      setConnectionError(undefined);
    }
    setValues((current) => {
      if (!current) {
        return current;
      }
      return setProviderFormField(current, field, value);
    });
    setFormErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!values || isTesting) {
      return;
    }
    const validation = validateProviderConnectionForm(values);
    if (!validation.ok) {
      setFormErrors((current) => ({ ...current, ...validation.errors }));
      setConnectionResult(undefined);
      setConnectionError(undefined);
      return;
    }

    const requestRevision = ++testRevisionRef.current;
    setIsTesting(true);
    setConnectionResult(undefined);
    setConnectionError(undefined);
    try {
      const result = await globalThis.api.providers.testDraftProviderConnection(validation.input);
      if (!isActiveRef.current || requestRevision !== testRevisionRef.current) {
        return;
      }
      if (!result.ok) {
        const baseUrlError = result.error.fields?.find((fieldError) => (
          fieldError.field === 'baseUrl'
        ));
        if (baseUrlError) {
          setFormErrors((current) => ({ ...current, baseUrl: baseUrlError.message }));
        } else {
          setConnectionError(result.error.message);
        }
        return;
      }
      if (
        result.value.status === 'never-tested'
        || result.value.lastTestedAt === null
        || (result.value.status === 'connected' && result.value.lastError !== null)
        || (result.value.status === 'failed' && result.value.lastError === null)
      ) {
        setConnectionError('The connection result was invalid.');
        return;
      }
      setConnectionResult(result.value);
    } catch {
      if (isActiveRef.current && requestRevision === testRevisionRef.current) {
        setConnectionError('The connection could not be tested.');
      }
    } finally {
      if (isActiveRef.current && requestRevision === testRevisionRef.current) {
        setIsTesting(false);
      }
    }
  }, [isTesting, values]);

  const handleSelectAvatar = useCallback(async () => {
    setIsSelectingAvatar(true);
    setAvatarError(undefined);
    try {
      const result = await globalThis.api.providers.selectProviderAvatar();
      if (!isActiveRef.current) {
        return;
      }
      if (!result.ok) {
        const avatarFieldError = result.error.fields?.find((fieldError) => (
          fieldError.field === 'avatar' || fieldError.field.startsWith('avatar.')
        ));
        setAvatarError(avatarFieldError?.message ?? result.error.message);
        return;
      }
      if (result.value === null) {
        return;
      }
      showAvatar(result.value.avatar, result.value.fileName);
      setAvatarIntent({ kind: 'replace', selection: result.value });
      setAvatarWarning(undefined);
    } catch {
      if (isActiveRef.current) {
        setAvatarError('The selected avatar could not be read.');
      }
    } finally {
      if (isActiveRef.current) {
        setIsSelectingAvatar(false);
      }
    }
  }, [showAvatar]);

  const handleRemoveAvatar = useCallback(() => {
    revokePreviewUrl();
    setAvatarView({});
    setAvatarIntent(hasStoredAvatar ? { kind: 'remove' } : { kind: 'preserve' });
    setAvatarError(undefined);
    setAvatarWarning(undefined);
  }, [hasStoredAvatar, revokePreviewUrl]);

  const handleSave = useCallback(async () => {
    if (!values || isSaving) {
      return;
    }
    const validation = validateProviderForm(values);
    if (!validation.ok) {
      setFormErrors(validation.errors);
      setGeneralError(undefined);
      return;
    }

    setIsSaving(true);
    setFormErrors({});
    setGeneralError(undefined);
    setAvatarError(undefined);
    try {
      const input: CreateProviderInput = {
        ...validation.input,
        ...getProviderAvatarUpdate(avatarIntent),
      };
      const result = request.mode === 'add'
        ? await globalThis.api.providers.createProvider(input)
        : await globalThis.api.providers.updateProvider({
            ...input,
            id: request.provider.id,
          });
      if (!isActiveRef.current) {
        return;
      }
      if (!result.ok) {
        applyApiError(result.error);
        return;
      }
      if (result.value.runtime !== runtime || result.value.source !== 'user-custom') {
        setGeneralError('The saved Provider response was invalid.');
        return;
      }

      showToast({
        body: request.mode === 'add' ? 'Provider added' : 'Provider updated',
        uniqueID: `provider-${request.mode}-success`,
      });
      onSaved(runtime);
      onClose();
    } catch {
      if (isActiveRef.current) {
        setGeneralError('The Provider could not be saved.');
      }
    } finally {
      if (isActiveRef.current) {
        setIsSaving(false);
      }
    }
  }, [
    applyApiError,
    avatarIntent,
    isSaving,
    onClose,
    onSaved,
    request,
    runtime,
    showToast,
    values,
  ]);

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  const handleRetryDetail = useCallback(() => {
    setValues(undefined);
    setDetailError(undefined);
    setGeneralError(undefined);
    setAvatarError(undefined);
    setAvatarWarning(undefined);
    setAvatarIntent({ kind: 'preserve' });
    setAvatarView({});
    testRevisionRef.current += 1;
    setIsTesting(false);
    setConnectionResult(undefined);
    setConnectionError(undefined);
    revokePreviewUrl();
    setDetailRevision((current) => current + 1);
  }, [revokePreviewUrl]);

  const hasAvatar = avatarIntent.kind === 'replace'
    || (hasStoredAvatar && avatarIntent.kind !== 'remove');
  const title = request.mode === 'add' ? 'Add provider' : 'Edit provider';
  const subtitle = `${providerRuntimeLabels[runtime]} custom provider`;
  const isDetailLoading = request.mode === 'edit' && values === undefined && !detailError;

  let content;
  if (isDetailLoading) {
    content = (
      <VStack hAlign="center" padding={8}>
        <Spinner label="Loading provider details" />
      </VStack>
    );
  } else if (detailError) {
    content = (
      <Banner
        status="error"
        title="Couldn't load provider details"
        description={detailError}
        endContent={(
          <Button
            label="Retry"
            variant="ghost"
            onClick={handleRetryDetail}
          />
        )}
      />
    );
  } else if (values) {
    content = (
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
        {avatarWarning && (
          <Banner status="warning" title="Avatar unavailable" description={avatarWarning} />
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
          onSubmit={() => void handleSave()}
        />
      </VStack>
    );
  }

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
            onOpenChange={isSaving ? undefined : () => handleClose()}
          />
        )}
        content={<LayoutContent isScrollable padding={6}>{content}</LayoutContent>}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} width="100%" vAlign="center">
              <Button
                label="Test connection"
                variant="secondary"
                isDisabled={values === undefined || detailError !== undefined || isSaving}
                isLoading={isTesting}
                onClick={() => void handleTestConnection()}
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
                isDisabled={values === undefined || detailError !== undefined}
                isLoading={isSaving}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}
