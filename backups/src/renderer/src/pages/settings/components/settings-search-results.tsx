import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Icon } from '@astryxdesign/core/Icon';
import { ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { panelConfig } from '../config';
import type { SearchableSetting } from '../types';
import { useI18n } from '@renderer/i18n/use-i18n';

export function SettingsSearchResults({
  results,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: {
  results: SearchableSetting[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (setting: SearchableSetting) => void;
}) {
  const { t } = useI18n();
  const translatedLabels: Record<string, string> = {
    'Color theme': t('settings.colorTheme'),
    'Time zone': t('settings.timezone'),
    'Appearance': t('settings.appearance'),
    'Language & region': t('settings.languageRegion'),
  };
  const translate = (value: string) => translatedLabels[value] ?? value;
  return results.length === 0
    ? (
        <VStack id="settings-search-results" gap={0.5} padding={2}>
          <Text type="label">{t('settings.noResults')}</Text>
          <Text type="supporting" color="secondary">{t('settings.trySearch')}</Text>
        </VStack>
      )
    : (
        <VStack
          as="ul"
          gap={0}
          id="settings-search-results"
          role="listbox"
          aria-label="Search results"
          isScrollable
        >
          {results.map((setting, index) => (
            <ListItem
              key={`${setting.panel}-${setting.title}`}
              id={`settings-search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              label={translate(setting.title)}
              description={`${translate(panelConfig(setting.panel).label)} · ${setting.description}`}
              startContent={<Icon icon={setting.icon} size="sm" color="secondary" />}
              endContent={<Icon icon={ChevronRightIcon} size="sm" color="secondary" />}
              isSelected={index === activeIndex}
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(setting)}
            />
          ))}
        </VStack>
      );
}
