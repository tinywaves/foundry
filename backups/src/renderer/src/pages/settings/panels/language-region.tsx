import { ClockIcon, GlobeAltIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { Selector } from '@astryxdesign/core/Selector';
import { useI18n } from '@renderer/i18n/use-i18n';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import { CONTROL_WIDTH } from '../components/settings-row-styles';
import type { PanelProps, SettingsState, TimeFormatPattern, TimeZoneCode } from '../types';

export function LanguagePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsRow
        title={t('settings.language')}
        icon={LanguageIcon}
        description={t('settings.languageDescription')}
        control={(
          <Selector
            label={t('settings.language')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
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
        title={t('settings.timeFormat')}
        icon={ClockIcon}
        description={t('settings.timeFormatDescription')}
        control={(
          <Selector
            label={t('settings.timeFormat')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
            value={settings.timeFormat}
            onChange={(value) => update('timeFormat', value as TimeFormatPattern)}
            options={[
              { value: 'YYYY-MM-DD HH:mm:ss', label: 'YYYY-MM-DD HH:mm:ss' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              { value: 'YYYY/MM/DD HH:mm:ss', label: 'YYYY/MM/DD HH:mm:ss' },
              { value: 'DD/MM/YYYY HH:mm:ss', label: 'DD/MM/YYYY HH:mm:ss' },
              { value: 'MM/DD/YYYY hh:mm:ss A', label: 'MM/DD/YYYY hh:mm:ss A' },
              { value: 'HH:mm:ss', label: 'HH:mm:ss' },
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
            width={CONTROL_WIDTH}
            value={settings.timezone}
            onChange={(value) => update('timezone', value as TimeZoneCode)}
            options={[
              { value: 'America/Los_Angeles', label: t('settings.losAngeles') },
              { value: 'America/New_York', label: t('settings.newYork') },
              { value: 'Asia/Shanghai', label: t('settings.shanghai') },
              { value: 'Asia/Taipei', label: t('settings.taipei') },
              { value: 'Asia/Tokyo', label: t('settings.tokyo') },
              { value: 'UTC', label: t('settings.utc') },
            ]}
          />
        )}
      />
    </SettingsCard>
  );
}
