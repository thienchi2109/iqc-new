import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config