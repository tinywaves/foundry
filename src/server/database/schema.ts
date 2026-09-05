import { sql } from 'drizzle-orm';
import {
  blob,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable(
  'settings',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    uniqueIndex('settings_key_unique').on(table.key),
    check('settings_id_not_empty', sql`length(${table.id}) > 0`),
    check('settings_key_not_empty', sql`length(trim(${table.key})) > 0`),
    check('settings_value_json', sql`json_valid(${table.value})`),
    check('settings_created_at_nonnegative', sql`${table.createdAt} >= 0`),
    check('settings_updated_at_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
    check(
      'settings_deleted_at_valid',
      sql`${table.deletedAt} IS NULL OR ${table.deletedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const providers = sqliteTable(
  'providers',
  {
    id: text('id').primaryKey(),
    runtime: text('runtime', { enum: ['codex', 'claude-code'] }).notNull(),
    name: text('name').notNull(),
    officialWebsite: text('official_website'),
    remark: text('remark'),
    avatarMimeType: text('avatar_mime_type', {
      enum: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    }),
    avatarData: blob('avatar_data', { mode: 'buffer' }),
    configuration: text('configuration', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('providers_runtime_created_at_index').on(table.runtime, table.createdAt),
    check('providers_id_not_empty', sql`length(${table.id}) > 0`),
    check(
      'providers_runtime_valid',
      sql`${table.runtime} IN ('codex', 'claude-code')`,
    ),
    check(
      'providers_name_valid',
      sql`length(trim(${table.name})) BETWEEN 1 AND 100`,
    ),
    check(
      'providers_official_website_valid',
      sql`${table.officialWebsite} IS NULL OR length(${table.officialWebsite}) <= 2048`,
    ),
    check(
      'providers_remark_valid',
      sql`${table.remark} IS NULL OR length(${table.remark}) <= 2000`,
    ),
    check(
      'providers_avatar_valid',
      sql`(${table.avatarMimeType} IS NULL AND ${table.avatarData} IS NULL) OR (${table.avatarMimeType} IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml') AND ${table.avatarData} IS NOT NULL AND length(${table.avatarData}) BETWEEN 1 AND 2097152)`,
    ),
    check('providers_configuration_json', sql`json_valid(${table.configuration})`),
    check('providers_created_at_nonnegative', sql`${table.createdAt} >= 0`),
    check(
      'providers_updated_at_valid',
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      'providers_deleted_at_valid',
      sql`${table.deletedAt} IS NULL OR ${table.deletedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const runtimes = sqliteTable(
  'runtimes',
  {
    runtime: text('runtime', { enum: ['codex', 'claude-code'] }).primaryKey(),
    managed: integer('managed', { mode: 'boolean' }).notNull().default(false),
    providerId: text('provider_id').references(() => providers.id, {
      onDelete: 'restrict',
    }),
    appliedAt: integer('applied_at'),
  },
  (table) => [
    check(
      'runtimes_runtime_valid',
      sql`${table.runtime} IN ('codex', 'claude-code')`,
    ),
    check(
      'runtimes_state_valid',
      sql`(${table.managed} = 0 AND ${table.providerId} IS NULL AND ${table.appliedAt} IS NULL) OR (${table.managed} = 1 AND ${table.appliedAt} IS NOT NULL)`,
    ),
    check(
      'runtimes_applied_at_nonnegative',
      sql`${table.appliedAt} IS NULL OR ${table.appliedAt} >= 0`,
    ),
  ],
);
