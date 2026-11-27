import { CheckIcon, CopyIcon, FolderOpenIcon, LoaderCircleIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { openConfigFolder } from '../../api';
import { SettingsItem } from '../../components/settings-item';

export function ConfigFolderItem({ configFolder }: { configFolder?: string }) {
  const { t } = useTranslation();
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyMutation = useMutation({
    mutationFn: async (path: string) => {
      // This navigator is the browser Clipboard API, not Node's navigator.
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      await navigator.clipboard.writeText(path);
    },
    onSuccess: () => {
      toast.success(t('settings.configFolderCopied'));
    },
    onError: () => {
      toast.error(t('settings.errors.copyConfigFolder'));
    },
  });
  const openMutation = useMutation({
    mutationFn: openConfigFolder,
    onError: () => {
      toast.error(t('settings.errors.openConfigFolder'));
    },
  });
  const isCopied = copyMutation.isSuccess && copyMutation.variables === configFolder;
  const isDisabled = !configFolder || copyMutation.isPending || openMutation.isPending;
  const copyLabel = t(isCopied ? 'settings.configFolderCopied' : 'settings.copyConfigFolder');

  return (
    <SettingsItem
      label={t('settings.configFolder')}
      controlClassName="min-[680px]:shrink"
    >
      <div className="flex min-w-0 items-center justify-end gap-2 max-[680px]:justify-start">
        {configFolder && (
          <span className="min-w-0 select-text break-all font-mono text-xs text-muted-foreground">
            {configFolder}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={copyLabel}
          title={copyLabel}
          disabled={isDisabled}
          aria-busy={copyMutation.isPending}
          onClick={() => {
            if (!configFolder || isDisabled) {
              return;
            }

            if (copyResetTimerRef.current) {
              clearTimeout(copyResetTimerRef.current);
            }
            copyMutation.mutate(configFolder, {
              onSuccess: () => {
                copyResetTimerRef.current = setTimeout(() => copyMutation.reset(), 2000);
              },
            });
          }}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isDisabled}
          aria-busy={openMutation.isPending}
          onClick={() => {
            if (!isDisabled) {
              openMutation.mutate();
            }
          }}
        >
          {openMutation.isPending ? <LoaderCircleIcon className="animate-spin" /> : <FolderOpenIcon />}
          <span>{t('settings.openFolder')}</span>
        </Button>
      </div>
    </SettingsItem>
  );
}
