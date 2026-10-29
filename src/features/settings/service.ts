import { openPath } from '../../lib/open-path';
import { getFoundryHomePath, getFoundrySettingsPath } from '../../storage/paths';
import type { PublicSettings, SettingsPatch } from './contracts';
import { readSettings, updateSettings } from './repository';

export interface SettingsPayload extends PublicSettings {
  configFolder: string;
}

export class SettingsService {
  constructor(
    private readonly settingsPath = getFoundrySettingsPath(),
    private readonly configFolder = getFoundryHomePath(),
    private readonly openFolder: (path: string) => void = openPath,
  ) {}

  read(): SettingsPayload {
    return {
      ...readSettings(this.settingsPath),
      configFolder: this.configFolder,
    };
  }

  update(patch: SettingsPatch): SettingsPayload {
    return {
      ...updateSettings(patch, this.settingsPath),
      configFolder: this.configFolder,
    };
  }

  openConfigFolder(): { configFolder: string } {
    this.openFolder(this.configFolder);
    return { configFolder: this.configFolder };
  }
}
