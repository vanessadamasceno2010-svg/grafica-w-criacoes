const API_BASE =
  import.meta.env.VITE_API_URL || 'https://grafica-w-criacoes-backend.vercel.app/api';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('gp_token') ||
    '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
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
    throw new Error(data?.message || data?.error || 'Erro interno do servidor.');
  }

  return data as T;
}

export { API_BASE };
