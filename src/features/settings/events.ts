export const SETTINGS_CHANGED_EVENT = 'settings.changed';

export interface SettingsChangedEvent {
  fields: string[];
}
