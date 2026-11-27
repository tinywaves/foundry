import { CircleHelpIcon, DownloadIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DownloadSkillDialog } from '../../components/download-skill-dialog';
import { SettingsItem } from '../../components/settings-item';

export function DownloadSkillItem({ disabled = false }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsItem
      label={(
        <span className="flex items-center gap-1">
          {t('settings.downloadSkill')}
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground"
                  aria-label={t('settings.aboutFoundrySkill')}
                />
              )}
            >
              <CircleHelpIcon />
            </TooltipTrigger>
            <TooltipContent>{t('settings.foundrySkillHint')}</TooltipContent>
          </Tooltip>
        </span>
      )}
    >
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setIsOpen(true)}>
        <DownloadIcon />
        {t('settings.downloadSkill')}
      </Button>
      {isOpen && <DownloadSkillDialog onClose={() => setIsOpen(false)} />}
    </SettingsItem>
  );
}
