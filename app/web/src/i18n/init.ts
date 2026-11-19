import { i18n } from './instance';
import { translations } from './messages';

const resources = Object.fromEntries(
  Object.entries(translations).map(([locale, table]) => [locale, { translation: table }]),
);

if (!i18n.isInitialized) {
  void i18n.init({
    resources,
    lng: 'en-US',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  });
}
