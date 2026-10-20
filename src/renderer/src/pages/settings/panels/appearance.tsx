import { PaintBrushIcon } from '@heroicons/react/24/outline';
import { VStack } from '@astryxdesign/core/VStack';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import { ThemeChoiceCards } from '../components/theme-choice-cards';
import type { PanelProps, SettingsState } from '../types';

export function AppearancePanel({ settings, update }: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="Color">
        <SettingsRow
          title="Color theme"
          icon={PaintBrushIcon}
          description="Applies to this browser only."
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
