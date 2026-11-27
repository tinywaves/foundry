import { useMutation, useQuery } from '@tanstack/react-query';
import type { BundledSkillTarget } from '@dhzh/foundry-shared';
import { DownloadIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadSkill, getSkillTargets } from '../api';

export function DownloadSkillDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [targets, setTargets] = useState<BundledSkillTarget[]>(['agents']);
  const query = useQuery({ queryKey: ['skill-targets'], queryFn: ({ signal }) => getSkillTargets(signal), retry: false });
  const mutation = useMutation({
    mutationFn: downloadSkill,
    onSuccess: () => {
      toast.success(t('settings.skillDownloaded'));
      onClose();
    },
    onError: () => toast.error(t('settings.errors.downloadSkill')),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <form
          className="flex flex-col gap-4"
          aria-busy={mutation.isPending}
          onSubmit={(event) => {
            event.preventDefault();
            if (targets.length > 0 && query.isSuccess && !mutation.isPending) {
              mutation.mutate({ targets });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('settings.downloadSkill')}</DialogTitle>
            <DialogDescription>{t('settings.downloadSkillDescription')}</DialogDescription>
          </DialogHeader>
          {query.isPending && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {query.isError && (
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
            >
              {t('common.retry')}
            </Button>
          )}
          {query.data && (
            <div className="flex flex-col gap-2">
              {query.data.targets.map(({ target, destination }) => (
                <Label
                  key={target}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    checked={targets.includes(target)}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) => {
                      setTargets((previous) => (checked ? [...previous, target] : previous.filter((item) => item !== target)));
                    }}
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span>{target === 'agents' ? '.agents' : '.claude'}</span>
                    <span
                      className="
                        font-mono text-xs font-normal break-all
                        text-muted-foreground
                      "
                    >
                      {destination}
                    </span>
                  </span>
                </Label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={targets.length === 0 || !query.isSuccess || mutation.isPending}>
              {mutation.isPending ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
              <span>{t(mutation.isPending ? 'settings.downloadingSkill' : 'settings.downloadSkill')}</span>
            </Button>
          </DialogFooter>
        </form>
        <DialogClose
          disabled={mutation.isPending}
          render={(
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2"
            />
          )}
        >
          <XIcon />
          <span className="sr-only">{t('a11y.close')}</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
