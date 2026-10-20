import { GlobeAltIcon, LanguageIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Selector } from '@astryxdesign/core/Selector';
import { useI18n } from '@renderer/i18n/use-i18n';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import type { PanelProps, SettingsState } from '../types';

export function LanguagePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <SettingsCard title={t('settings.languageRegion')}>
      <SettingsRow
        title={t('settings.language')}
        icon={LanguageIcon}
        description={t('settings.languageDescription')}
        control={(
          <Selector
            label={t('settings.language')}
            isLabelHidden
            size="sm"
            width={192}
            value={settings.language}
            onChange={(value) => update('language', value as SettingsState['language'])}
            options={[
              { value: 'system', label: t('settings.system') },
              { value: 'en-US', label: 'English' },
              { value: 'zh-CN', label: '简体中文' },
              { value: 'zh-TW', label: '繁體中文（台灣）' },
              { value: 'ja-JP', label: '日本語' },
            ]}
          />
        )}
      />
      <SettingsRow
        title={t('settings.regionFormat')}
        icon={MapPinIcon}
        description={t('settings.regionFormatDescription')}
        control={(
          <Selector
            label={t('settings.regionFormat')}
            isLabelHidden
            size="sm"
            width={192}
            value={settings.region}
            onChange={(value) => update('region', value)}
            options={[
              { value: 'US', label: t('settings.unitedStates') },
              { value: 'GB', label: t('settings.unitedKingdom') },
              { value: 'DE', label: t('settings.germany') },
              { value: 'JP', label: t('settings.japan') },
            ]}
          />
        )}
      />
      <SettingsRow
        title={t('settings.timezone')}
        icon={GlobeAltIcon}
        description={t('settings.timezoneDescription')}
        control={(
          <Selector
            label={t('settings.timezone')}
            isLabelHidden
            size="sm"
            width={192}
            value={settings.timezone}
            onChange={(value) => update('timezone', value)}
            options={[
              { value: 'PT', label: t('settings.pacific') },
              { value: 'MT', label: t('settings.mountain') },
              { value: 'CT', label: t('settings.central') },
              { value: 'ET', label: t('settings.eastern') },
              { value: 'UTC', label: t('settings.utc') },
            ]}
          />
        )}
      />
    </SettingsCard>
  );
}
