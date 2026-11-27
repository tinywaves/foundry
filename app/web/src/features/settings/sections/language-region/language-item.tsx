import type { LanguageMode } from '@dhzh/foundry-shared';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UI_LANGUAGES, UI_LANGUAGE_LABELS } from '@/i18n/resources';

import { SettingsItem } from '../../components/settings-item';

interface LanguageItemProps {
  value: LanguageMode;
  onValueChange: (value: LanguageMode) => void;
  disabled?: boolean;
}

export function LanguageItem({
  value,
  onValueChange,
  disabled = false,
}: LanguageItemProps) {
  const { t } = useTranslation();
  const options: Array<{ value: LanguageMode; label: string }> = [
    { value: 'system', label: t('common.system') },
    ...UI_LANGUAGES.map((language) => ({
      value: language,
      label: UI_LANGUAGE_LABELS[language],
    })),
  ];

  return (
    <SettingsItem label={t('settings.language')}>
      <Select<LanguageMode>
        items={options}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={t('settings.language')}
          className="w-52"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsItem>
  );
}
