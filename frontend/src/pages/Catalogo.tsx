import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ArrowRight } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { apiFetch, Category, Product, normalizeCategory, normalizeProduct } from '../lib/api';
import { BottomSheet } from '../components/BottomSheet';

function minPrice(product: Product) {
  const vars = Array.isArray(product.variacoes)
    ? product.variacoes.filter((v) => v.ativo !== false && Number(v.preco || 0) > 0)
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
      .catch(() => alert('Erro ao carregar catálogo.'))
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
    <div className="fade-in max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">Catálogo</h1>
        <p className="text-gray-600 text-lg">Encontre o produto perfeito para sua marca</p>
      </div>

      {/* Barra de Busca + Filtro */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 sticky top-20 z-40 bg-white py-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou descrição..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-gold focus:ring-2 focus:ring-gold/30 text-base"
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
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
          {search && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
              Busca: {search}
              <button onClick={() => setSearch('')}><X size={16} /></button>
            </span>
          )}
          {category && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
              Categoria: {category}
              <button onClick={() => setCategory('')}><X size={16} /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-sm text-gray-500 underline hover:text-primary ml-2">
            Limpar tudo
          </button>
        </div>
      )}

      {/* Lista de Produtos */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-xl text-gray-500 mb-6">Nenhum produto encontrado.</p>
          <button onClick={clearFilters} className="btn btn-primary">
            Limpar Filtros
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      {/* BottomSheet de Filtros */}
      <BottomSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filtros Avançados">
        <div className="space-y-8 py-2">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-4">Categoria</label>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setCategory('')} 
                className={`px-5 py-3 rounded-2xl text-sm font-medium transition-all ${!category ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Todas as Categorias
              </button>
              {categories.map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => setCategory(cat.slug || String(cat.id))} 
                  className={`px-5 py-3 rounded-2xl text-sm font-medium transition-all ${category === (cat.slug || cat.id) ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Ordenar por</label>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)} 
              className="w-full p-4 rounded-2xl border border-gray-200 text-base"
            >
              <option value="destaque">Destaques primeiro</option>
              <option value="preco">Menor preço</option>
              <option value="avaliacao">Melhor avaliados</option>
            </select>
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <button onClick={clearFilters} className="btn btn-outline flex-1">Limpar Filtros</button>
            <button onClick={() => setFilterOpen(false)} className="btn btn-primary flex-1">Ver Resultados</button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}