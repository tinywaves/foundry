import { expect, it } from 'vitest';
import { SEARCHABLE_SETTINGS, isSettingMatch } from '../features/settings/config';
import { translations } from '../i18n/messages';
import type { TranslationKey } from '../i18n/messages';

const translateChinese = (key: TranslationKey) => translations['zh-CN'][key];
const translateEnglish = (key: TranslationKey) => translations['en-US'][key];

it('searches settings using the active locale', () => {
  const colorTheme = SEARCHABLE_SETTINGS.find((setting) => setting.id === 'color-theme');
  if (!colorTheme) {
    throw new Error('Color theme setting was not found');
  }

  expect(isSettingMatch(colorTheme, '主题', translateChinese)).toBe(true);
  expect(isSettingMatch(colorTheme, '颜色', translateChinese)).toBe(true);
  expect(isSettingMatch(colorTheme, 'theme', translateChinese)).toBe(false);

  expect(isSettingMatch(colorTheme, 'theme', translateEnglish)).toBe(true);
});
