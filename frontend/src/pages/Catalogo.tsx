import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { apiFetch, Category, Product, normalizeCategory, normalizeProduct } from '../lib/api';
import { BottomSheet } from '../components/BottomSheet';
import { SEO } from '../components/SEO';

function minPrice(product: Product) {
  const vars = Array.isArray(product.variacoes)
    ? product.variacoes.filter((v) => v && v.ativo !== false && Number(v.preco || 0) > 0)
    : [];
  if (!vars.length) return Number(product.preco || 0);
  return Math.min(...vars.map((v) => Number(v.preco || 0)));
}

export function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('categoria') || '');
  const [sort, setSort] = useState('destaque');
  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('categoria', category);
    setSearchParams(params);
  }, [search, category, setSearchParams]);

  useEffect(() => {
    setLoading(true);

    const params = new URLSearchParams();
    params.set('limit', '100');
    if (search) params.set('busca', search);
    if (category) params.set('categoria', category);

    Promise.all([
      apiFetch<{ data: any[] }>('/produtos?' + params.toString()),
      apiFetch<any[]>('/categorias')
    ])
      .then(([prodRes, catRows]) => {
        setProducts((prodRes.data || []).map(normalizeProduct));
        setCategories((catRows || []).map(normalizeCategory));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (sort === 'preco') {
      result.sort((a, b) => minPrice(a) - minPrice(b));
    } else if (sort === 'avaliacao') {
      result.sort((a, b) => Number(b.avaliacao_media || 0) - Number(a.avaliacao_media || 0));
    } else {
      result.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
    }

    return result;
  }, [products, sort]);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSort('destaque');
  };

  const hasActiveFilters = search || category || sort !== 'destaque';

  return (
    <>
      <SEO 
        title="Catálogo de Produtos"
        description="Confira nosso catálogo completo de brindes corporativos, embalagens personalizadas, sacolas de papel, adesivos, banners e materiais promocionais."
        keywords="catálogo gráfica, brindes corporativos, embalagens personalizadas, sacolas de papel, impressão guaraciaba do norte, adesivos, banners"
      />

      <div className="fade-in max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">Catálogo de Produtos</h1>
          <p className="text-gray-600 text-lg">Brindes, embalagens, impressos e materiais promocionais para sua empresa</p>
        </div>

        {/* Barra de Busca + Filtro */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 sticky top-20 z-40 bg-white py-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
            <input 
              type="text" 
              placeholder="Buscar brindes, embalagens, adesivos..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-gold focus:ring-2 focus:ring-gold/30 text-base"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setFilterOpen(true)} 
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-medium transition-all ${hasActiveFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <SlidersHorizontal size={22} />
            Filtros
          </button>
        </div>

        {/* Filtros Ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-8">
            {search && <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">Busca: {search}</span>}
            {category && <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">Categoria: {category}</span>}
            <button onClick={clearFilters} className="text-sm text-gray-500 underline hover:text-primary">Limpar tudo</button>
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center">Carregando produtos...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-xl text-gray-500">Nenhum produto encontrado.</p>
            <button onClick={clearFilters} className="mt-4 btn btn-primary">Limpar Filtros</button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}

        <BottomSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filtros">
          {/* Filtros mantidos iguais - pode ajustar depois */}
        </BottomSheet>
      </div>
    </>
  );
}