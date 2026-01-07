import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { env } from '../config/env';

// Enable connection caching for serverless
neonConfig.fetchConnectionCache = true;

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
