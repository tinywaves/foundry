import { z } from 'zod';
import { createSettingsRepository, ensureSettingsModule } from './repository';
import { findSettingDefinition, getSettingFullKey, settingsRegistry } from './registry';
import type { SqliteStorage } from '../../storage/sqlite-storage';
import type {
  JsonValue,
  SettingInput,
  SettingsRepository,
  SettingsService,
  SettingEntry,
} from './types';

type ParsedSetting
  = | {
    value: JsonValue;
    structurallyValid: true;
  }
  | {
    structurallyValid: false;
  };

const settingPayloadSchema = z.object({
  value: z.json(),
});

function parsePayload(payload: string): ParsedSetting {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch {
    return { structurallyValid: false };
  }

  const validation = settingPayloadSchema.safeParse(parsed);

  if (!validation.success) {
    return { structurallyValid: false };
  }

  return {
    value: validation.data.value,
    structurallyValid: true,
  };
}

function createEntry(
  setting: (typeof settingsRegistry)[number],
  value: JsonValue,
  isValid: boolean,
  timestamps: Pick<SettingEntry, 'created_at' | 'updated_at'>,
): SettingEntry {
  return {
    key: getSettingFullKey(setting),
    group: setting.group,
    value,
    valid: isValid,
    secret: setting.secret,
    options: setting.options,
    ...timestamps,
  };
}

function getDefinition(key: string) {
  const definition = findSettingDefinition(key);

  if (!definition) {
    throw new Error(`Unknown setting: ${key}`);
  }

  return definition;
}

function readSetting(
  repository: SettingsRepository,
  key: string,
): SettingEntry {
  const definition = getDefinition(key);
  const row = repository.get(key);

  if (!row) {
    const now = Date.now();
    repository.upsert(
      key,
      JSON.stringify({ value: definition.defaultValue }),
      now,
    );

    return createEntry(
      definition,
      definition.defaultValue,
      true,
      { created_at: now, updated_at: now },
    );
  }

  const parsed = parsePayload(row.payload);

  if (!parsed.structurallyValid) {
    const now = Date.now();
    repository.upsert(
      key,
      JSON.stringify({ value: definition.defaultValue }),
      now,
    );

    return createEntry(
      definition,
      definition.defaultValue,
      true,
      { created_at: row.created_at, updated_at: now },
    );
  }

  const validation = definition.schema.safeParse(parsed.value);

  return createEntry(
    definition,
    parsed.value,
    validation.success,
    { created_at: row.created_at, updated_at: row.updated_at },
  );
}

function readWithRepair(
  storage: SqliteStorage,
  repository: SettingsRepository,
  key: string,
): SettingEntry {
  const row = repository.get(key);
  const definition = getDefinition(key);

  if (row) {
    const parsed = parsePayload(row.payload);

    if (parsed.structurallyValid) {
      const validation = definition.schema.safeParse(parsed.value);

      return createEntry(
        definition,
        parsed.value,
        validation.success,
        { created_at: row.created_at, updated_at: row.updated_at },
      );
    }
  }

  return storage.transaction(() => readSetting(repository, key));
}

function validateWrite(
  entries: readonly SettingInput[],
): void {
  for (const entry of entries) {
    const definition = getDefinition(entry.key);
    const validation = definition.schema.safeParse(entry.value);

    if (!validation.success) {
      throw new Error(`Invalid value for setting: ${entry.key}`);
    }
  }
}

export function createSettingsService(
  storage: SqliteStorage,
): SettingsService {
  ensureSettingsModule(storage);
  const repository = createSettingsRepository(storage);

  return {
    get: (key) => readWithRepair(storage, repository, key),
    list: () =>
      settingsRegistry.map((setting) =>
        readWithRepair(storage, repository, getSettingFullKey(setting)),
      ),
    setMany: (entries) => {
      validateWrite(entries);
      const now = Date.now();

      storage.transaction(() => {
        for (const entry of entries) {
          repository.upsert(
            entry.key,
            JSON.stringify({ value: entry.value }),
            now,
          );
        }
      });

      return entries.map((entry) =>
        readWithRepair(storage, repository, entry.key),
      );
    },
    resetMany: (keys) => {
      const definitions = keys.map((key) => getDefinition(key));
      const now = Date.now();

      storage.transaction(() => {
        for (const definition of definitions) {
          repository.upsert(
            getSettingFullKey(definition),
            JSON.stringify({ value: definition.defaultValue }),
            now,
          );
        }
      });

      return keys.map((key) => readWithRepair(storage, repository, key));
    },
  };
}
