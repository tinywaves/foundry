import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

import type { ThemeMode } from '../../shared/settings';
import { SettingsItem } from './settings-item';

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

interface ColorThemeItemProps {
  value: ThemeMode;
  onValueChange: (value: ThemeMode) => void;
  disabled?: boolean;
}

export function ColorThemeItem({
  value,
  onValueChange,
  disabled = false,
}: ColorThemeItemProps) {
  return (
    <SettingsItem label="Color theme">
      <RadioGroup<ThemeMode>
        aria-label="Color theme"
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        aria-busy={disabled}
        className="flex w-auto flex-row flex-wrap items-center gap-x-6 gap-y-2"
      >
        {themeOptions.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex select-none items-center gap-2 text-sm',
              option.value === value ? 'font-medium text-foreground' : 'text-muted-foreground',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            )}
          >
            <RadioGroupItem value={option.value} disabled={disabled} />
            <span>{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    </SettingsItem>
  );
}
