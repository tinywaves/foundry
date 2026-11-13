import { openPath } from '../../lib/open-path';
import type { FoundryDatabase } from '../../storage/database';
import { getFoundryHomePath } from '../../storage/paths';
import type { PublicSettings, SettingsPatch } from './contracts';
import { readSettings, updateSettings } from './repository';

export interface SettingsPayload extends PublicSettings {
  configFolder: string;
}

export class SettingsService {
  constructor(
    private readonly database: FoundryDatabase,
    private readonly configFolder = getFoundryHomePath(),
    private readonly openFolder: (path: string) => void = openPath,
  ) {}

  read(): SettingsPayload {
    return {
      ...readSettings(this.database.db),
      configFolder: this.configFolder,
    };
  }

  update(patch: SettingsPatch): SettingsPayload {
    return {
      ...updateSettings(patch, this.database.db),
      configFolder: this.configFolder,
    };
  }

  openConfigFolder(): { configFolder: string } {
    this.openFolder(this.configFolder);
    return { configFolder: this.configFolder };
  }
}
