import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { openFoundryDatabase } from '../src/storage/database';
import { fetchJobs } from '../src/storage/schema';

const { join } = path;

it('backfills credits for historical successful jobs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-database-migration-'));
  const databasePath = join(directory, 'foundry.sqlite');
  const legacySchema = await readFile(
    new URL('../drizzle/0000_lumpy_landau.sql', import.meta.url),
    'utf8',
  );
  const legacyDatabase = new Database(databasePath);

  try {
    legacyDatabase.exec(legacySchema);
    legacyDatabase.exec(`
      CREATE TABLE "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      )
    `);
    legacyDatabase.prepare(`
      INSERT INTO "__drizzle_migrations" (hash, created_at)
      VALUES (?, ?)
    `).run(
      createHash('sha256').update(legacySchema).digest('hex'),
      1_794_087_403_777,
    );
    legacyDatabase.pragma('user_version = 2');

    const timestamp = Date.now();
    legacyDatabase.prepare(`
      INSERT INTO captures (
        id, url, title, user_note, latest_successful_job_id,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'capture-1',
      'https://example.com/article',
      'Example',
      null,
      null,
      timestamp,
      timestamp,
      null,
    );

    const insertJob = legacyDatabase.prepare(`
      INSERT INTO fetch_jobs (
        id, capture_id, fetcher, config_snapshot, raw_response_json,
        status, error_code, error_message, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertJob.run(
      'successful-job',
      'capture-1',
      'firecrawl',
      '{}',
      JSON.stringify({ success: true, creditsUsed: 7 }),
      'succeeded',
      null,
      null,
      timestamp,
      timestamp,
      null,
    );
    insertJob.run(
      'zero-credit-job',
      'capture-1',
      'firecrawl',
      '{}',
      JSON.stringify({ success: true, creditsUsed: 0 }),
      'succeeded',
      null,
      null,
      timestamp + 1,
      timestamp + 1,
      null,
    );
    insertJob.run(
      'failed-job',
      'capture-1',
      'firecrawl',
      '{}',
      JSON.stringify({ success: false, creditsUsed: 4 }),
      'failed',
      'fetcher_error',
      'Search failed',
      timestamp + 2,
      timestamp + 2,
      null,
    );
  } finally {
    legacyDatabase.close();
  }

  const migratedDatabase = openFoundryDatabase(databasePath);
  try {
    const rows = migratedDatabase.db.select().from(fetchJobs).all();
    expect(Object.fromEntries(rows.map((row) => [row.id, row.creditsUsed])))
      .toEqual({
        'failed-job': null,
        'successful-job': 7,
        'zero-credit-job': 0,
      });
  } finally {
    migratedDatabase.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
