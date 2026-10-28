import { defineConfig } from 'drizzle-kit';
import { getFoundryDatabasePath } from './src/storage/paths';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/storage/schema.ts',
  out: './drizzle',
  dbCredentials: { url: getFoundryDatabasePath() },
});
