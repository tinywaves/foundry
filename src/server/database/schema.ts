import { sql } from 'drizzle-orm';
import {
  check,
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
