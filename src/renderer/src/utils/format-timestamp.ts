import type { LanguageMode, RegionCode, SettingsSnapshot, TimeZoneCode } from '../../../shared/settings';

const REGION_LOCALES: Record<RegionCode, string> = {
  US: 'en-US',
  CN: 'zh-CN',
  TW: 'zh-TW',
  JP: 'ja-JP',
};

const LANGUAGE_LOCALES: Record<Exclude<LanguageMode, 'system'>, string> = {
  'en-US': 'en-US',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'ja-JP': 'ja-JP',
};

const LANGUAGE_REGIONS: Record<Exclude<LanguageMode, 'system'>, RegionCode> = {
  'en-US': 'US',
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  'ja-JP': 'JP',
};

function resolveLanguageLocale(language: LanguageMode): string {
  return language === 'system'
    ? new Intl.DateTimeFormat().resolvedOptions().locale
    : LANGUAGE_LOCALES[language];
}

function isLanguageRegionMatch(language: LanguageMode, locale: string, region: RegionCode): boolean {
  if (language === 'system') {
    const localeRegion = new Intl.Locale(locale).region;
    return localeRegion ? REGION_LOCALES[region].endsWith(localeRegion) : false;
  }
  return LANGUAGE_REGIONS[language] === region;
}

function localizedDayPeriod(locale: string, timeZone: TimeZoneCode, date: Date): string | null {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true, timeZone })
    .formatToParts(date)
    .find((part) => part.type === 'dayPeriod')
    ?.value ?? null;
}

function formatMismatchedLocale(
  date: Date,
  languageLocale: string,
  region: RegionCode,
  timeZone: TimeZoneCode,
): string {
  const shouldUse12HourClock = region === 'US';
  const parts = new Intl.DateTimeFormat(REGION_LOCALES[region], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: shouldUse12HourClock,
    timeZone,
  }).formatToParts(date);
  const dayPeriod = shouldUse12HourClock
    ? localizedDayPeriod(languageLocale, timeZone, date)
    : null;

  return parts.map((part) => (
    dayPeriod && part.type === 'dayPeriod' ? dayPeriod : part.value
  )).join('').replaceAll(/\s+/g, ' ').trim();
}

export function formatTimestamp(
  value: string,
  settings: SettingsSnapshot,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const language = settings.workspace['language-region'].language;
  const languageLocale = resolveLanguageLocale(language);
  const region = settings.workspace['language-region']['region-format'];
  const timeZone = settings.workspace['language-region']['time-zone'];

  if (isLanguageRegionMatch(language, languageLocale, region)) {
    return new Intl.DateTimeFormat(languageLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  }

  return formatMismatchedLocale(date, languageLocale, region, timeZone);
}
