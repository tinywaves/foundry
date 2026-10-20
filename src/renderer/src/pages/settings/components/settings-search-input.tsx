import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { TextInput } from '@astryxdesign/core/TextInput';
import type { SettingsSearch } from '../search';
import { useI18n } from '@renderer/i18n/use-i18n';

export function SettingsSearchInput({ search }: { search: SettingsSearch }) {
  const { t } = useI18n();
  return (
    <TextInput
      label={t('settings.search')}
      isLabelHidden
      placeholder={t('settings.search')}
      size="sm"
      width="100%"
      hasClear
      startIcon={MagnifyingGlassIcon}
      role="combobox"
      aria-autocomplete="list"
      aria-controls="settings-search-results"
      aria-expanded={search.isActive && search.results.length > 0}
      aria-activedescendant={search.activeResultId}
      value={search.query}
      onChange={search.setQuery}
      onKeyDown={search.onKeyDown}
    />
  );
}
