import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { apiFetch, Category, Product, normalizeProduct, normalizeCategory } from '../lib/api';
import { BottomSheet } from '../components/BottomSheet';

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
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const [prodRes, cats] = await Promise.all([
          apiFetch<{ data: any[] }>('/produtos?limit=100'),
          apiFetch<any[]>('/categorias')
        ]);

        if (!active) return;

        setProducts((prodRes.data || []).map(normalizeProduct));
        setCategories((cats || []).map(normalizeCategory));
      } catch (err: any) {
        alert(err.message || 'Erro ao carregar catálogo.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (search) {
      const lowerSearch = search.toLowerCase();

      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(lowerSearch) ||
          p.slug.toLowerCase().includes(lowerSearch) ||
          String(p.categoria_nome || '').toLowerCase().includes(lowerSearch)
      );
    }

    if (category) {
      result = result.filter(
        (p) =>
          String(p.categoria_slug || '').toLowerCase() === category.toLowerCase() ||
          String(p.categoria_nome || '').toLowerCase().includes(category.toLowerCase())
      );
    }

    if (sort === 'preco') {
      result = [...result].sort((a, b) => a.preco - b.preco);
    } else if (sort === 'avaliacao') {
      result = [...result].sort((a, b) => Number(b.avaliacao_media || 0) - Number(a.avaliacao_media || 0));
    } else {
      result = [...result].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
    }

    return result;
  }, [products, search, category, sort]);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSort('destaque');
  };

  const hasActiveFilters = search || category || sort !== 'destaque';

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold text-primary mb-6">
        Catálogo de Produtos
      </h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />

          <input
            type="text"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11 pr-4"
          />

          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <button
          onClick={() => setFilterOpen(true)}
          className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-outline'} px-4`}
        >
          <SlidersHorizontal size={20} />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Busca: {search}
              <button onClick={() => setSearch('')} className="hover:text-danger">
                <X size={14} />
              </button>
            </span>
          )}

          {category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Categoria: {category}
              <button onClick={() => setCategory('')} className="hover:text-danger">
                <X size={14} />
              </button>
            </span>
          )}

          {sort !== 'destaque' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Ordenação: {sort}
              <button onClick={() => setSort('destaque')} className="hover:text-danger">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-primary">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p className="font-bold">Carregando produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-xl font-bold text-primary mb-2">
            Nenhum produto encontrado
          </h2>
          <p className="text-gray-500 mb-4">Tente ajustar os filtros ou buscar outro termo.</p>
          <button onClick={clearFilters} className="btn btn-primary mx-auto">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <BottomSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filtros">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-primary mb-2">Ordenar por</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input"
            >
              <option value="destaque">Destaques</option>
              <option value="preco">Menor preço</option>
              <option value="avaliacao">Melhor avaliação</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={clearFilters} className="btn btn-outline">
              Limpar
            </button>

            <button onClick={() => setFilterOpen(false)} className="btn btn-primary">
              Aplicar
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
