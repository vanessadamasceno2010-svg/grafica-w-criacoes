export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || '5588996240470';

export const BRAND = {
  nome: 'Gráfica W Criações',
  name: 'Gráfica W Criações',
  whatsapp: '(88) 99624-0470',
  phone: '(88) 99624-0470',
  whatsappNumber: WHATSAPP_NUMBER,
  email: 'contato@graficawcriacoes.com',
  slogan: 'Pequeno por fora, gigante na divulgação!',
};

export function formatMoney(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export type Product = {
  id: string;
  nome: string;
  slug: string;
  categoria_nome: string;
  descricao: string;
  descricao_completa: string;
  descricao_longa?: string;
  preco: number;
  preco_original?: number;
  estoque: number;
  tempo_producao: number;
  imagem_principal: string;
  imagens_adicionais: string[];
  especificacoes: Record<string, string[]>;
  destaque: boolean;
  avaliacao_media: number;
  avaliacoes_total?: number;
};

export const mockCategories = [
  { id: '1', nome: 'Brindes Personalizados', slug: 'brindes', descricao: 'Chaveiros, lembranças e produtos personalizados.', imagem_url: '/assets/chaveiros-personalizados.jpeg' },
  { id: '2', nome: 'Cartões de Visita', slug: 'cartoes-de-visita', descricao: 'Materiais corporativos premium.', imagem_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80' },
  { id: '3', nome: 'Panfletos e Flyers', slug: 'panfletos', descricao: 'Impressos para divulgação local.', imagem_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80' },
  { id: '4', nome: 'Adesivos e Rótulos', slug: 'adesivos', descricao: 'Adesivos para embalagens, produtos e marcas.', imagem_url: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&q=80' },
  { id: '5', nome: 'Embalagens', slug: 'embalagens', descricao: 'Sacolas, etiquetas e itens personalizados.', imagem_url: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800&q=80' },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    nome: 'Chaveiro Personalizado',
    slug: 'chaveiro-personalizado',
    categoria_nome: 'Brindes Personalizados',
    descricao: 'Chaveiros personalizados com foto, marca, evento ou campanha.',
    descricao_completa: 'Pequeno por fora, gigante na divulgação. Chaveiro personalizado com impressão de alta definição, acabamento resistente e visual profissional para lembranças, eventos, escolas, campanhas, brindes e divulgação de marcas.',
    descricao_longa: 'Pequeno por fora, gigante na divulgação. Chaveiro personalizado com impressão de alta definição, acabamento resistente e visual profissional para lembranças, eventos, escolas, campanhas, brindes e divulgação de marcas.',
    preco: 40,
    preco_original: 60,
    estoque: 500,
    tempo_producao: 3,
    imagem_principal: '/assets/chaveiros-personalizados.jpeg',
    imagens_adicionais: ['/assets/chaveiros-personalizados.jpeg', '/assets/logo-wide.jpeg'],
    especificacoes: {
      Quantidade: ['5 unidades', '10 unidades', '30 unidades', '50 unidades', '100 unidades', '500 unidades', '1000 unidades'],
      Modelo: ['Frente única', 'Dupla face', 'Com abridor'],
      Acabamento: ['Azul premium', 'Transparente', 'Personalizado'],
    },
    destaque: true,
    avaliacao_media: 5,
    avaliacoes_total: 48,
  },
  {
    id: '2',
    nome: 'Cartão de Visita Premium',
    slug: 'cartao-de-visita-premium',
    categoria_nome: 'Cartões de Visita',
    descricao: 'Acabamento fosco com visual sofisticado e papel de alta gramatura.',
    descricao_completa: 'Cartão de visita premium para profissionais e empresas que desejam transmitir confiança, sofisticação e credibilidade no primeiro contato.',
    preco: 89.9,
    preco_original: 119.9,
    estoque: 500,
    tempo_producao: 3,
    imagem_principal: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80',
    imagens_adicionais: ['https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80'],
    especificacoes: {
      Quantidade: ['100 un', '250 un', '500 un', '1000 un'],
      Acabamento: ['Fosco', 'Brilho', 'Verniz localizado'],
    },
    destaque: true,
    avaliacao_media: 4.8,
    avaliacoes_total: 32,
  },
  {
    id: '3',
    nome: 'Panfleto Couchê Colorido',
    slug: 'panfleto-couche-colorido',
    categoria_nome: 'Panfletos e Flyers',
    descricao: 'Ideal para campanhas, eventos e divulgação local.',
    descricao_completa: 'Panfletos impressos com alta qualidade de cor, excelente acabamento e ótimo custo-benefício para promoções, eventos e campanhas comerciais.',
    preco: 149.9,
    estoque: 1000,
    tempo_producao: 4,
    imagem_principal: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      Tamanho: ['A5', 'A4', '10x15'],
      Papel: ['90g', '115g', '150g'],
    },
    destaque: true,
    avaliacao_media: 4.7,
    avaliacoes_total: 21,
  },
  {
    id: '4',
    nome: 'Banner Lona 440g',
    slug: 'banner-lona-440g',
    categoria_nome: 'Comunicação Visual',
    descricao: 'Banner resistente com impressão em alta definição.',
    descricao_completa: 'Banner em lona resistente para fachadas, eventos, promoções e comunicação visual de impacto.',
    preco: 69.9,
    estoque: 200,
    tempo_producao: 2,
    imagem_principal: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      Tamanho: ['60x90', '80x120', '100x150'],
      Acabamento: ['Bastão', 'Ilhós'],
    },
    destaque: true,
    avaliacao_media: 4.9,
    avaliacoes_total: 18,
  },
  {
    id: '5',
    nome: 'Adesivo Personalizado',
    slug: 'adesivo-personalizado',
    categoria_nome: 'Adesivos e Rótulos',
    descricao: 'Adesivos para embalagens, brindes e marcas.',
    descricao_completa: 'Adesivos personalizados para rótulos, embalagens, brindes, empresas e campanhas promocionais.',
    preco: 45,
    estoque: 900,
    tempo_producao: 3,
    imagem_principal: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      Formato: ['Redondo', 'Quadrado', 'Especial'],
      Quantidade: ['50 un', '100 un', '250 un'],
    },
    destaque: false,
    avaliacao_media: 4.6,
    avaliacoes_total: 14,
  },
  {
    id: '6',
    nome: 'Sacola Personalizada',
    slug: 'sacola-personalizada',
    categoria_nome: 'Embalagens',
    descricao: 'Sacolas premium para lojas, eventos e presentes.',
    descricao_completa: 'Sacolas personalizadas com acabamento elegante para lojas, ações promocionais, presentes e eventos.',
    preco: 239.9,
    estoque: 100,
    tempo_producao: 7,
    imagem_principal: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      Material: ['Kraft', 'Branco', 'Duplex'],
      Quantidade: ['50 un', '100 un', '250 un'],
    },
    destaque: false,
    avaliacao_media: 5,
    avaliacoes_total: 9,
  },
];

