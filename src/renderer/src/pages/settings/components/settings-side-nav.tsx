import { Icon } from '@astryxdesign/core/Icon';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import * as stylex from '@stylexjs/stylex';
import { PANEL_GROUPS } from '../config';
import type { PanelId } from '../types';
import type { SettingsSearch } from '../search';
import { SettingsSearchInput } from './settings-search-input';
import { SettingsSearchResults } from './settings-search-results';
import { useI18n } from '@renderer/i18n/use-i18n';

const styles = stylex.create({
  sideNav: { flexShrink: 0 },
  sideNavSection: { paddingBlock: 'var(--spacing-2)' },
});

export function SettingsSideNav({
  search,
  activePanel,
  onSelectPanel,
}: {
  search: SettingsSearch;
  activePanel: PanelId;
  onSelectPanel: (panel: PanelId) => void;
}) {
  const { t } = useI18n();
  const panelLabel = (panel: PanelId) => {
    switch (panel) {
      case 'appearance': {
        return t('settings.appearance');
      }
      case 'language': {
        return t('settings.languageRegion');
      }
      case 'library': {
        return t('settings.library');
      }
      case 'advanced': {
        return t('settings.advanced');
      }
    }
  };
  return (
    <SideNav
      aria-label={t('settings.search')}
      xstyle={styles.sideNav}
      topContent={<SettingsSearchInput search={search} />}
    >
      {search.isActive
        ? (
            <SettingsSearchResults
              results={search.results}
              activeIndex={search.activeIndex}
              onActiveIndexChange={search.setActiveIndex}
              onSelect={(setting) => onSelectPanel(setting.panel)}
            />
          )
        : PANEL_GROUPS.map((group) => (
            <SideNavSection
              key={group.label}
              title={t(group.label === 'Workspace' ? 'settings.workspace' : 'settings.features')}
              xstyle={styles.sideNavSection}
            >
              {group.panels.map((panel) => (
                <SideNavItem
                  key={panel.id}
                  label={panelLabel(panel.id)}
                  icon={<Icon icon={panel.icon} size="sm" color="primary" />}
                  size="sm"
                  isSelected={panel.id === activePanel}
                  onClick={() => onSelectPanel(panel.id)}
                />
              ))}
            </SideNavSection>
          ))}
    </SideNav>
  );
}
