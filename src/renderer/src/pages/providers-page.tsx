import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useToast } from '@astryxdesign/core/Toast';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
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
import {
  providerRuntimeIconUrls,
  providerRuntimeLabels,
} from './providers/provider-runtime';
import { useProviderList } from './providers/use-provider-list';

const REVEAL_DURATION_MS = 30_000;
const RUNTIME_QUERY_PARAM = 'runtime';

const styles = stylex.create({
  page: {
    minWidth: 0,
  },
  content: {
    minWidth: 0,
    minHeight: 0,
  },
  emptyState: {
    minHeight: '100%',
  },
  runtimeIcon: {
    display: 'block',
    width: spacingVars['--spacing-4'],
    height: spacingVars['--spacing-4'],
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
      'The provider could not be deleted.',
    ),
    onSuccess: (_, provider) => {
      void resetProviderList(queryClient, provider.runtime);
    },
  });
  const revealingProviderId = isRevealingApiKey ? revealingProvider.id : undefined;
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
    const next = new URLSearchParams(searchParams);
    next.set(RUNTIME_QUERY_PARAM, value);
    setSearchParams(next, { replace: true });
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
        title={`Couldn't Load ${providerRuntimeLabels[runtime]} Providers`}
        description={`${state.message} Retry to refresh this runtime.`}
        endContent={<Button label="Retry" variant="ghost" onClick={reloadProviders} />}
      />
    );
  } else if (state.providers.length === 0) {
    content = (
      <EmptyState
        headingLevel={2}
        title={`No ${providerRuntimeLabels[runtime]} Providers Yet`}
        icon={<Icon icon={ServerCog} size="lg" color="secondary" />}
        xstyle={styles.emptyState}
        actions={(
          <Button
            label="Add Provider"
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
      <Section padding={4} paddingBlock={2}>
        <HStack gap={3} hAlign="between" vAlign="center">
          <Heading level={3} accessibilityLevel={1}>Providers</Heading>
          <Button
            label="Add Provider"
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="inherit" />}
            onClick={openAddDialog}
          />
        </HStack>
      </Section>
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
            <Tab
              value="codex"
              label="Codex"
              icon={(
                <img
                  {...stylex.props(styles.runtimeIcon)}
                  src={providerRuntimeIconUrls.codex}
                  alt=""
                  width={16}
                  height={16}
                  draggable={false}
                />
              )}
            />
            <Tab
              value="claude-code"
              label="Claude Code"
              icon={(
                <img
                  {...stylex.props(styles.runtimeIcon)}
                  src={providerRuntimeIconUrls['claude-code']}
                  alt=""
                  width={16}
                  height={16}
                  draggable={false}
                />
              )}
            />
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
