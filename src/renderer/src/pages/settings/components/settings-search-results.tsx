import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Icon } from '@astryxdesign/core/Icon';
import { ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { panelConfig } from '../config';
import type { SearchableSetting } from '../types';

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
  return results.length === 0
    ? (
        <VStack id="settings-search-results" gap={0.5} padding={2}>
          <Text type="label">No settings found</Text>
          <Text type="supporting" color="secondary">Try theme, language, or sessions.</Text>
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
              label={setting.title}
              description={`${panelConfig(setting.panel).label} · ${setting.description}`}
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
