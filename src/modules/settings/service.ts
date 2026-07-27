import type { JSONType, ZodType } from 'zod';
import { z } from 'zod';
import { createSettingsRepository, ensureSettingsModule } from './repository';
import { findSettingDefinition, getSettingKey } from './registry';
import type { SqliteStorage } from '../../storage/sqlite-storage';
import type { SettingsService } from './types';
import { settingGroupSeparator } from './constants';

function getDefinition(group: string, name: string) {
  const definition = findSettingDefinition(group, name);

  if (!definition) {
    throw new Error(`Unknown setting: ${group}${settingGroupSeparator}${name}`);
  }

  return definition;
}

function parsePayload(payload: string, schema: ZodType<JSONType>) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { structurallyValid: false } as const;
  }

  const validation = z.object({ value: schema }).safeParse(parsed);
  if (!validation.success) {
    return { structurallyValid: false } as const;
  }

  return {
    value: validation.data.value,
    structurallyValid: true,
  } as const;
}

export function createSettingsService(storage: SqliteStorage): SettingsService {
  ensureSettingsModule(storage);
  const repository = createSettingsRepository(storage);

  return {
    get(group, name) {
      const record = repository.get({ group, name });
      const definition = getDefinition(group, name);
      const key = getSettingKey(group, name);

      if (record) {
        const parsed = parsePayload(record.payload, definition.schema);
        if (parsed.structurallyValid) {
          return {
            key,
            group,
            name,
            value: parsed.value,
          };
        }
      }

      return {
        key,
        group,
        name,
        value: definition.defaultValue,
      };
    },
    list() {
      const records = repository.getAll();

      return records.map(({ group, name, payload }) => {
        const definition = getDefinition(group, name);
        const parsed = parsePayload(payload, definition.schema);
        return {
          key: getSettingKey(group, name),
          group,
          name,
          value: parsed.structurallyValid ? parsed.value : definition.defaultValue,
        };
      });
    },
    setMany(entries) {
      storage.transaction(() => {
        for (const { group, name, value } of entries) {
          repository.upsert(
            group,
            name,
            JSON.stringify({ value }),
          );
        }
      });
    },
    resetMany(entries) {
      const definitions = entries.map(({ group, name }) => getDefinition(group, name));
      storage.transaction(() => {
        for (const definition of definitions) {
          repository.upsert(
            definition.group,
            definition.name,
            JSON.stringify({ value: definition.defaultValue }),
          );
        }
      });
    },
  };
}
