import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useToast } from '@astryxdesign/core/Toast';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ServerCog } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';
import { providerRuntimes } from '../../../shared/provider-contract';
import type { ProviderRuntime, ProviderSummary } from '../../../shared/provider-contract';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';
import { ProviderDialog } from './providers/provider-dialog';
import type { ProviderDialogRequest } from './providers/provider-dialog';
import {
  removeProviderDetail,
  resetProviderList,
  resolveProviderRequest,
} from './providers/provider-query';
import type { ProviderRequestError } from './providers/provider-query';
import { canInitiateProviderDeletion } from './providers/provider-usage';
import {
  LoadingProviderCardList,
  ProviderCardList,
} from './providers/provider-card-list';
import {
  providerRuntimeLabels,
} from './providers/provider-runtime';
import { ProviderRuntimeIcon } from './providers/provider-runtime-icon';
import { useProviderList } from './providers/use-provider-list';
import { resetRuntimeProviderState } from './runtimes/runtime-query';
import { RuntimeApplyResultDialog } from './runtimes/runtime-apply-result-dialog';
import type { RuntimeApplyResult } from './runtimes/runtime-apply-result';

const RUNTIME_QUERY_PARAM = 'runtime';

const styles = stylex.create({
  page: {
    minWidth: 0,
  },
  content: {
    minWidth: 0,
    minHeight: 0,
  },
});

