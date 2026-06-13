// lib/db.ts
import { config } from 'dotenv';
import { Pool, PoolClient } from 'pg';

config({ path: '.env.local' });

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

// Export query function
export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export client getter for transactions
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Export pool for cleanup
export { pool };

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
