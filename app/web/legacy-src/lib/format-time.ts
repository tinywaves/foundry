import type {
  SettingsSnapshot,
  TimeFormatPattern,
  TimeZoneCode,
} from '../shared/settings';

type DateParts = {
  year: string;
  month: string;
  day: string;
  hour24: string;
  hour12: string;
  minute: string;
  second: string;
  dayPeriod: string;
};

export function formatTimestamp(value: string, settings: SettingsSnapshot): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const { timeZone, pattern } = timeSettings(settings);
  const parts = dateParts(date, timeZone);
  const tokens: Record<string, string> = {
    YYYY: parts.year,
    MM: parts.month,
    DD: parts.day,
    HH: parts.hour24,
    hh: parts.hour12,
    mm: parts.minute,
    ss: parts.second,
    A: parts.dayPeriod,
  };

  return pattern.replaceAll(/YYYY|MM|DD|HH|hh|mm|ss|A/gu, (token) => tokens[token] ?? token);
}

export function formatRecordTimes<T extends { createdAt: string; updatedAt: string }>(
  record: T,
  settings: SettingsSnapshot,
): T {
  return {
    ...record,
    createdAt: formatTimestamp(record.createdAt, settings),
    updatedAt: formatTimestamp(record.updatedAt, settings),
  };
}

function timeSettings(settings: SettingsSnapshot): {
  timeZone: TimeZoneCode;
  pattern: TimeFormatPattern;
} {
  const languageRegion = settings.workspace['language-region'];
  return {
    timeZone: languageRegion['time-zone'],
    pattern: languageRegion['time-format'],
  };
}

function dateParts(date: Date, timeZone: TimeZoneCode): DateParts {
  const parts24 = numericParts(date, timeZone, 'h23');
  const parts12 = numericParts(date, timeZone, 'h12');
  return {
    year: parts24.get('year') ?? '',
    month: parts24.get('month') ?? '',
    day: parts24.get('day') ?? '',
    hour24: parts24.get('hour') ?? '',
    hour12: parts12.get('hour') ?? '',
    minute: parts24.get('minute') ?? '',
    second: parts24.get('second') ?? '',
    dayPeriod: parts12.get('dayPeriod') ?? '',
  };
}

function numericParts(
  date: Date,
  timeZone: TimeZoneCode,
  hourCycle: 'h12' | 'h23',
): Map<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle,
    timeZone,
  }).formatToParts(date);

  return new Map(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
}
