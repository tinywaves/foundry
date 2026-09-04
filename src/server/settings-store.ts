import type {
  ApplicationSettings,
  UpdateApplicationSettingsRequest,
} from '@dhzh/foundry-api-contract';
import { applicationColorModes } from '@dhzh/foundry-api-contract';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import type { FoundryDatabase } from './database';
import { settings } from './database/schema';

const COLOR_MODE_KEY = 'color_mode';
const colorModeSchema = z.enum(applicationColorModes);

export interface SettingsStore {
  getApplicationSettings: () => ApplicationSettings;
  updateApplicationSettings: (
    update: UpdateApplicationSettingsRequest,
  ) => ApplicationSettings;
}

export class DrizzleSettingsStore implements SettingsStore {
  constructor(
    private readonly database: FoundryDatabase['db'],
    private readonly now: () => number = Date.now,
  ) {}

  getApplicationSettings(): ApplicationSettings {
    const rows = this.database.select({
      deletedAt: settings.deletedAt,
      key: settings.key,
      value: settings.value,
    }).from(settings).all();

    if (rows.length !== 1) {
      throw new Error('Stored Application Settings are invalid.');
    }

    const [row] = rows;
    if (row.key !== COLOR_MODE_KEY || row.deletedAt !== null) {
      throw new Error('Stored Application Settings are invalid.');
    }

    return {
      colorMode: colorModeSchema.parse(row.value),
    };
  }

  updateApplicationSettings(
    update: UpdateApplicationSettingsRequest,
  ): ApplicationSettings {
    const result = this.database.update(settings)
      .set({
        updatedAt: this.now(),
        value: update.colorMode,
      })
      .where(eq(settings.key, COLOR_MODE_KEY))
      .run();

    if (result.changes !== 1) {
      throw new Error('Stored Application Settings are invalid.');
    }

    return this.getApplicationSettings();
  }
}
