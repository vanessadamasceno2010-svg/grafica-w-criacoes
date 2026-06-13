import pg from 'pg';
import type { QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL || '';

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = []
) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada na Vercel.');
  }

  try {
    return await pool.query<T>(text, params);
  } catch (error: any) {
    console.error('ERRO BANCO POSTGRES:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail
    });

    throw error;
  }
}
