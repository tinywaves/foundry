import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { SEARCHABLE_SETTINGS, isSettingMatch } from './config';
import type { PanelId } from './types';
import { useI18n } from '../../i18n';

export function useSettingsSearch(onSelectPanel: (panel: PanelId) => void) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalized = query.trim().toLowerCase();
  const isActive = normalized.length > 0;
  const results = useMemo(
    () => isActive
      ? SEARCHABLE_SETTINGS.filter((setting) =>
          isSettingMatch(setting, normalized, t))
      : [],
    [isActive, normalized, t],
  );
  const onKeyDown: ComponentProps<'input'>['onKeyDown'] = (event) => {
    if (query && event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
      return;
    }
    if (!isActive || results.length === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % results.length);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + results.length) % results.length);
        break;
      }
      case 'Enter': {
        event.preventDefault();
        onSelectPanel(results[activeIndex].panel);
        break;
      }
      default: {
        break;
      }
    }
  };
  return {
    query,
    setQuery,
    isActive,
    results,
    activeIndex,
    setActiveIndex,
    onKeyDown,
    activeResultId: isActive && results.length > 0 ? `settings-search-result-${activeIndex}` : undefined,
  };
}
export type SettingsSearch = ReturnType<typeof useSettingsSearch>;
