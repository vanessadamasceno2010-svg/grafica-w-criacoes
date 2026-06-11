import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export async function query<T = any>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result;
}
