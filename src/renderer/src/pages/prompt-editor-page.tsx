import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { typographyVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, History, RotateCcw } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import type {
  CreatePromptInput,
  PromptDetail,
  PromptVersionDetail,
  PromptVersionTarget,
} from '../../../shared/prompt-contract';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';
import {
  createPromptFormValues,
  getPromptFormApiErrorState,
  hasPromptFormChanges,
  setPromptFormField,
  validatePromptForm,
} from './prompts/prompt-form-model';
import type {
  PromptFormErrors,
  PromptFormField,
  PromptFormValues,
} from './prompts/prompt-form-model';
import { PromptPageLoading } from './prompts/prompt-page-loading';
import { PromptHistoryPanel } from './prompts/prompt-history-panel';
import { getPromptVersionSelectionAction } from './prompts/prompt-history-model';
import {
  getPromptVersionQueryOptions,
  PromptRequestError,
  resolvePromptRequest,
  updatePromptCaches,
} from './prompts/prompt-query';
import { PromptVersionContent } from './prompts/prompt-version-content';
import { usePromptCopy } from './prompts/use-prompt-copy';
import { usePromptDetail } from './prompts/use-prompt-detail';

const styles = stylex.create({
  form: {
    minWidth: 0,
    minHeight: 0,
  },
  contentInput: {
    fontFamily: typographyVars['--font-family-code'],
  },
});

interface PromptEditorProps {
  initialDetail?: PromptDetail;
}

function getErrorStatus(message: string | undefined) {
  return message ? { type: 'error' as const, message } : undefined;
}

