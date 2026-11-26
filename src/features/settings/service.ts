import type { SettingsPatch, SettingsPayload } from '@dhzh/foundry-shared';

import { openPath } from '../../lib/open-path';
import type { FoundryStorage } from '../../storage/index';
import { getFoundryHomePath } from '../../storage/paths';
import { readSettings, updateSettings } from './repository';

export class SettingsService {
  constructor(
    private readonly storage: FoundryStorage,
    private readonly configFolder = getFoundryHomePath(),
    private readonly openFolder: (path: string) => void = openPath,
  ) {}

  read(): SettingsPayload {
    return {
      ...readSettings(this.storage),
      configFolder: this.configFolder,
    };
  }

  update(patch: SettingsPatch): SettingsPayload {
    return {
      ...updateSettings(patch, this.storage),
      configFolder: this.configFolder,
    };
  }

  openConfigFolder(): { configFolder: string } {
    this.openFolder(this.configFolder);
    return { configFolder: this.configFolder };
  }
}
