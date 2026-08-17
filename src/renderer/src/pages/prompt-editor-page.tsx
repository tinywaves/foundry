import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/Stack';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import type {
  CreatePromptInput,
  PromptDetail,
  PromptVersionDetail,
  PromptVersionTarget,
} from '../../../shared/prompt-contract';
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
import { PromptMarkdownEditor } from './prompts/prompt-markdown-editor';
import type { PromptMarkdownMode } from './prompts/prompt-markdown-editor';
import { PromptWindowHeader } from './prompts/prompt-window-header';
import {
  getPromptEditorBackNavigation,
  isPromptEditorExitDisabled,
  promptEditorListNavigateOptions,
  promptEditorListPath,
} from './prompts/prompt-editor-navigation';
import { PromptHistoryPanel } from './prompts/prompt-history-panel';
import { getPromptVersionSelectionAction } from './prompts/prompt-history-model';
import {
  getPromptVersionQueryOptions,
  PromptRequestError,
  resolvePromptRequest,
  updatePromptCaches,
} from './prompts/prompt-query';
import { usePromptDetail } from './prompts/use-prompt-detail';

const styles = stylex.create({
  form: {
    minWidth: 0,
    minHeight: 0,
  },
  historicalFields: {
    borderStyle: 'none',
    margin: spacingVars['--spacing-0'],
    minWidth: 0,
    padding: spacingVars['--spacing-0'],
  },
});

interface PromptEditorProps {
  backLabel?: string;
  initialDetail?: PromptDetail;
  onBack?: () => void;
}

function getErrorStatus(message: string | undefined) {
  return message ? { type: 'error' as const, message } : undefined;
}

function PromptEditor({
  backLabel,
  initialDetail,
  onBack,
}: PromptEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [currentDetail, setCurrentDetail] = useState(initialDetail);
  const [baselineValues, setBaselineValues] = useState(() => (
    createPromptFormValues(initialDetail)
  ));
  const [values, setValues] = useState<PromptFormValues>(baselineValues);
  const [errors, setErrors] = useState<PromptFormErrors>({});
  const [contentMode, setContentMode] = useState<PromptMarkdownMode>('source');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionDetail>();
  const [pendingVersion, setPendingVersion] = useState<number>();
  const [discardVersion, setDiscardVersion] = useState<number>();
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const allowNavigationRef = useRef(false);
  const versionRequestIdRef = useRef(0);
  const isEditing = currentDetail !== undefined;
  const isDirty = selectedVersion === undefined
    && hasPromptFormChanges(values, baselineValues);

  useEffect(() => () => {
    versionRequestIdRef.current += 1;
  }, []);

  const shouldBlock = useCallback(() => (
    isDirty && !allowNavigationRef.current
  ), [isDirty]);
  const blocker = useBlocker(shouldBlock);

  const returnToPrompts = () => {
    void navigate(promptEditorListPath, promptEditorListNavigateOptions);
  };
  const returnFromEditor = onBack ?? returnToPrompts;

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
  const setContent = useCallback((value: string) => {
    setField('content', value);
  }, [setField]);

  const showCurrentVersion = useCallback(() => {
    versionRequestIdRef.current += 1;
    setPendingVersion(undefined);
    setSelectedVersion(undefined);
    setValues(baselineValues);
    setErrors({});
    setIsRestoreOpen(false);
  }, [baselineValues]);

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
      setValues(createPromptFormValues(snapshot));
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
      if (validation.errors.content) {
        setContentMode('source');
      }
      setErrors(validation.errors);
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
        if (apiErrors.content) {
          setContentMode('source');
        }
        setErrors(apiErrors);
      },
    });
  };

  const promptName = values.title.trim() || 'Untitled';
  const selectedTarget = currentDetail && selectedVersion
    ? { id: currentDetail.id, version: selectedVersion.version }
    : undefined;
  const isEditorDisabled = saveMutation.isPending || pendingVersion !== undefined;
  const isExitDisabled = isPromptEditorExitDisabled({
    isRestoring: restoreMutation.isPending,
    isSaving: saveMutation.isPending,
    isVersionLoading: pendingVersion !== undefined,
  });
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
          <PromptWindowHeader
            title={promptName}
            backLabel={backLabel}
            isBackDisabled={isExitDisabled}
            onBack={returnFromEditor}
            primaryAction={selectedVersion
              ? (
                  <Button
                    label="Restore"
                    type="button"
                    size="sm"
                    variant="primary"
                    icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
                    isDisabled={pendingVersion !== undefined}
                    onClick={() => setIsRestoreOpen(true)}
                  />
                )
              : (
                  <Button
                    label="Save"
                    type="submit"
                    size="sm"
                    variant="primary"
                    isLoading={saveMutation.isPending}
                    isDisabled={pendingVersion !== undefined}
                  />
                )}
            action={currentDetail
              ? (
                  <ToggleButton
                    label="History"
                    size="sm"
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
        )}
        content={(
          <LayoutContent>
            <FormLayout direction="vertical">
              <fieldset
                disabled={selectedVersion !== undefined}
                {...stylex.props(styles.historicalFields)}
              >
                <FormLayout direction="vertical">
                  <TextInput
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
                    label="Description"
                    htmlName="description"
                    value={values.description}
                    width="100%"
                    rows={2}
                    isOptional
                    isDisabled={isEditorDisabled}
                    status={getErrorStatus(errors.description)}
                    onChange={(value) => setField('description', value)}
                  />
                </FormLayout>
              </fieldset>
              <PromptMarkdownEditor
                value={values.content}
                mode={contentMode}
                isDisabled={isEditorDisabled}
                isReadOnly={selectedVersion !== undefined}
                error={errors.content}
                onChange={setContent}
                onModeChange={setContentMode}
              />
            </FormLayout>
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
              title={`Discard Changes and Load Version ${discardVersion}?`}
              description="Your unsaved changes will be lost after this version loads."
              cancelLabel="Keep Editing"
              actionLabel="Discard and Load"
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
  const location = useLocation();
  const navigate = useNavigate();
  const promptId = useParams().promptId ?? '';
  const promptQuery = usePromptDetail(promptId);
  const backNavigation = getPromptEditorBackNavigation(location.state);
  const returnFromEdit = () => {
    if (backNavigation.kind === 'history') {
      void navigate(-1);
      return;
    }
    void navigate(backNavigation.path, backNavigation.options);
  };
  if (!promptQuery.data) {
    return (
      <PromptPageLoading
        title="Edit Prompt"
        header={(
          <PromptWindowHeader
            title="Edit Prompt"
            backLabel={backNavigation.label}
            onBack={returnFromEdit}
          />
        )}
      />
    );
  }
  return (
    <PromptEditor
      key={promptQuery.data.id}
      initialDetail={promptQuery.data}
      backLabel={backNavigation.label}
      onBack={returnFromEdit}
    />
  );
}
