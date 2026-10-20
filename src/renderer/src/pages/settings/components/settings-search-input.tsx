import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { TextInput } from '@astryxdesign/core/TextInput';
import type { SettingsSearch } from '../search';

export function SettingsSearchInput({ search }: { search: SettingsSearch }) {
  return (
    <TextInput
      label="Search settings"
      isLabelHidden
      placeholder="Search settings"
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
