import { config } from '../config.js';

const SUPABASE_URL = String(config.supabaseUrl || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(config.supabaseServiceRoleKey || '');

const DEFAULT_TIMEOUT_MS = 15000;

export function checkSupabaseRestEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.');
  }
}

export function getSupabaseRestStatus() {
  return {
    hasUrl: Boolean(SUPABASE_URL),
    hasServiceKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
  };
}

function normalizePath(path: string) {
  const cleanPath = String(path || '').trim();

  if (!cleanPath) {
    throw new Error('Caminho da API Supabase não informado.');
  }

  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    throw new Error('Use apenas caminho relativo na API Supabase. Exemplo: /users?select=*');
  }

  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

function createHeaders(optionsHeaders?: HeadersInit) {
  const headers = new Headers(optionsHeaders || {});

  headers.set('apikey', SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Prefer')) {
    headers.set('Prefer', 'return=representation');
  }

  return headers;
}

function formatSupabaseError(data: any) {
  if (typeof data === 'string') {
    return data;
  }

  return (
    data?.message ||
    data?.details ||
    data?.hint ||
    data?.error ||
    'Erro na API REST do Supabase'
  );
}

export async function supabaseRest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  checkSupabaseRestEnv();

  const safePath = normalizePath(path);
  const timeout = createTimeoutSignal(DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1${safePath}`, {
      ...options,
      signal: options.signal || timeout.signal,
      headers: createHeaders(options.headers),
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo limite excedido ao conectar com o Supabase.');
    }

    throw new Error('Não foi possível conectar ao Supabase.');
  } finally {
    timeout.clear();
  }

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error('ERRO SUPABASE REST:', {
      status: response.status,
      path: safePath,
      message: formatSupabaseError(data),
    });

    throw new Error(formatSupabaseError(data));
  }

  return data as T;
}

export function restEq(value: string) {
  return encodeURIComponent(String(value || '').trim());
}

export function slugify(text: string) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
