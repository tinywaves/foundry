import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Text } from '@astryxdesign/core/Text';
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { IconComponent } from '../types';
import { ThemePreviewMock } from './theme-preview-mock';
import { VStack } from '@astryxdesign/core/VStack';

const THEME_CHOICES: Array<{
  value: string;
  label: string;
  scheme: 'light' | 'dark' | 'system';
  icon: IconComponent;
}> = [
  { value: 'light', label: 'Light', scheme: 'light', icon: SunIcon },
  { value: 'dark', label: 'Dark', scheme: 'dark', icon: MoonIcon },
  { value: 'system', label: 'System', scheme: 'system', icon: ComputerDesktopIcon },
];

export function ThemeChoiceCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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
        return (
          <SelectableCard
            key={choice.value}
            label={choice.label}
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
                  {choice.label}
                </Text>
              </HStack>
            </VStack>
          </SelectableCard>
        );
      })}
    </Grid>
  );
}