export type CartItem = Product & {
  quantidade: number;
  especificacoes_selecionadas: Record<string, string>;
};

export type LocalOrder = {
  numero: string;
  items: CartItem[];
  cliente: {
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
    observacoes: string;
  };
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  created_at: string;
  status?: string;
};

export function createWhatsAppOrderMessage(order: LocalOrder): string {
  const itemsList = order.items
    .map(
      (i) =>
        `• ${i.quantidade}x ${i.nome} (${Object.entries(i.especificacoes_selecionadas || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}) - ${formatMoney(i.preco * i.quantidade)}`
    )
    .join('\n');

  return `*Novo Pedido - ${BRAND.nome}*\n\n` +
    `*Número:* ${order.numero}\n` +
    `*Cliente:* ${order.cliente.nome}\n` +
    `*Telefone:* ${order.cliente.telefone}\n` +
    `*Email:* ${order.cliente.email || 'não informado'}\n` +
    `*Endereço/retirada:* ${order.cliente.endereco}\n\n` +
    `*Itens do Pedido:*\n${itemsList}\n\n` +
    `*Subtotal:* ${formatMoney(order.subtotal)}\n` +
    `*Frete:* ${order.frete === 0 ? 'A combinar' : formatMoney(order.frete)}\n` +
    `*Desconto:* ${formatMoney(order.desconto || 0)}\n` +
    `*Total:* ${formatMoney(order.total)}\n\n` +
    `*Observações:* ${order.cliente.observacoes || 'Nenhuma'}`;
}
