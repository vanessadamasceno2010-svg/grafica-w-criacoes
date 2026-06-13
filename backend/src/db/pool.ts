import pg from 'pg';
import type { QueryResultRow } from 'pg';
import { config } from '../config.js';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL não configurada no backend.');
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = []
) {
  try {
    const result = await pool.query<T>(text, params);
    return result;
  } catch (error) {
    console.error('ERRO BANCO POSTGRES:', error);
    throw error;
  }
}
