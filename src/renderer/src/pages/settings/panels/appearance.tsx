import { PaintBrushIcon } from '@heroicons/react/24/outline';
import { VStack } from '@astryxdesign/core/VStack';
import { useI18n } from '@renderer/i18n/use-i18n';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import { ThemeChoiceCards } from '../components/theme-choice-cards';
import type { PanelProps, SettingsState } from '../types';

export function AppearancePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <VStack gap={5}>
      <SettingsCard>
        <SettingsRow
          title={t('settings.colorTheme')}
          icon={PaintBrushIcon}
          description={t('settings.colorThemeDescription')}
          detail={(
            <ThemeChoiceCards
              value={settings.theme}
              onChange={(value) => update('theme', value as SettingsState['theme'])}
            />
          )}
        />
      </SettingsCard>
    </VStack>
  );
}
