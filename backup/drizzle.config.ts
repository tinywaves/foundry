import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  out: './drizzle',
  schema: './src/server/database/schema.ts',
});
