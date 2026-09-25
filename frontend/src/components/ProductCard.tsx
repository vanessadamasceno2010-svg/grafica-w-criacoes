import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';

import { Product, formatMoney } from '../lib/api';

interface ProductCardProps {
  product: Product;
}

const FALLBACK_IMAGE = '/assets/chaveiros-personalizados.jpeg';

function activeVariations(product: Product) {
  return Array.isArray(product.variacoes)
    ? product.variacoes.filter(
        (variation) =>
          variation &&
          variation.ativo !== false &&
          Number(variation.preco || 0) > 0
      )
    : [];
}

function minPrice(product: Product) {
  const variations = activeVariations(product);

  if (variations.length === 0) {
    return Number(product.preco || 0);
  }

  return Math.min(
    ...variations.map((variation) => Number(variation.preco || 0))
  );
}

function safeProductPath(product: Product) {
  const raw = product.id || product.slug || product.nome || '';
  return encodeURIComponent(String(raw).trim());
}

export function ProductCard({ product }: ProductCardProps) {
  const variations = activeVariations(product);
  const price = minPrice(product);
  const target = safeProductPath(product);
  const image = product.imagem_principal || FALLBACK_IMAGE;

  return (
    <article className="group card flex flex-col h-full overflow-hidden transition hover:ring-2 hover:ring-gold/40">
      <Link
        to={`/produto/${target}`}
        className="block active:scale-[0.99] transition-transform"
      >
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          <img
            src={image}
            alt={product.nome}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          {product.destaque && (
            <span aria-label="Produto em destaque" className="absolute top-2 left-2 badge p-1.5 bg-gold text-primary shadow-lg">
              <Star size={14} fill="currentColor" />
            </span>
          )}

          {product.preco_original &&
            product.preco_original > price && (
              <span className="absolute top-2 right-2 badge px-2 py-1 text-[10px] bg-danger text-white shadow-lg">
                Oferta
              </span>
            )}
        </div>
      </Link>

      <div className="p-2.5 sm:p-3 flex flex-col flex-1 min-w-0">
        <Link to={`/produto/${target}`} className="block">
          <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1">
            {product.categoria_nome || 'Produto'}
          </p>

          <h3 className="font-display font-bold text-primary text-sm sm:text-base leading-tight mb-2 line-clamp-2">
            {product.nome}
          </h3>

        </Link>

        <div className="mt-auto pt-3 border-t border-gray-100">
          {product.preco_original &&
            product.preco_original > price && (
              <p className="text-sm text-gray-400 line-through mb-1">
                {formatMoney(product.preco_original)}
              </p>
            )}

          {variations.length > 0 && (
            <p className="text-xs text-gray-500 font-semibold">
              A partir de
            </p>
          )}

          <p className="font-display font-bold text-xl text-primary">
            {formatMoney(price)}
          </p>

          <div className="grid grid-cols-1 gap-2 mt-4">
            <Link
              to={`/produto/${target}`}
              className="min-h-11 w-full rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 px-3"
            >
              Ver opções
              <ArrowRight size={16} />
            </Link>

          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
