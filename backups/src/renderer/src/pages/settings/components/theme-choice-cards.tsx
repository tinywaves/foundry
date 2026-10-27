import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Text } from '@astryxdesign/core/Text';
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { IconComponent } from '../types';
import { ThemePreviewMock } from './theme-preview-mock';
import { VStack } from '@astryxdesign/core/VStack';
import { useI18n } from '@renderer/i18n/use-i18n';

const THEME_CHOICES: Array<{
  value: string;
  labelKey: 'settings.light' | 'settings.dark' | 'settings.system';
  scheme: 'light' | 'dark' | 'system';
  icon: IconComponent;
}> = [
  { value: 'light', labelKey: 'settings.light', scheme: 'light', icon: SunIcon },
  { value: 'dark', labelKey: 'settings.dark', scheme: 'dark', icon: MoonIcon },
  { value: 'system', labelKey: 'settings.system', scheme: 'system', icon: ComputerDesktopIcon },
];

export function ThemeChoiceCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Grid
      role="radiogroup"
      aria-label="Color theme"
      columns={{ minWidth: 96, max: 3 }}
      gap={2}
      maxWidth={480}
    >
      {THEME_CHOICES.map((choice) => {
        const isSelected = choice.value === value;
        const label = t(choice.labelKey);
        return (
          <SelectableCard
            key={choice.value}
            label={label}
            isSelected={isSelected}
            padding={2}
            onChange={() => {
              if (!isSelected) {
                onChange(choice.value);
              }
            }}
          >
            <VStack gap={1.5}>
              <ThemePreviewMock scheme={choice.scheme} />
              <HStack gap={1} align="center" justify="center">
                <Icon icon={choice.icon} size="sm" color="secondary" />
                <Text
                  type="supporting"
                  weight={isSelected ? 'semibold' : undefined}
                >
                  {label}
                </Text>
              </HStack>
            </VStack>
          </SelectableCard>
        );
      })}
    </Grid>
  );
}
