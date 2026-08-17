import type Database from 'better-sqlite3';
import type {
  ApplicationColorMode,
  ApplicationSettings,
} from '../../shared/settings-contract';
import { applicationColorModes } from '../../shared/settings-contract';
import { SettingsOperationError, toSettingsOperationError } from './settings-error';

const APPLICATION_SETTINGS_ID = 1;
const DEFAULT_COLOR_MODE: ApplicationColorMode = 'system';

interface ApplicationSettingsRow {
  id: number;
  color_mode: string;
}

export class SettingsRepository {
  constructor(private readonly database: Database.Database) {}

  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toSettingsOperationError(error);
    }
  }

  getApplicationSettings(): ApplicationSettings {
    return this.execute(() => {
      const rows = this.database.prepare<[], ApplicationSettingsRow>(`
        SELECT id, color_mode
        FROM application_settings
      `).all();
      if (rows.length === 0) {
        return { colorMode: DEFAULT_COLOR_MODE };
      }
      if (rows.length !== 1 || rows[0]?.id !== APPLICATION_SETTINGS_ID) {
        throw invalidStoredSettings();
      }
      return { colorMode: parseStoredColorMode(rows[0].color_mode) };
    });
  }

  updateApplicationColorMode(value: unknown): ApplicationSettings {
    return this.execute(() => {
      const colorMode = parseApplicationColorMode(value);
      this.database.prepare(`
        INSERT INTO application_settings (id, color_mode)
        VALUES (@id, @colorMode)
        ON CONFLICT (id) DO UPDATE SET
          color_mode = excluded.color_mode
      `).run({ id: APPLICATION_SETTINGS_ID, colorMode });
      return { colorMode };
    });
  }
}

function isApplicationColorMode(value: unknown): value is ApplicationColorMode {
  return typeof value === 'string'
    && applicationColorModes.includes(value as ApplicationColorMode);
}

function parseApplicationColorMode(value: unknown): ApplicationColorMode {
  if (!isApplicationColorMode(value)) {
    throw new SettingsOperationError('invalid-input', 'Select a supported application color mode.');
  }
  return value;
}

function parseStoredColorMode(value: unknown): ApplicationColorMode {
  if (!isApplicationColorMode(value)) {
    throw invalidStoredSettings();
  }
  return value;
}

function invalidStoredSettings(): SettingsOperationError {
  return new SettingsOperationError('storage-corrupt', 'Stored Settings data is invalid.');
}
