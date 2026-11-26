import type { ThemeMode } from '@dhzh/foundry-shared';
import { useTranslation } from 'react-i18next';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

import { SettingsItem } from './settings-item';

const themeOptions: Array<{
  value: ThemeMode;
  labelKey: 'common.system' | 'theme.light' | 'theme.dark';
}> = [
  { value: 'system', labelKey: 'common.system' },
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
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
  const { t } = useTranslation();

  return (
    <SettingsItem label={t('settings.colorTheme')}>
      <RadioGroup<ThemeMode>
        aria-label={t('settings.colorTheme')}
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
            <span>{t(option.labelKey)}</span>
          </label>
        ))}
      </RadioGroup>
    </SettingsItem>
  );
}
