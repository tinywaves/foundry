import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const providers = sqliteTable('providers', {
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
});
