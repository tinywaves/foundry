import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import type { FoundryDatabase } from '../../storage/database';
import { settings } from '../../storage/schema';
import { DEFAULT_SETTINGS, normalizeSettings } from './contracts';
import { hasStoredSettings, writeSettings } from './repository';

export function migrateLegacySettings(db: FoundryDatabase['db'], directory: string): void {
  const legacyPath = path.join(directory, 'settings.json');
  const hasLegacyFile = existsSync(legacyPath);
  db.transaction(() => {
    const previous = db.select().from(settings).where(eq(settings.key, 'app')).get();
    if (previous) {
      writeSettings(normalizeSettings(JSON.parse(previous.value) as unknown), db);
    }
    if (hasStoredSettings(db)) {
      return;
    }
    const value: unknown = hasLegacyFile
      ? JSON.parse(readFileSync(legacyPath, 'utf8'))
      : DEFAULT_SETTINGS;
    writeSettings(normalizeSettings(value), db);
  }, { behavior: 'immediate' });

  // Remove only after committing. A retry must never overwrite database settings.
  if (hasLegacyFile) {
    unlinkSync(legacyPath);
  }
}
