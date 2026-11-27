import type { FoundryData } from '@dhzh/foundry-shared';

import type { FoundryStorage } from '../../storage/store';

export function readExportData(storage: FoundryStorage): FoundryData {
  return {
    settings: storage.readSettings(),
  };
}
