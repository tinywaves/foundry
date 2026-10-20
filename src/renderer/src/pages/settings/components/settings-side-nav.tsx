import { Icon } from '@astryxdesign/core/Icon';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import * as stylex from '@stylexjs/stylex';
import { PANEL_GROUPS } from '../config';
import type { PanelId } from '../types';
import type { SettingsSearch } from '../search';
import { SettingsSearchInput } from './settings-search-input';
import { SettingsSearchResults } from './settings-search-results';

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
  return (
    <SideNav
      aria-label="Settings sections"
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
              title={group.label}
              xstyle={styles.sideNavSection}
            >
              {group.panels.map((panel) => (
                <SideNavItem
                  key={panel.id}
                  label={panel.label}
                  icon={<Icon icon={panel.icon} size="sm" color="primary" />}
                  isSelected={panel.id === activePanel}
                  onClick={() => onSelectPanel(panel.id)}
                />
              ))}
            </SideNavSection>
          ))}
    </SideNav>
  );
}
