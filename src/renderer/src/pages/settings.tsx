'use client';

import { Layout } from '@astryxdesign/core/Layout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSettings, setTheme, settingsKeys } from '../settings';
import { SettingsContentPane } from './settings/components/settings-content-pane';
import { SettingsSideNav } from './settings/components/settings-side-nav';
import { useSettingsSearch } from './settings/search';
import { DEFAULT_PANEL } from './settings/config';
import type { PanelId, SettingsState, UpdateSetting } from './settings/types';
import { INITIAL_SETTINGS } from './settings/types';

export default function SettingsPage() {
  const [activePanel, setActivePanel] = useState<PanelId>(DEFAULT_PANEL);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const themeMutation = useMutation({ mutationFn: setTheme, onSuccess: (storedSettings) => queryClient.setQueryData(settingsKeys.current(), storedSettings) });
  const settings: SettingsState = { theme: settingsQuery.data?.appearance.theme ?? INITIAL_SETTINGS.theme, language: INITIAL_SETTINGS.language, region: INITIAL_SETTINGS.region, timezone: INITIAL_SETTINGS.timezone };
  const search = useSettingsSearch(setActivePanel);
  const selectPanel = (panel: PanelId) => {
    setActivePanel(panel);
    search.setQuery('');
  };
  const update: UpdateSetting = (key, value) => {
    if (key === 'theme') {
      themeMutation.mutate(value as SettingsState['theme']);
    }
  };
  return <Layout height="fill" start={<SettingsSideNav search={search} activePanel={activePanel} onSelectPanel={selectPanel} />} content={<SettingsContentPane panel={activePanel} settings={settings} update={update} />} />;
}
