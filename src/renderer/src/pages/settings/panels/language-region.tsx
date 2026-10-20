import { GlobeAltIcon, LanguageIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Selector } from '@astryxdesign/core/Selector';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import type { PanelProps } from '../types';

export function LanguagePanel({ settings, update }: PanelProps) {
  return (
    <SettingsCard title="Language & region">
      <SettingsRow
        title="Language"
        icon={LanguageIcon}
        description="Used across menus, buttons, and email."
        control={(
          <Selector
            label="Language"
            isLabelHidden
            size="sm"
            width={192}
            value={settings.language}
            onChange={(value) => update('language', value)}
            options={[
              {
                value: 'en-US',
                label: 'English (US)',
              },
              {
                value: 'en-GB',
                label: 'English (UK)',
              },
              {
                value: 'fr',
                label: 'Français',
              },
              {
                value: 'de',
                label: 'Deutsch',
              },
              {
                value: 'ja',
                label: '日本語',
              },
            ]}
          />
        )}
      />
      <SettingsRow
        title="Region format"
        icon={MapPinIcon}
        description="Dates, numbers, and currency."
        control={(
          <Selector
            label="Region format"
            isLabelHidden
            size="sm"
            width={192}
            value={settings.region}
            onChange={(value) => update('region', value)}
            options={[{ value: 'US', label: 'United States' }, { value: 'GB', label: 'United Kingdom' }, { value: 'DE', label: 'Germany' }, { value: 'JP', label: 'Japan' }]}
          />
        )}
      />
      <SettingsRow
        title="Time zone"
        icon={GlobeAltIcon}
        description="Used for scheduling and every timestamp you see."
        control={(
          <Selector
            label="Time zone"
            isLabelHidden
            size="sm"
            width={192}
            value={settings.timezone}
            onChange={(value) => update('timezone', value)}
            options={[
              {
                value: 'PT',
                label: 'Pacific (GMT-08:00)',
              },
              {
                value: 'MT',
                label: 'Mountain (GMT-07:00)',
              },
              {
                value: 'CT',
                label: 'Central (GMT-06:00)',
              },
              {
                value: 'ET',
                label: 'Eastern (GMT-05:00)',
              },
              {
                value: 'UTC',
                label: 'UTC (GMT+00:00)',
              },
            ]}
          />
        )}
      />
    </SettingsCard>
  );
}
