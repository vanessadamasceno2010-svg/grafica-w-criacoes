import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import { Product, formatMoney } from '../lib/api';

interface ProductCardProps {
  product: Product;
}

function activeVariations(product: Product) {
  return Array.isArray(product.variacoes)
    ? product.variacoes.filter((v) => v && v.ativo !== false && Number(v.preco || 0) > 0)
    : [];
}

function minPrice(product: Product) {
  const vars = activeVariations(product);
  if (!vars.length) return Number(product.preco || 0);
  return Math.min(...vars.map((v) => Number(v.preco || 0)));
}

function safeProductPath(product: Product) {
  const raw = product.id || product.slug || product.nome || '';
  return encodeURIComponent(String(raw).trim());
}

export function ProductCard({ product }: ProductCardProps) {
  const price = minPrice(product);
  const target = safeProductPath(product);
  const image = product.imagem_principal || '/assets/chaveiros-personalizados.jpeg';

  return (
    <Link
      to={`/produto/${target}`}
      className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-gold/50 hover:shadow-xl transition-all duration-300 flex flex-col h-full active:scale-[0.985]"
    >
      {/* Imagem - Corrigida (não estica mais) */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        <img
          src={image}
          alt={product.nome}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/assets/chaveiros-personalizados.jpeg';
          }}
        />

        {product.destaque && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold bg-gold text-primary rounded-full shadow">
            Destaque
          </span>
        )}

        {product.preco_original && product.preco_original > price && (
          <span className="absolute top-3 right-3 px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full shadow">
            Oferta
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-medium text-gold uppercase tracking-widest mb-1">
          {product.categoria_nome || 'Produto'}
        </p>

        <h3 className="font-display font-bold text-primary text-[17px] leading-tight mb-3 line-clamp-2 group-hover:text-gold transition-colors">
          {product.nome}
        </h3>

        <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-1">
          {product.descricao || 'Produto personalizado de alta qualidade.'}
        </p>

        <div className="flex items-center gap-1.5 mb-4 text-sm">
          <Star size={16} className="text-gold fill-current" />
          <span className="font-bold text-gray-700">
            {Number(product.avaliacao_media || 5).toFixed(1)}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">{product.tempo_producao || 3} dias</span>
        </div>

        <div className="mt-auto">
          {product.preco_original && product.preco_original > price && (
            <p className="text-sm text-gray-400 line-through">
              {formatMoney(product.preco_original)}
            </p>
          )}
          
          <div className="flex items-end justify-between">
            <div>
              {activeVariations(product).length > 0 && (
                <p className="text-xs text-gray-500">A partir de</p>
              )}
              <p className="font-display text-2xl font-bold text-primary">
                {formatMoney(price)}
              </p>
            </div>

            <div className="w-9 h-9 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <ShoppingCart size={18} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}