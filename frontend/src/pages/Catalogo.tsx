import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
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
      .catch((err: any) => alert(err.message || 'Erro ao carregar catálogo.'))
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
    <div className="fade-in max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold text-primary mb-6">Catálogo de Produtos</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-11 pr-4" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600"><X size={18} /></button>}
        </div>
        <button onClick={() => setFilterOpen(true)} className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-outline'} px-4`}>
          <SlidersHorizontal size={20} />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {search && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">Busca: {search}<button onClick={() => setSearch('')} className="hover:text-danger"><X size={14} /></button></span>}
          {category && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">Categoria: {category}<button onClick={() => setCategory('')} className="hover:text-danger"><X size={14} /></button></span>}
          <button onClick={clearFilters} className="text-sm text-gray-500 underline hover:text-primary">Limpar tudo</button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-gray-500">Carregando produtos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 mb-4">Nenhum produto encontrado com esses filtros.</p>
          <button onClick={clearFilters} className="btn btn-primary">Limpar Filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}

      <BottomSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filtros">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Categoria</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategory('')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!category ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Todas</button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setCategory(cat.slug || cat.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${category === cat.slug || category === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{cat.nome}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Ordenar por</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input">
              <option value="destaque">Destaques</option>
              <option value="preco">Menor Preço</option>
              <option value="avaliacao">Melhor Avaliação</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button onClick={clearFilters} className="btn btn-outline flex-1">Limpar</button>
            <button onClick={() => setFilterOpen(false)} className="btn btn-primary flex-1">Aplicar Filtros</button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
