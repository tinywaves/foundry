import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useToast } from '@astryxdesign/core/Toast';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ServerCog } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ProviderRuntime, ProviderSummary } from '../../../shared/provider-contract';
import { ProviderDialog } from './providers/provider-dialog';
import type { ProviderDialogRequest } from './providers/provider-dialog';
import {
  ProviderRequestError,
  removeProviderDetail,
  resetProviderList,
  resolveProviderRequest,
} from './providers/provider-query';
import {
  LoadingProviderTable,
  ProviderTable,
} from './providers/provider-table';
import { providerRuntimeLabels } from './providers/provider-runtime';
import { useProviderList } from './providers/use-provider-list';

const REVEAL_DURATION_MS = 30_000;

const styles = stylex.create({
  page: {
    minWidth: 0,
  },
  header: {
    flexShrink: 0,
  },
  tabList: {
    width: '100%',
  },
  addButton: {
    marginInlineStart: 'auto',
  },
  content: {
    minWidth: 0,
    minHeight: 0,
  },
  emptyState: {
    minHeight: '100%',
  },
});

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [runtime, setRuntime] = useState<ProviderRuntime>('codex');
  const [dialogRequest, setDialogRequest] = useState<ProviderDialogRequest>();
  const [revealedApiKey, setRevealedApiKey] = useState<{ id: string; value: string }>();
  const [providerToDelete, setProviderToDelete] = useState<ProviderSummary>();
  const dialogKeyRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { state } = useProviderList(runtime);
  const {
    isPending: isRevealingApiKey,
    mutate: revealProviderApiKey,
    reset: resetRevealProviderApiKey,
    variables: revealingProvider,
  } = useMutation<string, ProviderRequestError, ProviderSummary>({
    mutationFn: async (provider) => {
      const apiKey = await resolveProviderRequest<string | null>(
        () => globalThis.api.providers.revealProviderApiKey(provider.id),
        'The API key could not be revealed.',
      );
      if (apiKey === null) {
        throw new ProviderRequestError('Provider does not have an API key.');
      }
      return apiKey;
    },
  });
  const {
    isPending: isDeletingProvider,
    mutate: deleteProvider,
    reset: resetDeleteProvider,
    variables: deletingProvider,
  } = useMutation<undefined, ProviderRequestError, ProviderSummary>({
    mutationFn: (provider) => resolveProviderRequest<undefined>(
      () => globalThis.api.providers.deleteProvider(provider.id),
      'The Provider could not be deleted.',
    ),
    onSuccess: (_, provider) => {
      void resetProviderList(queryClient, provider.runtime);
    },
  });
  const revealingProviderId = isRevealingApiKey ? revealingProvider.id : undefined;
  const deletingProviderId = isDeletingProvider ? deletingProvider.id : undefined;

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current === undefined) {
      return;
    }
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = undefined;
  }, []);

  const clearRevealedApiKey = useCallback(() => {
    clearRevealTimer();
    resetRevealProviderApiKey();
    setRevealedApiKey(undefined);
  }, [clearRevealTimer, resetRevealProviderApiKey]);

  useEffect(() => () => clearRevealTimer(), [clearRevealTimer]);

  const resetPageActions = useCallback(() => {
    clearRevealedApiKey();
    resetDeleteProvider();
    setProviderToDelete(undefined);
  }, [clearRevealedApiKey, resetDeleteProvider]);

  const reloadProviders = useCallback(() => {
    resetPageActions();
    void resetProviderList(queryClient, runtime);
  }, [queryClient, resetPageActions, runtime]);

  const showOperationError = useCallback((body: string, uniqueID: string) => {
    showToast({ body, type: 'error', uniqueID });
  }, [showToast]);

  const handleRuntimeChange = (value: string) => {
    if ((value !== 'codex' && value !== 'claude-code') || value === runtime) {
      return;
    }
    resetPageActions();
    setRuntime(value);
  };

  const disposeCurrentDialogDetail = useCallback(() => {
    if (dialogRequest?.mode === 'edit') {
      removeProviderDetail(
        queryClient,
        dialogRequest.provider.runtime,
        dialogRequest.provider.id,
      );
    }
  }, [dialogRequest, queryClient]);

  const openAddDialog = () => {
    disposeCurrentDialogDetail();
    setDialogRequest({ key: ++dialogKeyRef.current, mode: 'add', runtime });
  };

  const openEditDialog = useCallback((provider: ProviderSummary) => {
    disposeCurrentDialogDetail();
    clearRevealedApiKey();
    setDialogRequest({ key: ++dialogKeyRef.current, mode: 'edit', provider });
  }, [clearRevealedApiKey, disposeCurrentDialogDetail]);

  const handleToggleRevealApiKey = useCallback((provider: ProviderSummary) => {
    if (revealedApiKey?.id === provider.id) {
      clearRevealedApiKey();
      return;
    }

    clearRevealedApiKey();
    revealProviderApiKey(provider, {
      onError: (error) => {
        showOperationError(error.message, `provider-reveal-${provider.id}`);
      },
      onSuccess: (apiKey) => {
        setRevealedApiKey({ id: provider.id, value: apiKey });
        resetRevealProviderApiKey();
        clearRevealTimer();
        revealTimerRef.current = setTimeout(() => {
          clearRevealedApiKey();
        }, REVEAL_DURATION_MS);
      },
    });
  }, [
    clearRevealTimer,
    clearRevealedApiKey,
    revealProviderApiKey,
    revealedApiKey?.id,
    resetRevealProviderApiKey,
    showOperationError,
  ]);

  const handleDelete = useCallback((provider: ProviderSummary) => {
    setProviderToDelete(provider);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!providerToDelete || isDeletingProvider) {
      return;
    }
    const provider = providerToDelete;
    deleteProvider(provider, {
      onError: (error) => {
        showOperationError(error.message, `provider-delete-${provider.id}`);
      },
      onSuccess: () => {
        showToast({ body: 'Provider deleted', uniqueID: `provider-delete-${provider.id}` });
        resetPageActions();
      },
    });
  }, [
    deleteProvider,
    isDeletingProvider,
    providerToDelete,
    resetPageActions,
    showOperationError,
    showToast,
  ]);

  let content;
  if (state.status === 'loading') {
    content = <LoadingProviderTable runtime={runtime} />;
  } else if (state.status === 'error') {
    content = (
      <Banner
        status="error"
        container="section"
        title={`Couldn't load ${providerRuntimeLabels[runtime]} providers`}
        description={state.message}
        endContent={<Button label="Retry" variant="ghost" onClick={reloadProviders} />}
      />
    );
  } else if (state.providers.length === 0) {
    content = (
      <EmptyState
        headingLevel={2}
        title={`No ${providerRuntimeLabels[runtime]} providers yet`}
        icon={<Icon icon={ServerCog} size="lg" color="secondary" />}
        xstyle={styles.emptyState}
        actions={(
          <Button
            label="Add provider"
            variant="secondary"
            icon={<Icon icon={Plus} size="sm" color="inherit" />}
            onClick={openAddDialog}
          />
        )}
      />
    );
  } else {
    content = (
      <ProviderTable
        key={runtime}
        providers={state.providers}
        runtime={runtime}
        revealedApiKey={revealedApiKey}
        revealingProviderId={revealingProviderId}
        deletingProviderId={deletingProviderId}
        onEdit={openEditDialog}
        onToggleRevealApiKey={handleToggleRevealApiKey}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <VStack width="100%" height="100%" xstyle={styles.page}>
      <VStack gap={4} padding={6} xstyle={styles.header}>
        <Heading level={1}>Providers</Heading>
        <TabList
          value={runtime}
          onChange={handleRuntimeChange}
          hasDivider
          aria-label="Provider runtime"
          xstyle={styles.tabList}
        >
          <Tab value="codex" label="Codex" />
          <Tab value="claude-code" label="Claude Code" />
          <Button
            label="Add provider"
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="inherit" />}
            xstyle={styles.addButton}
            onClick={openAddDialog}
          />
        </TabList>
      </VStack>
      <StackItem size="fill" xstyle={styles.content}>
        {content}
      </StackItem>
      {dialogRequest && (
        <ProviderDialog
          key={dialogRequest.key}
          request={dialogRequest}
          onClose={() => setDialogRequest(undefined)}
          onSaved={(savedRuntime) => {
            if (savedRuntime === runtime) {
              resetPageActions();
            }
          }}
        />
      )}
      <AlertDialog
        isOpen={providerToDelete !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeletingProvider) {
            setProviderToDelete(undefined);
          }
        }}
        title="Delete provider?"
        description={providerToDelete
          ? `${providerToDelete.name} will be removed from Foundry's active Provider list.`
          : 'This Provider will be removed from Foundry.'}
        actionLabel="Delete provider"
        actionVariant="destructive"
        isActionLoading={isDeletingProvider}
        onAction={handleConfirmDelete}
      />
    </VStack>
  );
}