function PromptEditor({ initialDetail }: PromptEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { copyPromptVersion, isCopyingVersion } = usePromptCopy();
  const [currentDetail, setCurrentDetail] = useState(initialDetail);
  const [baselineValues, setBaselineValues] = useState(() => (
    createPromptFormValues(initialDetail)
  ));
  const [values, setValues] = useState<PromptFormValues>(baselineValues);
  const [errors, setErrors] = useState<PromptFormErrors>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionDetail>();
  const [pendingVersion, setPendingVersion] = useState<number>();
  const [discardVersion, setDiscardVersion] = useState<number>();
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const allowNavigationRef = useRef(false);
  const versionRequestIdRef = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const isEditing = currentDetail !== undefined;
  const isDirty = hasPromptFormChanges(values, baselineValues);
  const destination = currentDetail
    ? routePaths.agentExtensionsPrompt(currentDetail.id)
    : routePaths.agentExtensionsPrompts;

  useEffect(() => () => {
    versionRequestIdRef.current += 1;
  }, []);

  const shouldBlock = useCallback(() => (
    isDirty && !allowNavigationRef.current
  ), [isDirty]);
  const blocker = useBlocker(shouldBlock);

  async function savePrompt(input: CreatePromptInput): Promise<PromptDetail> {
    if (currentDetail) {
      return resolvePromptRequest<PromptDetail>(
        () => globalThis.api.prompts.updatePrompt({
          id: currentDetail.id,
          ...input,
        }),
        'Prompt could not be saved.',
      );
    }
    return resolvePromptRequest<PromptDetail>(
      () => globalThis.api.prompts.createPrompt(input),
      'Prompt could not be created.',
    );
  }

  const saveMutation = useMutation<PromptDetail, Error, CreatePromptInput>({
    mutationFn: savePrompt,
    retry: false,
    onSuccess: (prompt) => {
      updatePromptCaches(queryClient, prompt);
      showToast({
        body: isEditing ? 'Prompt saved' : 'Prompt created',
        uniqueID: `prompt-save-success-${prompt.id}`,
      });
    },
    onError: (error) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-save-error-${currentDetail?.id ?? 'new'}`,
      });
    },
  });

  const restoreMutation = useMutation<PromptDetail, Error, PromptVersionTarget>({
    mutationFn: (target) => resolvePromptRequest<PromptDetail>(
      () => globalThis.api.prompts.restorePromptVersion(target),
      'Prompt version could not be restored.',
    ),
    retry: false,
    onSuccess: (prompt) => {
      updatePromptCaches(queryClient, prompt);
      const restoredValues = createPromptFormValues(prompt);
      setCurrentDetail(prompt);
      setBaselineValues(restoredValues);
      setValues(restoredValues);
      setErrors({});
      setSelectedVersion(undefined);
      setPendingVersion(undefined);
      setIsRestoreOpen(false);
      showToast({
        body: 'Prompt version restored',
        uniqueID: `prompt-version-restore-success-${prompt.id}-${prompt.currentVersion}`,
      });
    },
    onError: (error, target) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `prompt-version-restore-error-${target.id}-${target.version}`,
      });
    },
  });

  const setField = useCallback((field: PromptFormField, value: string) => {
    setValues((currentValues) => setPromptFormField(currentValues, field, value));
    setErrors((currentErrors) => {
      if (currentErrors[field] === undefined) {
        return currentErrors;
      }
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }, []);

  const focusFirstError = (nextErrors: PromptFormErrors) => {
    if (nextErrors.title) {
      titleInputRef.current?.focus();
    } else if (nextErrors.description) {
      descriptionInputRef.current?.focus();
    } else if (nextErrors.content) {
      contentInputRef.current?.focus();
    }
  };

  const showCurrentVersion = useCallback(() => {
    versionRequestIdRef.current += 1;
    setPendingVersion(undefined);
    setSelectedVersion(undefined);
    setIsRestoreOpen(false);
  }, []);

  const closeHistory = useCallback(() => {
    showCurrentVersion();
    setIsHistoryOpen(false);
  }, [showCurrentVersion]);

  async function loadPromptVersion(version: number): Promise<void> {
    if (!currentDetail) {
      return;
    }
    const requestId = versionRequestIdRef.current + 1;
    versionRequestIdRef.current = requestId;
    setPendingVersion(version);
    try {
      const snapshot = await queryClient.fetchQuery(getPromptVersionQueryOptions({
        id: currentDetail.id,
        version,
      }));
      if (versionRequestIdRef.current !== requestId) {
        return;
      }
      setSelectedVersion(snapshot);
      setValues(baselineValues);
      setErrors({});
    } catch (error) {
      if (versionRequestIdRef.current !== requestId) {
        return;
      }
      showToast({
        body: error instanceof Error ? error.message : 'Prompt version could not be loaded.',
        type: 'error',
        uniqueID: `prompt-version-load-${currentDetail.id}-${version}`,
      });
    } finally {
      if (versionRequestIdRef.current === requestId) {
        setPendingVersion(undefined);
      }
    }
  }

  const selectVersion = (version: number) => {
    if (!currentDetail || pendingVersion !== undefined) {
      return;
    }
    const action = getPromptVersionSelectionAction({
      currentVersion: currentDetail.currentVersion,
      isDirty,
      requestedVersion: version,
      selectedVersion: selectedVersion?.version,
    });
    switch (action.type) {
      case 'show-current': {
        showCurrentVersion();
        break;
      }
      case 'confirm-discard': {
        setDiscardVersion(action.version);
        break;
      }
      case 'load': {
        void loadPromptVersion(action.version);
        break;
      }
      case 'none': {
        break;
      }
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLElement, SubmitEvent>) => {
    event.preventDefault();
    if (selectedVersion || pendingVersion !== undefined) {
      return;
    }
    const validation = validatePromptForm(values);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }
    setErrors({});
    saveMutation.mutate(validation.input, {
      onSuccess: (prompt) => {
        allowNavigationRef.current = true;
        void navigate(routePaths.agentExtensionsPrompt(prompt.id), { replace: true });
      },
      onError: (error) => {
        if (!(error instanceof PromptRequestError) || !error.apiError) {
          return;
        }
        const apiErrors = getPromptFormApiErrorState(error.apiError).errors;
        setErrors(apiErrors);
        focusFirstError(apiErrors);
      },
    });
  };

  const pageTitle = isEditing ? 'Edit Prompt' : 'New Prompt';
  const selectedTarget = currentDetail && selectedVersion
    ? { id: currentDetail.id, version: selectedVersion.version }
    : undefined;
  const isCopyingSelectedVersion = selectedTarget
    ? isCopyingVersion(selectedTarget)
    : false;
  const isEditorDisabled = saveMutation.isPending || pendingVersion !== undefined;
  return (
    <VStack
      as="form"
      width="100%"
      height="100%"
      xstyle={styles.form}
      onSubmit={handleSubmit}
    >
      <Layout
        height="fill"
        header={(
          <LayoutHeader hasDivider padding={0}>
            <PageHeader
              text={pageTitle}
              action={currentDetail
                ? (
                    <ToggleButton
                      label="History"
                      isPressed={isHistoryOpen}
                      isDisabled={saveMutation.isPending || restoreMutation.isPending}
                      icon={<Icon icon={History} size="sm" color="inherit" />}
                      onPressedChange={(isPressed) => {
                        if (isPressed) {
                          setIsHistoryOpen(true);
                        } else {
                          closeHistory();
                        }
                      }}
                    >
                      History
                    </ToggleButton>
                  )
                : undefined}
            />
          </LayoutHeader>
        )}
        content={(
          <LayoutContent>
            {selectedVersion
              ? <PromptVersionContent version={selectedVersion} />
              : (
                  <FormLayout direction="vertical">
                    <TextInput
                      ref={titleInputRef}
                      label="Title"
                      htmlName="title"
                      value={values.title}
                      width="100%"
                      isRequired
                      isDisabled={isEditorDisabled}
                      status={getErrorStatus(errors.title)}
                      onChange={(value) => setField('title', value)}
                    />
                    <TextArea
                      ref={descriptionInputRef}
                      label="Description"
                      htmlName="description"
                      value={values.description}
                      width="100%"
                      rows={4}
                      isOptional
                      isDisabled={isEditorDisabled}
                      status={getErrorStatus(errors.description)}
                      onChange={(value) => setField('description', value)}
                    />
                    <TextArea
                      ref={contentInputRef}
                      label="Content"
                      htmlName="content"
                      value={values.content}
                      width="100%"
                      rows={20}
                      isRequired
                      isDisabled={isEditorDisabled}
                      hasSpellCheck={false}
                      status={getErrorStatus(errors.content)}
                      xstyle={styles.contentInput}
                      onChange={(value) => setField('content', value)}
                    />
                  </FormLayout>
                )}
          </LayoutContent>
        )}
        end={isHistoryOpen && currentDetail
          ? (
              <PromptHistoryPanel
                promptId={currentDetail.id}
                currentVersion={currentDetail.currentVersion}
                selectedVersion={selectedVersion?.version}
                pendingVersion={pendingVersion}
                onClose={closeHistory}
                onSelectVersion={selectVersion}
              />
            )
          : undefined}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" vAlign="center" wrap="wrap">
              {selectedTarget
                ? (
                    <>
                      <Button
                        label="Copy"
                        type="button"
                        icon={<Icon icon={Copy} size="sm" color="inherit" />}
                        isLoading={isCopyingSelectedVersion}
                        isDisabled={pendingVersion !== undefined || restoreMutation.isPending}
                        onClick={() => copyPromptVersion(selectedTarget)}
                      />
                      <Button
                        label="Restore"
                        type="button"
                        variant="primary"
                        icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
                        isDisabled={isCopyingSelectedVersion || pendingVersion !== undefined}
                        onClick={() => setIsRestoreOpen(true)}
                      />
                    </>
                  )
                : (
                    <>
                      <Button
                        label="Cancel"
                        type="button"
                        isDisabled={isEditorDisabled}
                        onClick={() => void navigate(destination, { replace: true })}
                      />
                      <Button
                        label="Save"
                        type="submit"
                        variant="primary"
                        isLoading={saveMutation.isPending}
                        isDisabled={pendingVersion !== undefined}
                      />
                    </>
                  )}
            </HStack>
          </LayoutFooter>
        )}
      />
      <AlertDialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(isOpen) => {
          if (!isOpen && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
        title="Discard Unsaved Changes?"
        description="Your changes will be lost if you leave this page."
        cancelLabel="Keep Editing"
        actionLabel="Discard Changes"
        actionVariant="destructive"
        onAction={() => {
          if (blocker.state === 'blocked') {
            blocker.proceed();
          }
        }}
      />
      {discardVersion === undefined
        ? null
        : (
            <AlertDialog
              isOpen
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setDiscardVersion(undefined);
                }
              }}
              title={`Discard Changes and View Version ${discardVersion}?`}
              description="Your unsaved changes will be lost after this version loads."
              cancelLabel="Keep Editing"
              actionLabel="Discard and View"
              actionVariant="destructive"
              onAction={() => {
                const version = discardVersion;
                setDiscardVersion(undefined);
                void loadPromptVersion(version);
              }}
            />
          )}
      {selectedTarget && selectedVersion
        ? (
            <AlertDialog
              isOpen={isRestoreOpen}
              onOpenChange={(isOpen) => {
                if (!isOpen && !restoreMutation.isPending) {
                  setIsRestoreOpen(false);
                }
              }}
              title={`Restore Version ${selectedVersion.version}?`}
              description="This creates a new current version from this snapshot. Existing versions will be kept."
              cancelLabel="Cancel"
              actionLabel={`Restore Version ${selectedVersion.version}`}
              actionVariant="primary"
              isActionLoading={restoreMutation.isPending}
              onAction={() => restoreMutation.mutate(selectedTarget)}
            />
          )
        : null}
    </VStack>
  );
}

export function PromptCreatePage() {
  return <PromptEditor />;
}

export function PromptEditPage() {
  const promptId = useParams().promptId ?? '';
  const promptQuery = usePromptDetail(promptId);
  if (!promptQuery.data) {
    return <PromptPageLoading title="Edit Prompt" />;
  }
  return <PromptEditor key={promptQuery.data.id} initialDetail={promptQuery.data} />;
}
