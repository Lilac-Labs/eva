import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from './schema';

config();

// Create connection with Supabase transaction pooler
// Use session pooler URL for regular connections
// Use transaction pooler URL for high-concurrency scenarios
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure postgres client for Supabase
const client = postgres(connectionString!, {
  prepare: false,
});

// Create Drizzle instance with schema
export const db =
  process.env.NODE_ENV === 'test'
    ? drizzle.mock({
        schema,
      })
    : drizzle(client, { schema });

// Export the client for advanced usage
export { client };

// Export schema for external usage
export * from './schema.js';
