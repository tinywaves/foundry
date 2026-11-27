import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Modal, PanelLayout, ModalHeader, ContentPane, CheckList, CheckListItem, Footer } from '@/components/workbench';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAppToast } from '../../lib/api';
import { useI18n } from '../../i18n';
import { copyBundledSkill, getBundledSkillTargets } from './skill-copy-api';
import type { BundledSkillTarget } from './skill-copy-api';

export function DownloadSkillDialog({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const [targets, setTargets] = useState<BundledSkillTarget[]>(['agents']);
  const targetsQuery = useQuery({
    queryKey: ['settings', 'skill-copy-targets'],
    queryFn: getBundledSkillTargets,
    enabled: isOpen,
  });
  const mutation = useMutation({
    mutationFn: () => copyBundledSkill(targets),
    onSuccess: (result) => {
      toast({
        body: `${t('settings.skillDownloaded')} ${result.installed.map((item) => item.destination).join(', ')}`,
        uniqueID: 'skill-downloaded',
      });
      onClose();
    },
    onError: () => {
      toast({
        body: t('settings.skillDownloadFailed'),
        type: 'error',
        uniqueID: 'skill-download-failed',
      });
    },
  });
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          onClose();
        }
      }}
      width={520}
      padding={5}
      purpose="form"
    >
      <PanelLayout
        header={(
          <ModalHeader
            title={t('settings.downloadSkill')}
            subtitle={t('settings.downloadSkillDescription')}
            onOpenChange={() => {
              if (!mutation.isPending) {
                onClose();
              }
            }}
          />
        )}
        content={(
          <ContentPane>
            <CheckList
              label={t('settings.downloadSkillTargets')}
              value={targets}
              onChange={(values) => {
                setTargets(values.filter(isBundledSkillTarget));
              }}
              hasDividers
              width="100%"
            >
              <CheckListItem
                label=".agents"
                value="agents"
                description={targetDestination(targetsQuery.data, 'agents')
                  ?? t('settings.downloadSkillResolvingPath')}
              />
              <CheckListItem
                label=".claude"
                value="claude"
                description={targetDestination(targetsQuery.data, 'claude')
                  ?? t('settings.downloadSkillResolvingPath')}
              />
            </CheckList>
          </ContentPane>
        )}
        footer={(
          <Footer>
            <div className="flex flex-row justify-end gap-2">
              <Button onClick={onClose} variant="ghost" size="sm" disabled={mutation.isPending}>
                <span>{t('settings.skillCancel')}</span>
              </Button>
              <Button
                onClick={() => {
                  mutation.mutate();
                }}
                variant="default"
                size="sm"
                disabled={targets.length === 0 || mutation.isPending}
              >
                {mutation.isPending && <Spinner />}
                <span>{t('settings.downloadSkillAction')}</span>
              </Button>
            </div>
          </Footer>
        )}
      />
    </Modal>
  );
}
function isBundledSkillTarget(value: string): value is BundledSkillTarget {
  return value === 'agents' || value === 'claude';
}
function targetDestination(result: Awaited<ReturnType<typeof getBundledSkillTargets>> | undefined, target: BundledSkillTarget): string | undefined {
  return result?.targets.find((item) => item.target === target)?.destination;
}
