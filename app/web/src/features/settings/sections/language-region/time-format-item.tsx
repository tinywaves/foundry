import { TIME_FORMATS } from '@dhzh/foundry-shared';
import type { TimeFormatPattern } from '@dhzh/foundry-shared';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { SettingsItem } from '../../components/settings-item';

const timeFormatOptions: Array<{
  value: TimeFormatPattern;
  label: string;
}> = TIME_FORMATS.map((timeFormat) => ({
  value: timeFormat,
  label: timeFormat,
}));

interface TimeFormatItemProps {
  value: TimeFormatPattern;
  onValueChange: (value: TimeFormatPattern) => void;
  disabled?: boolean;
}

export function TimeFormatItem({
  value,
  onValueChange,
  disabled = false,
}: TimeFormatItemProps) {
  const { t } = useTranslation();

  return (
    <SettingsItem label={t('settings.timeFormat')}>
      <Select<TimeFormatPattern>
        items={timeFormatOptions}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={t('settings.timeFormat')}
          className="w-52"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeFormatOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsItem>
  );
}
