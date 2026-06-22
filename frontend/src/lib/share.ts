import { BRAND, Product, formatMoney } from './api';

export function safeProductPath(product: Pick<Product, 'id' | 'slug' | 'nome'>) {
  const raw = product.id || product.slug || product.nome || '';
  return encodeURIComponent(String(raw).trim());
}

export function productShareUrl(product: Pick<Product, 'id' | 'slug' | 'nome'>) {
  const path = `/produto/${safeProductPath(product)}`;

  if (typeof window === 'undefined') {
    return path;
  }

  return `${window.location.origin}${path}`;
}

type ShareProductOptions = {
  price?: number;
  variationLabel?: string;
  prazoEntrega?: string;
  url?: string;
};

export async function shareProduct(product: Product, options: ShareProductOptions = {}) {
  const url = options.url || productShareUrl(product);
  const price = options.price !== undefined ? Number(options.price || 0) : Number(product.preco || 0);

  const lines = [
    `Olha esse produto da ${BRAND.name}:`,
    '',
    `*${product.nome}*`,
    price > 0 ? `Preço: ${formatMoney(price)}` : '',
    options.variationLabel ? `Opção: ${options.variationLabel}` : '',
    options.prazoEntrega ? `Prazo de entrega: ${options.prazoEntrega}` : '',
    product.descricao ? `\n${product.descricao}` : '',
    '',
    `Ver produto: ${url}`
  ].filter(Boolean).join('\n');

  const shareData: ShareData = {
    title: product.nome,
    text: lines,
    url
  };

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(lines);
    window.alert('Link do produto copiado para compartilhar.');
    return;
  }

  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank', 'noopener,noreferrer');
  }
}
