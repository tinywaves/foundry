import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import {
  CheckboxList,
  CheckboxListItem,
} from '@astryxdesign/core/CheckboxList';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { HStack } from '@astryxdesign/core/Stack';
import { useMutation } from '@tanstack/react-query';
import { useAppToast } from '../../lib/api';
import { useI18n } from '../../i18n';
import { copyBundledSkill } from './skill-copy-api';
import type { BundledSkillTarget } from './skill-copy-api';

export function DownloadSkillDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const [targets, setTargets] = useState<BundledSkillTarget[]>(['agents']);
  const mutation = useMutation({
    mutationFn: () => copyBundledSkill(targets),
    onSuccess: (result) => {
      toast({
        body: `${t('settings.skillDownloaded')} ${
          result.installed.map((item) => item.destination).join(', ')
        }`,
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
    <Dialog
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
      <Layout
        header={(
          <DialogHeader
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
          <LayoutContent>
            <CheckboxList
              label={t('settings.downloadSkillTargets')}
              value={targets}
              onChange={(values) => {
                setTargets(values.filter(isBundledSkillTarget));
              }}
              hasDividers
              width="100%"
            >
              <CheckboxListItem
                label=".agents"
                value="agents"
                description={t('settings.downloadSkillAgentsDescription')}
              />
              <CheckboxListItem
                label=".claude"
                value="claude"
                description={t('settings.downloadSkillClaudeDescription')}
              />
            </CheckboxList>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button
                label={t('settings.skillCancel')}
                variant="ghost"
                size="sm"
                isDisabled={mutation.isPending}
                onClick={onClose}
              />
              <Button
                label={t('settings.downloadSkillAction')}
                variant="primary"
                size="sm"
                isLoading={mutation.isPending}
                isDisabled={targets.length === 0}
                onClick={() => {
                  mutation.mutate();
                }}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function isBundledSkillTarget(value: string): value is BundledSkillTarget {
  return value === 'agents' || value === 'claude';
}
