import pg from 'pg';
import type { QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurada na Vercel.');
}

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = []
) {
  try {
    return await pool.query<T>(text, params);
  } catch (error: any) {
    console.error('ERRO BANCO POSTGRES:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      host: error?.host,
      port: error?.port
    });

    throw error;
  }
}import pg from 'pg';
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
