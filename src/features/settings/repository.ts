import { sql } from 'drizzle-orm';
import type { FoundryDatabase } from '../../storage/database';
import { settings } from '../../storage/schema';
import {
  applySettingsPatch,
  normalizeSettings,
  toPublicSettings,
} from './contracts';
import type {
  FoundrySettings,
  PublicSettings,
  SettingsPatch,
} from './contracts';

type SettingsDatabase = FoundryDatabase['db'];
type SettingEntry = typeof settings.$inferInsert;

export function hasStoredSettings(db: SettingsDatabase): boolean {
  return db.select({ key: settings.key }).from(settings).limit(1).get() !== undefined;
}

export function readStoredSettings(db: SettingsDatabase): FoundrySettings {
  const root: Record<string, unknown> = {};
  for (const entry of db.select().from(settings).all()) {
    setValue(root, entry.key, JSON.parse(entry.value) as unknown);
  }
  return normalizeSettings(root);
}

export function readSettings(db: SettingsDatabase): PublicSettings {
  return toPublicSettings(readStoredSettings(db));
}

export function updateSettings(patch: SettingsPatch, db: SettingsDatabase): PublicSettings {
  return db.transaction(() => {
    const updated = applySettingsPatch(readStoredSettings(db), patch);
    const stored = new Map(db.select().from(settings).all().map((entry) => [entry.key, entry.value]));
    const changed = flattenSettings(updated).filter((entry) =>
      stored.get(entry.key) !== entry.value);
    if (changed.length > 0) {
      db.insert(settings).values(changed).onConflictDoUpdate({
        target: settings.key,
        set: { value: sql`excluded.value` },
      }).run();
    }
    return toPublicSettings(updated);
  }, { behavior: 'immediate' });
}

export function writeSettings(value: FoundrySettings, db: SettingsDatabase): void {
  db.transaction(() => {
    db.delete(settings).run();
    db.insert(settings).values(flattenSettings(normalizeSettings(value))).run();
  });
}

function flattenSettings(value: unknown, key = ''): SettingEntry[] {
  if (isRecord(value) && Object.keys(value).length > 0) {
    return Object.entries(value).flatMap(([name, child]) =>
      flattenSettings(child, `${key}/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`));
  }
  return value === undefined ? [] : [{ key, value: JSON.stringify(value) }];
}

function setValue(root: Record<string, unknown>, key: string, value: unknown): void {
  if (!key.startsWith('/')) {
    throw new Error('Invalid settings key');
  }
  const segments = key.slice(1).split('/').map((segment) =>
    segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  let target = root;
  for (const [index, segment] of segments.entries()) {
    const child: unknown = index === segments.length - 1 ? value : {};
    if (index === segments.length - 1 || !Object.hasOwn(target, segment)) {
      Object.defineProperty(target, segment, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    if (index === segments.length - 1) {
      continue;
    }
    const next = target[segment];
    if (!isRecord(next)) {
      throw new Error('Conflicting settings keys');
    }
    target = next;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
