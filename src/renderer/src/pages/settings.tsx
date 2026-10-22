'use client';

import { Layout } from '@astryxdesign/core/Layout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getConfigFolder,
  getSettings,
  setBase,
  setLanguage,
  setRegion,
  setTheme,
  setTimezone,
  settingsKeys,
} from '../settings';
import { SettingsContentPane } from './settings/components/settings-content-pane';
import { SettingsSideNav } from './settings/components/settings-side-nav';
import { useSettingsSearch } from './settings/search';
import { DEFAULT_PANEL } from './settings/config';
import type { PanelId, SettingsState, UpdateSetting } from './settings/types';
import { INITIAL_SETTINGS } from './settings/types';

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState<PanelId>(
    searchParams.get('panel') === 'base' ? 'base' : DEFAULT_PANEL,
  );
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const configFolderQuery = useQuery({ queryKey: ['settings', 'config-folder'], queryFn: getConfigFolder });
  const updateSettings = (
    storedSettings: Awaited<ReturnType<typeof setTheme>>,
  ) => queryClient.setQueryData(settingsKeys.current(), storedSettings);
  const themeMutation = useMutation({ mutationFn: setTheme, onSuccess: updateSettings });
  const baseMutation = useMutation({ mutationFn: setBase, onSuccess: updateSettings });
  const languageMutation = useMutation({ mutationFn: setLanguage, onSuccess: updateSettings });
  const regionMutation = useMutation({ mutationFn: setRegion, onSuccess: updateSettings });
  const timezoneMutation = useMutation({ mutationFn: setTimezone, onSuccess: updateSettings });
  const settings: SettingsState = {
    theme: settingsQuery.data?.workspace.appearance['color-theme'] ?? INITIAL_SETTINGS.theme,
    language: settingsQuery.data?.workspace['language-region'].language ?? INITIAL_SETTINGS.language,
    region: settingsQuery.data?.workspace['language-region']['region-format'] ?? INITIAL_SETTINGS.region,
    timezone: settingsQuery.data?.workspace['language-region']['time-zone'] ?? INITIAL_SETTINGS.timezone,
    base: settingsQuery.data?.features.base ?? INITIAL_SETTINGS.base,
  };
  const search = useSettingsSearch(setActivePanel);
  const selectPanel = (panel: PanelId) => {
    setActivePanel(panel);
    search.setQuery('');
  };
  const update: UpdateSetting = (key, value) => {
    switch (key) {
      case 'theme': {
        themeMutation.mutate(value as SettingsState['theme']);
        break;
      }
      case 'language': {
        languageMutation.mutate(value as SettingsState['language']);
        break;
      }
      case 'region': {
        regionMutation.mutate(value as SettingsState['region']);
        break;
      }
      case 'timezone': {
        timezoneMutation.mutate(value as SettingsState['timezone']);
        break;
      }
      case 'base': {
        baseMutation.mutate(value as SettingsState['base']);
        break;
      }
      default: {
        break;
      }
    }
  };
  return (
    <Layout
      height="fill"
      start={(
        <SettingsSideNav
          search={search}
          activePanel={activePanel}
          onSelectPanel={selectPanel}
        />
      )}
      content={(
        <SettingsContentPane
          panel={activePanel}
          settings={settings}
          update={update}
          configFolderPath={configFolderQuery.data ?? ''}
        />
      )}
    />
  );
}
