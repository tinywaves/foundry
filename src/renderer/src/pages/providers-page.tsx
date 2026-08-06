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

function updateIdSet(current: ReadonlySet<string>, id: string, isPresent: boolean): Set<string> {
  const next = new Set(current);
  if (isPresent) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

export function ProvidersPage() {
  const showToast = useToast();
  const [runtime, setRuntime] = useState<ProviderRuntime>('codex');
  const [dialogRequest, setDialogRequest] = useState<ProviderDialogRequest>();
  const [revealedApiKey, setRevealedApiKey] = useState<{ id: string; value: string }>();
  const [revealingProviderId, setRevealingProviderId] = useState<string>();
  const [copyingProviderIds, setCopyingProviderIds] = useState<Set<string>>(() => new Set());
  const [testingProviderIds, setTestingProviderIds] = useState<Set<string>>(() => new Set());
  const [providerToDelete, setProviderToDelete] = useState<ProviderSummary>();
  const [deletingProviderId, setDeletingProviderId] = useState<string>();
  const dialogKeyRef = useRef(0);
  const pageRevisionRef = useRef(0);
  const revealRequestRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);
  const codexProviderList = useProviderList('codex');
  const claudeCodeProviderList = useProviderList('claude-code');
  const { state, avatarUrls, reload, replaceProvider } = runtime === 'codex'
    ? codexProviderList
    : claudeCodeProviderList;

  const clearRevealedApiKey = useCallback(() => {
    revealRequestRef.current += 1;
    if (revealTimerRef.current !== undefined) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    setRevealedApiKey(undefined);
    setRevealingProviderId(undefined);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      revealRequestRef.current += 1;
      if (revealTimerRef.current !== undefined) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  const resetPageActions = useCallback(() => {
    pageRevisionRef.current += 1;
    clearRevealedApiKey();
    setCopyingProviderIds(new Set());
    setTestingProviderIds(new Set());
    setProviderToDelete(undefined);
    setDeletingProviderId(undefined);
  }, [clearRevealedApiKey]);

  const reloadProviders = useCallback(() => {
    resetPageActions();
    reload();
  }, [reload, resetPageActions]);

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

  const openAddDialog = () => {
    setDialogRequest({ key: ++dialogKeyRef.current, mode: 'add', runtime });
  };

  const openEditDialog = useCallback((provider: ProviderSummary) => {
    clearRevealedApiKey();
    setDialogRequest({ key: ++dialogKeyRef.current, mode: 'edit', provider });
  }, [clearRevealedApiKey]);

  const handleCopyApiKey = useCallback(async (provider: ProviderSummary) => {
    const revision = pageRevisionRef.current;
    setCopyingProviderIds((current) => updateIdSet(current, provider.id, true));
    try {
      const result = await globalThis.api.providers.copyProviderApiKey(provider.id);
      if (!isMountedRef.current || revision !== pageRevisionRef.current) {
        return;
      }
      if (!result.ok) {
        showOperationError(result.error.message, `provider-copy-${provider.id}`);
        return;
      }
      showToast({ body: 'API key copied', uniqueID: `provider-copy-${provider.id}` });
    } catch {
      if (isMountedRef.current && revision === pageRevisionRef.current) {
        showOperationError('The API key could not be copied.', `provider-copy-${provider.id}`);
      }
    } finally {
      if (isMountedRef.current && revision === pageRevisionRef.current) {
        setCopyingProviderIds((current) => updateIdSet(current, provider.id, false));
      }
    }
  }, [showOperationError, showToast]);

  const handleToggleRevealApiKey = useCallback(async (provider: ProviderSummary) => {
    if (revealedApiKey?.id === provider.id) {
      clearRevealedApiKey();
      return;
    }

    clearRevealedApiKey();
    const requestId = ++revealRequestRef.current;
    const revision = pageRevisionRef.current;
    setRevealingProviderId(provider.id);
    try {
      const result = await globalThis.api.providers.revealProviderApiKey(provider.id);
      if (
        !isMountedRef.current
        || requestId !== revealRequestRef.current
        || revision !== pageRevisionRef.current
      ) {
        return;
      }
      if (!result.ok) {
        showOperationError(result.error.message, `provider-reveal-${provider.id}`);
        return;
      }
      if (result.value === null) {
        showOperationError('Provider does not have an API key.', `provider-reveal-${provider.id}`);
        return;
      }

      setRevealedApiKey({ id: provider.id, value: result.value });
      revealTimerRef.current = setTimeout(() => {
        if (requestId === revealRequestRef.current) {
          clearRevealedApiKey();
        }
      }, REVEAL_DURATION_MS);
    } catch {
      if (
        isMountedRef.current
        && requestId === revealRequestRef.current
        && revision === pageRevisionRef.current
      ) {
        showOperationError('The API key could not be revealed.', `provider-reveal-${provider.id}`);
      }
    } finally {
      if (
        isMountedRef.current
        && requestId === revealRequestRef.current
        && revision === pageRevisionRef.current
      ) {
        setRevealingProviderId(undefined);
      }
    }
  }, [clearRevealedApiKey, revealedApiKey, showOperationError]);

  const handleTestConnection = useCallback(async (provider: ProviderSummary) => {
    const revision = pageRevisionRef.current;
    setTestingProviderIds((current) => updateIdSet(current, provider.id, true));
    try {
      const result = await globalThis.api.providers.testSavedProviderConnection(provider.id);
      if (!isMountedRef.current || revision !== pageRevisionRef.current) {
        return;
      }
      if (!result.ok) {
        showOperationError(result.error.message, `provider-test-${provider.id}`);
        return;
      }
      if (
        result.value.id !== provider.id
        || result.value.runtime !== runtime
        || result.value.source !== 'user-custom'
      ) {
        showOperationError('The connection result was invalid.', `provider-test-${provider.id}`);
        return;
      }
      replaceProvider(result.value);
    } catch {
      if (isMountedRef.current && revision === pageRevisionRef.current) {
        showOperationError('The connection could not be tested.', `provider-test-${provider.id}`);
      }
    } finally {
      if (isMountedRef.current && revision === pageRevisionRef.current) {
        setTestingProviderIds((current) => updateIdSet(current, provider.id, false));
      }
    }
  }, [replaceProvider, runtime, showOperationError]);

  const handleDelete = useCallback((provider: ProviderSummary) => {
    setProviderToDelete(provider);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!providerToDelete || deletingProviderId) {
      return;
    }
    const provider = providerToDelete;
    const revision = pageRevisionRef.current;
    setDeletingProviderId(provider.id);
    try {
      const result = await globalThis.api.providers.deleteProvider(provider.id);
      if (!isMountedRef.current || revision !== pageRevisionRef.current) {
        return;
      }
      if (!result.ok) {
        showOperationError(result.error.message, `provider-delete-${provider.id}`);
        return;
      }

      showToast({ body: 'Provider deleted', uniqueID: `provider-delete-${provider.id}` });
      reloadProviders();
    } catch {
      if (isMountedRef.current && revision === pageRevisionRef.current) {
        showOperationError('The Provider could not be deleted.', `provider-delete-${provider.id}`);
      }
    } finally {
      if (isMountedRef.current && revision === pageRevisionRef.current) {
        setDeletingProviderId(undefined);
      }
    }
  }, [deletingProviderId, providerToDelete, reloadProviders, showOperationError, showToast]);

  let content;
  if (state === undefined || state.status === 'loading') {
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
        providers={state.providers}
        avatarUrls={avatarUrls}
        runtime={runtime}
        revealedApiKey={revealedApiKey}
        revealingProviderId={revealingProviderId}
        copyingProviderIds={copyingProviderIds}
        testingProviderIds={testingProviderIds}
        deletingProviderId={deletingProviderId}
        onEdit={openEditDialog}
        onCopyApiKey={(provider) => void handleCopyApiKey(provider)}
        onToggleRevealApiKey={(provider) => void handleToggleRevealApiKey(provider)}
        onTestConnection={(provider) => void handleTestConnection(provider)}
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
              reloadProviders();
            }
          }}
        />
      )}
      <AlertDialog
        isOpen={providerToDelete !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen && deletingProviderId === undefined) {
            setProviderToDelete(undefined);
          }
        }}
        title="Delete provider?"
        description={providerToDelete
          ? `${providerToDelete.name} will be removed from Foundry's active Provider list.`
          : 'This Provider will be removed from Foundry.'}
        actionLabel="Delete provider"
        actionVariant="destructive"
        isActionLoading={deletingProviderId !== undefined}
        onAction={() => void handleConfirmDelete()}
      />
    </VStack>
  );
}
