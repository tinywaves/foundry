import { TIME_ZONES } from '@dhzh/foundry-shared';
import type { TimeZoneCode } from '@dhzh/foundry-shared';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { SettingsItem } from '../../components/settings-item';

const timeZoneOptions: Array<{ value: TimeZoneCode; label: string }>
  = TIME_ZONES.map((timeZone) => ({ value: timeZone, label: timeZone }));

interface TimeZoneItemProps {
  value: TimeZoneCode;
  onValueChange: (value: TimeZoneCode) => void;
  disabled?: boolean;
}

export function TimeZoneItem({
  value,
  onValueChange,
  disabled = false,
}: TimeZoneItemProps) {
  const { t } = useTranslation();

  return (
    <SettingsItem label={t('settings.timeZone')}>
      <Select<TimeZoneCode>
        items={timeZoneOptions}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={t('settings.timeZone')}
          className="w-52"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeZoneOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsItem>
  );
}
