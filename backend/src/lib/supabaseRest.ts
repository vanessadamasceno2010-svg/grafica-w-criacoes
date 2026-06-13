const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function checkSupabaseRestEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.');
  }
}

export function getSupabaseRestStatus() {
  return {
    hasUrl: Boolean(SUPABASE_URL),
    hasServiceKey: Boolean(SUPABASE_SERVICE_ROLE_KEY)
  };
}

export async function supabaseRest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  checkSupabaseRestEnv();

  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });

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
      path,
      data
    });

    throw new Error(
      typeof data === 'string'
        ? data
        : data?.message || data?.details || data?.hint || 'Erro na API REST do Supabase'
    );
  }

  return data as T;
}

export function restEq(value: string) {
  return encodeURIComponent(value);
}

export function slugify(text: string) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
