import { RecordRow, ActionPopover, Hint, ToggleField } from '@/components/workbench';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Cloud as CloudIcon, Cpu as CpuChipIcon, Pencil as PencilSquareIcon, Plus as PlusIcon, Layers as Square3Stack3DIcon, Trash2 as TrashIcon } from 'lucide-react';
import type { ProviderListItem } from './types';
import { FeatureEmptyState } from '../../components/feature-empty-state';
import { listProviders, providerKeys, setProviderStatus } from './api';
import { useI18n } from '../../i18n';
import { TitlebarActions } from '../../components/titlebar-actions';
import { ProviderAvatar } from './provider-avatar';

const protocolLabels = {
  'openai-responses': 'OpenAI Responses',
  'anthropic-messages': 'Anthropic Messages',
  'openai-compatible-chat-completions': 'OpenAI-compatible Chat Completions',
} as const;
export default function ProvidersPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [providerToDelete, setProviderToDelete] = useState<ProviderListItem | null>(null);
  const providersQuery = useQuery({
    queryKey: providerKeys.list(),
    queryFn: listProviders,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: {
      id: string;
      status: 'active' | 'disabled' | 'deleted';
    }) => setProviderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
  const providerRemoval = useMutation({
    mutationFn: (id: string) => setProviderStatus(id, 'deleted'),
    onSuccess: () => {
      setProviderToDelete(null);
      void queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
  const providers: ProviderListItem[] = providersQuery.data ?? [];
  function setStatus(provider: ProviderListItem, isChecked: boolean) {
    if (provider.status === 'deleted' || provider.isInUse) {
      return;
    }
    statusMutation.mutate({ id: provider.id, status: isChecked ? 'active' : 'disabled' });
  }
  function getToggleTooltip(provider: ProviderListItem) {
    if (provider.isInUse) {
      return t('providers.inUse');
    }
    return t(provider.status === 'active' ? 'providers.disable' : 'providers.enable');
  }
  return (
    <>
      <TitlebarActions>
        <Button variant="default" size="sm" render={<Link to="/providers/new" />}>
          <span>{t('providers.add')}</span>
        </Button>
      </TitlebarActions>
      <div className="flex flex-col gap-5">
        {providers.length === 0
          ? (
              <FeatureEmptyState
                startIcon={CloudIcon}
                centerIcon={Square3Stack3DIcon}
                endIcon={CpuChipIcon}
                title={t('providers.emptyTitle')}
                description={t('providers.empty')}
                actions={(
                  <Button variant="default" size="sm" render={<Link to="/providers/new" />}>
                    <PlusIcon />
                    <span>{t('providers.addFirst')}</span>
                  </Button>
                )}
              />
            )
          : (
              <div className="flex flex-col gap-2">
                {providers.map((provider) => (
                  <RecordRow
                    key={provider.id}
                    label={provider.name}
                    startContent={<ProviderAvatar avatar={provider.avatar} name={provider.name} />}
                    description={(
                      <div className="min-w-0 overflow-hidden flex flex-row flex-nowrap gap-1">
                        <Badge variant="secondary" className="min-w-0 shrink">
                          <span>{protocolLabels[provider.protocol]}</span>
                        </Badge>
                        <div className="min-w-0 flex-1 flex flex-row items-center gap-1">
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="max-w-[min(34rem,42vw)] text-xs text-muted-foreground truncate">{provider.baseURL}</span>
                        </div>
                        <div className="shrink-0 flex flex-row items-center gap-1">
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground truncate">{`${provider.customModels.length} ${t('providers.customModels')}`}</span>
                        </div>
                      </div>
                    )}
                    endContent={(
                      <div className="shrink-0 flex flex-row items-center gap-2">
                        <Button variant="ghost" size="icon-sm" aria-label={`${t('providers.edit')} ${provider.name}`} title={t('providers.edit')} render={<Link to={`/providers/${provider.id}`} />}>
                          <PencilSquareIcon />
                        </Button>
                        <ActionPopover
                          label={`${t('providers.deleteLabel')} ${provider.name}`}
                          isOpen={providerToDelete?.id === provider.id}
                          isEnabled={!provider.isInUse}
                          onOpenChange={(isOpen) => {
                            setProviderToDelete(isOpen ? provider : null);
                          }}
                          content={(
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">{t('providers.deleteQuestion')}</span>
                              </div>
                              <div className="flex flex-row justify-end gap-2">
                                <Button
                                  onClick={() => {
                                    setProviderToDelete(null);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <span>{t('providers.cancel')}</span>
                                </Button>
                                <Button
                                  onClick={() => {
                                    providerRemoval.mutate(provider.id);
                                  }}
                                  variant="destructive"
                                  size="sm"
                                  disabled={providerRemoval.isPending && providerToDelete?.id === provider.id}
                                >
                                  {providerRemoval.isPending && providerToDelete?.id === provider.id && <Spinner />}
                                  <span>{t('providers.delete')}</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        >
                          <Button variant="ghost" size="icon-sm" disabled={provider.isInUse} aria-label={`${t('providers.deleteLabel')} ${provider.name}`} title={t('providers.deleteLabel')}>
                            <TrashIcon />
                          </Button>
                        </ActionPopover>
                        <Hint content={getToggleTooltip(provider)}>
                          <ToggleField
                            label={`${provider.name} ${t('providers.enabled')}`}
                            isLabelHidden
                            value={provider.status === 'active'}
                            onChange={(isChecked) => {
                              setStatus(provider, isChecked);
                            }}
                            isDisabled={provider.isInUse}
                            size="sm"
                          />
                        </Hint>
                      </div>
                    )}
                    className="rounded-lg border bg-card"
                  />
                ))}
              </div>
            )}
      </div>
    </>
  );
}
