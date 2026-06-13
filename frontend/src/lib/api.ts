export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://grafica-w-criacoes-backend.vercel.app/api';

export const API_URL = API_BASE;

export const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || '5588996240470';

export const BRAND = {
  name: 'Gráfica W Criações',
  phone: '(88) 99624-0470',
  whatsapp: '88 99624-0470',
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
  especificacoes?: Record<string, string[]>;
  destaque?: boolean;
  tempo_producao: number;
  categoria_id?: string;
  categoria_nome?: string;
  avaliacao_media?: number;
  avaliacoes_total?: number;
};

export type Category = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  imagem_url: string;
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

export function formatMoney(valor: number | string) {
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

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authToken = token();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
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

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(path, options);
}

export function createWhatsAppOrderMessage(order: LocalOrder) {
  const linhas = order.items
    .map((item, index) => {
      const specs = Object.entries(item.especificacoes_selecionadas || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');

      return `${index + 1}. ${item.quantidade}x ${item.nome}${
        specs ? ` (${specs})` : ''
      } - ${formatMoney(item.preco_unitario * item.quantidade)}`;
    })
    .join('\n');

  return `Olá, quero finalizar meu pedido na ${BRAND.name}.

Pedido: ${order.numero}

Cliente: ${order.cliente.nome}
Telefone: ${order.cliente.telefone}
Email: ${order.cliente.email || 'não informado'}
Endereço/retirada: ${order.cliente.endereco}

Itens:
${linhas}

Subtotal: ${formatMoney(order.subtotal)}
Frete: ${formatMoney(order.frete)}
Desconto: ${formatMoney(order.desconto)}
Total: ${formatMoney(order.total)}

Observações: ${order.cliente.observacoes || 'sem observações'}

Aguardo confirmação pelo WhatsApp.`;
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const mockProducts: Product[] = [];
export const mockCategories: Category[] = [];
