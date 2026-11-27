import type { FoundryData } from '@dhzh/foundry-shared';

import type { FoundryStorage } from '../../storage/store';

export function replaceImportedData(storage: FoundryStorage, data: FoundryData): void {
  storage.transaction(() => {
    storage.setSettings(data.settings);
  });
}