function getProviderRuntime(value: string | null): ProviderRuntime {
  return value === 'claude-code' ? value : 'codex';
}

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const runtimeParam = searchParams.get(RUNTIME_QUERY_PARAM);
  const runtime = getProviderRuntime(runtimeParam);
  const [dialogRequest, setDialogRequest] = useState<ProviderDialogRequest>();
  const [providerToDelete, setProviderToDelete] = useState<ProviderSummary>();
  const [applyResult, setApplyResult] = useState<RuntimeApplyResult>();
  const dialogKeyRef = useRef(0);
  const { state } = useProviderList(runtime);
  const {
    isPending: isDeletingProvider,
    mutate: deleteProvider,
    reset: resetDeleteProvider,
    variables: deletingProvider,
  } = useMutation<undefined, ProviderRequestError, ProviderSummary>({
    mutationFn: (provider) => resolveProviderRequest<undefined>(
      () => globalThis.api.providers.deleteProvider(provider.id),
      'The provider could not be deleted.',
    ),
    onSuccess: (_, provider) => {
      void resetProviderList(queryClient, provider.runtime);
    },
  });
  const deletingProviderId = isDeletingProvider ? deletingProvider.id : undefined;

  useEffect(() => {
    if (runtimeParam === runtime) {
      return;
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set(RUNTIME_QUERY_PARAM, runtime);
      return next;
    }, { replace: true });
  }, [runtime, runtimeParam, setSearchParams]);

  const resetPageActions = useCallback(() => {
    resetDeleteProvider();
    setProviderToDelete(undefined);
  }, [resetDeleteProvider]);

  const reloadProviders = useCallback(() => {
    resetPageActions();
    void resetProviderList(queryClient, runtime);
  }, [queryClient, resetPageActions, runtime]);

  const showOperationError = useCallback((body: string, uniqueID: string) => {
    showToast({ body, type: 'error', uniqueID });
  }, [showToast]);

  const selectRuntime = useCallback((nextRuntime: ProviderRuntime) => {
    resetPageActions();
    if (nextRuntime === runtime) {
      return;
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set(RUNTIME_QUERY_PARAM, nextRuntime);
      return next;
    }, { replace: true });
  }, [resetPageActions, runtime, setSearchParams]);

  const handleRuntimeChange = (value: string) => {
    if (!providerRuntimes.includes(value as ProviderRuntime)) {
      return;
    }
    selectRuntime(value as ProviderRuntime);
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

  const handleProviderApplied = useCallback((appliedRuntime: ProviderRuntime) => {
    disposeCurrentDialogDetail();
    setDialogRequest(undefined);
    selectRuntime(appliedRuntime);
    setApplyResult({
      runtime: appliedRuntime,
      source: 'provider-updated-and-applied',
    });
  }, [disposeCurrentDialogDetail, selectRuntime]);

  const openAddDialog = () => {
    disposeCurrentDialogDetail();
    setDialogRequest({ key: ++dialogKeyRef.current, mode: 'add', runtime });
  };

  const openEditDialog = useCallback((provider: ProviderSummary) => {
    disposeCurrentDialogDetail();
    setDialogRequest({ key: ++dialogKeyRef.current, mode: 'edit', provider });
  }, [disposeCurrentDialogDetail]);

  const handleDelete = useCallback((provider: ProviderSummary) => {
    if (!canInitiateProviderDeletion(provider)) {
      return;
    }
    setProviderToDelete(provider);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (
      !providerToDelete
      || isDeletingProvider
      || !canInitiateProviderDeletion(providerToDelete)
    ) {
      return;
    }
    const provider = providerToDelete;
    deleteProvider(provider, {
      onError: (error) => {
        showOperationError(error.message, `provider-delete-${provider.id}`);
        if (error.apiError?.code === 'conflict') {
          void resetRuntimeProviderState(queryClient, provider.runtime);
        }
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
    queryClient,
    resetPageActions,
    showOperationError,
    showToast,
  ]);

  let content;
  if (state.status === 'loading') {
    content = <LoadingProviderCardList runtime={runtime} />;
  } else if (state.status === 'error') {
    content = (
      <Banner
        status="error"
        container="section"
        title={`Couldn't Load ${providerRuntimeLabels[runtime]} Providers`}
        description={`${state.message} Retry to refresh this runtime.`}
        endContent={<Button label="Retry" variant="ghost" onClick={reloadProviders} />}
      />
    );
  } else if (state.providers.length === 0) {
    content = (
      <PageEmptyState
        icon={ServerCog}
        text={`No ${providerRuntimeLabels[runtime]} Providers Yet`}
      />
    );
  } else {
    content = (
      <ProviderCardList
        key={runtime}
        providers={state.providers}
        runtime={runtime}
        deletingProviderId={deletingProviderId}
        onEdit={openEditDialog}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <VStack width="100%" height="100%" xstyle={styles.page}>
      <PageHeader
        text="Providers"
        action={(
          <Button
            label="Add Provider"
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="inherit" />}
            onClick={openAddDialog}
          />
        )}
      />
      <Toolbar
        label="Provider Runtime"
        size="sm"
        startContent={(
          <TabList
            value={runtime}
            size="sm"
            onChange={handleRuntimeChange}
            aria-label="Runtime"
          >
            {providerRuntimes.map((runtimeOption) => (
              <Tab
                key={runtimeOption}
                value={runtimeOption}
                label={providerRuntimeLabels[runtimeOption]}
                icon={<ProviderRuntimeIcon runtime={runtimeOption} />}
              />
            ))}
          </TabList>
        )}
      />
      <StackItem size="fill" xstyle={styles.content}>
        {content}
      </StackItem>
      {dialogRequest && (
        <ProviderDialog
          key={dialogRequest.key}
          request={dialogRequest}
          onClose={() => setDialogRequest(undefined)}
          onSaved={selectRuntime}
          onApplied={handleProviderApplied}
        />
      )}
      {applyResult && (
        <RuntimeApplyResultDialog
          key={`${applyResult.runtime}:${applyResult.source}`}
          result={applyResult}
          onClose={() => setApplyResult(undefined)}
        />
      )}
      <AlertDialog
        isOpen={providerToDelete !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeletingProvider) {
            setProviderToDelete(undefined);
          }
        }}
        title="Delete Provider?"
        description={providerToDelete
          ? `${providerToDelete.name} will be removed from Foundry.`
          : 'This provider will be removed from Foundry.'}
        actionLabel="Delete Provider"
        actionVariant="destructive"
        isActionLoading={isDeletingProvider}
        onAction={handleConfirmDelete}
      />
    </VStack>
  );
}
