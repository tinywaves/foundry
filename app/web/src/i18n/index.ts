import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources, UI_LANGUAGES } from './resources';
import type { UiLanguage } from './resources';

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSystemLanguage(),
    fallbackLng: 'en-US',
    supportedLngs: [...UI_LANGUAGES],
    keySeparator: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export function getSystemLanguage(): UiLanguage {
  const normalized = new Intl.DateTimeFormat()
    .resolvedOptions()
    .locale
    .toLowerCase();

  if (
    normalized.startsWith('zh-tw')
    || normalized.startsWith('zh-hk')
    || normalized.startsWith('zh-mo')
    || normalized.startsWith('zh-hant')
  ) {
    return 'zh-TW';
  }
  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }
  if (normalized.startsWith('ja')) {
    return 'ja-JP';
  }

  return 'en-US';
}

export { default as i18n } from 'i18next';
