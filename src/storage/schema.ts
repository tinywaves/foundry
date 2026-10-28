import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const providers = sqliteTable(
  'providers',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name').notNull(),
    protocol: text('protocol').notNull(),
    baseURL: text('base_url').notNull(),
    apiKey: text('api_key').notNull().default(''),
    customModels: text('custom_models').notNull().default('[]'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
);

export const captures = sqliteTable(
  'captures',
  {
    id: text('id').primaryKey().notNull(),
    url: text('url').notNull(),
    title: text('title'),
    userNote: text('user_note'),
    latestSuccessfulJobId: text('latest_successful_job_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('captures_url_active_unique')
      .on(table.url)
      .where(sql`${table.deletedAt} is null`),
    index('captures_created_at_idx').on(table.createdAt),
  ],
);

export const scrapeJobs = sqliteTable(
  'scrape_jobs',
  {
    id: text('id').primaryKey().notNull(),
    captureId: text('capture_id')
      .notNull()
      .references(() => captures.id),
    fetcher: text('fetcher').notNull(),
    configSnapshot: text('config_snapshot').notNull(),
    rawResponseJson: text('raw_response_json'),
    status: text('status').notNull().default('pending'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('scrape_jobs_one_active_per_capture')
      .on(table.captureId)
      .where(sql`${table.status} in ('pending', 'running') and ${table.deletedAt} is null`),
    index('scrape_jobs_capture_created_at_idx').on(table.captureId, table.createdAt),
  ],
);
