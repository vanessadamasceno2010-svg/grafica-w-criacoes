export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://grafica-w-criacoes-backend.vercel.app/api';

export const API_URL = API_BASE;

export const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || '5588996240470';

export const BRAND = {
  name: 'Gráfica W Criações',
  phone: '(88) 99624-0470',
  whatsapp: '88 99624-0470',
  whatsappNumber: WHATSAPP_NUMBER,
  slogan: 'Pequeno por fora, gigante na divulgação!'
};

export type Product = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  descricao_longa?: string;
  preco: number;
  preco_original?: number | null;
  estoque: number;
  imagem_principal: string;
  imagens_adicionais?: string[];
  especificacoes?: Record<string, any>;
  destaque?: boolean;
  tempo_producao: number;
  categoria_id?: string;
  categoria_nome?: string;
  categoria_slug?: string;
  avaliacao_media?: number;
  avaliacoes_total?: number;
  ativo?: boolean;
  sku?: string;
  peso?: number;
  dimensoes?: any;
};

export type Category = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  imagem_url: string;
  ordem?: number;
  ativo?: boolean;
};

export type CartItem = {
  id: string;
  produto_id: string;
  nome: string;
  slug: string;
  imagem_principal: string;
  quantidade: number;
  preco_unitario: number;
  especificacoes_selecionadas: Record<string, string>;
};

export type CustomerData = {
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  observacoes: string;
};

export type LocalOrder = {
  numero: string;
  items: CartItem[];
  cliente: CustomerData;
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  created_at: string;
};

export type User = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role?: 'user' | 'admin' | 'funcionario' | 'inactive' | string;
  funcionario_permissoes?: string[];
};

export type AuthResponse = {
  user: User;
  token: string;
};

export function formatMoney(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function token() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('gp_token') ||
    ''
  );
}

export function getAuthToken() {
  return token();
}

export function setAuthSession(authToken: string, user: any) {
  localStorage.setItem('token', authToken);
  localStorage.setItem('gp_token', authToken);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('gp_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('gp_token');
  localStorage.removeItem('user');
  localStorage.removeItem('gp_user');
}

export function getStoredUser() {
  const storedUser =
    localStorage.getItem('user') ||
    localStorage.getItem('gp_user');

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authToken = token();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (authToken) {
    headers.Authorization = 'Bearer ' + authToken;
  }

  const response = await fetch(API_BASE + path, {
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
    throw new Error(
      data?.message ||
      data?.error ||
      data?.details ||
      'Erro interno do servidor.'
    );
  }

  return data as T;
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export function normalizeProduct(product: any): Product {
  return {
    id: product?.id || '',
    nome: product?.nome || '',
    slug: product?.slug || '',
    descricao: product?.descricao || '',
    descricao_longa: product?.descricao_longa || '',
    preco: Number(product?.preco || 0),
    preco_original:
      product?.preco_original !== undefined && product?.preco_original !== null
        ? Number(product.preco_original)
        : null,
    estoque: Number(product?.estoque || 0),
    imagem_principal: product?.imagem_principal || '',
    imagens_adicionais: Array.isArray(product?.imagens_adicionais)
      ? product.imagens_adicionais
      : [],
    especificacoes:
      product?.especificacoes && typeof product.especificacoes === 'object'
        ? product.especificacoes
        : {},
    destaque: Boolean(product?.destaque),
    tempo_producao: Number(product?.tempo_producao || 3),
    categoria_id: product?.categoria_id || '',
    categoria_nome: product?.categoria_nome || 'Sem categoria',
    categoria_slug: product?.categoria_slug || '',
    avaliacao_media: Number(product?.avaliacao_media || 5),
    avaliacoes_total: Number(product?.avaliacoes_total || 0),
    ativo: product?.ativo !== false,
    sku: product?.sku || '',
    peso: Number(product?.peso || 0),
    dimensoes: product?.dimensoes || {}
  };
}

export function normalizeCategory(category: any): Category {
  return {
    id: category?.id || '',
    nome: category?.nome || '',
    slug: category?.slug || '',
    descricao: category?.descricao || '',
    imagem_url: category?.imagem_url || '',
    ordem: Number(category?.ordem || 0),
    ativo: category?.ativo !== false
  };
}

export function createWhatsAppOrderMessage(order: LocalOrder) {
  const linhas = order.items
    .map((item, index) => {
      const specs = Object.entries(item.especificacoes_selecionadas || {})
        .map(([key, value]) => key + ': ' + value)
        .join(' | ');

      return (
        String(index + 1) +
        '. ' +
        item.quantidade +
        'x ' +
        item.nome +
        (specs ? ' (' + specs + ')' : '') +
        ' - ' +
        formatMoney(item.preco_unitario * item.quantidade)
      );
    })
    .join('\n');

  return [
    'Olá, quero finalizar meu pedido na ' + BRAND.name + '.',
    '',
    'Pedido: ' + order.numero,
    '',
    'Cliente: ' + order.cliente.nome,
    'Telefone: ' + order.cliente.telefone,
    'Email: ' + (order.cliente.email || 'não informado'),
    'Endereço/retirada: ' + order.cliente.endereco,
    '',
    'Itens:',
    linhas,
    '',
    'Subtotal: ' + formatMoney(order.subtotal),
    'Frete: ' + formatMoney(order.frete),
    'Desconto: ' + formatMoney(order.desconto),
    'Total: ' + formatMoney(order.total),
    '',
    'Observações: ' + (order.cliente.observacoes || 'sem observações'),
    '',
    'Aguardo confirmação pelo WhatsApp.'
  ].join('\n');
}

export function whatsappUrl(message: string) {
  return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
}

export function slugify(text: string) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getPublicConfig(): Promise<Record<string, string>> {
  try {
    return await apiFetch<Record<string, string>>('/configuracoes');
  } catch {
    return {};
  }
}

export const mockProducts: Product[] = [];
export const mockCategories: Category[] = [];

export function confirmAction(message: string) {
  return window.confirm(message);
}

export function notifySuccess(message: string) {
  window.alert(message);
}

export function notifyError(message: string) {
  window.alert(message);
}
