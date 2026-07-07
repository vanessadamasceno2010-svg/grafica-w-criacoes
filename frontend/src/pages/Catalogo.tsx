import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownUp,
  Filter,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X
} from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import {
  apiFetch,
  Category,
  Product,
  normalizeCategory,
  normalizeProduct
} from '../lib/api';
import { BottomSheet } from '../components/BottomSheet';

type SortOption =
  | 'destaque'
  | 'menor_preco'
  | 'maior_preco'
  | 'avaliacao'
  | 'recentes'
  | 'nome';

function minPrice(product: Product) {
  const variations = Array.isArray(product.variacoes)
    ? product.variacoes.filter(
        (variation) =>
          variation?.ativo !== false &&
          Number(variation?.preco || 0) > 0
      )
    : [];

  if (variations.length === 0) {
    return Number(product.preco || 0);
  }

  return Math.min(
    ...variations.map((variation) => Number(variation.preco || 0))
  );
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getCategoryValue(category: Category) {
  return category.slug || String(category.id);
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />

      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded-full w-24" />
        <div className="h-5 bg-gray-100 rounded-full w-4/5" />
        <div className="h-4 bg-gray-100 rounded-full w-full" />
        <div className="h-4 bg-gray-100 rounded-full w-2/3" />
        <div className="h-8 bg-gray-100 rounded-xl w-32 mt-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="h-11 bg-gray-100 rounded-xl" />
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(
    searchParams.get('categoria') || ''
  );
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('ordenar') as SortOption) || 'destaque'
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set('q', search.trim());
    if (category) params.set('categoria', category);
    if (sort !== 'destaque') params.set('ordenar', sort);

    setSearchParams(params, { replace: true });
  }, [search, category, sort, setSearchParams]);

  async function loadCatalog() {
    setLoading(true);
    setLoadError('');

    try {
      const [productResponse, categoryRows] = await Promise.all([
        apiFetch<{ data: unknown[] }>('/produtos?limit=100'),
        apiFetch<unknown[]>('/categorias')
      ]);

      setProducts(
        (productResponse.data || [])
          .map(normalizeProduct)
          .filter((product) => product.ativo !== false)
      );

      setCategories(
        (categoryRows || [])
          .map(normalizeCategory)
          .filter((category) => category.ativo !== false)
      );
    } catch (error: any) {
      setProducts([]);
      setCategories([]);
      setLoadError(
        error?.message || 'Não foi possível carregar o catálogo.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const selectedCategory = useMemo(() => {
    return categories.find(
      (item) => getCategoryValue(item) === category
    );
  }, [categories, category]);

  const filteredProducts = useMemo(() => {
    const query = normalizeText(search);

    let result = products.filter((product) => {
      const categoryValue = String(
        (product as any).categoria_slug ||
          product.categoria_id ||
          ''
      );

      if (category && categoryValue !== category) {
        const productCategoryName = normalizeText(
          product.categoria_nome
        );

        const selectedName = normalizeText(
          selectedCategory?.nome
        );

        if (!selectedName || productCategoryName !== selectedName) {
          return false;
        }
      }

      if (!query) return true;

      const searchable = normalizeText(
        [
          product.nome,
          product.descricao,
          product.descricao_longa,
          product.categoria_nome,
          product.sku
        ].join(' ')
      );

      return searchable.includes(query);
    });

    result = [...result].sort((a, b) => {
      if (sort === 'menor_preco') {
        return minPrice(a) - minPrice(b);
      }

      if (sort === 'maior_preco') {
        return minPrice(b) - minPrice(a);
      }

      if (sort === 'avaliacao') {
        return (
          Number(b.avaliacao_media || 0) -
          Number(a.avaliacao_media || 0)
        );
      }

      if (sort === 'recentes') {
        return String(
          (b as any).created_at || ''
        ).localeCompare(
          String((a as any).created_at || '')
        );
      }

      if (sort === 'nome') {
        return String(a.nome || '').localeCompare(
          String(b.nome || ''),
          'pt-BR'
        );
      }

      const destaqueDifference =
        Number(Boolean(b.destaque)) -
        Number(Boolean(a.destaque));

      if (destaqueDifference !== 0) {
        return destaqueDifference;
      }

      return String(a.nome || '').localeCompare(
        String(b.nome || ''),
        'pt-BR'
      );
    });

    return result;
  }, [
    products,
    search,
    category,
    selectedCategory,
    sort
  ]);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSort('destaque');
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(category) ||
    sort !== 'destaque';

  const sortLabel: Record<SortOption, string> = {
    destaque: 'Destaques primeiro',
    menor_preco: 'Menor preço',
    maior_preco: 'Maior preço',
    avaliacao: 'Melhor avaliados',
    recentes: 'Mais recentes',
    nome: 'Nome A–Z'
  };

  return (
    <div className="fade-in max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
            Produtos personalizados
          </p>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary">
            Catálogo
          </h1>

          <p className="text-gray-600 text-base sm:text-lg mt-2">
            Encontre o produto ideal para sua marca, evento ou negócio.
          </p>
        </div>

        {!loading && !loadError && (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-primary text-white px-4 py-3 self-start lg:self-auto">
            <Sparkles size={18} className="text-gold" />
            <span className="font-bold">
              {products.length} produto
              {products.length !== 1 ? 's' : ''} disponível
              {products.length !== 1 ? 'is' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur border-y border-gray-100 py-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />

            <input
              type="search"
              placeholder="Buscar produto, categoria ou descrição..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-11 pr-11 min-h-12"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                aria-label="Limpar busca"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`min-w-12 sm:min-w-[130px] min-h-12 px-3 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              hasActiveFilters
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <SlidersHorizontal size={19} />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`shrink-0 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
              !category
                ? 'bg-primary border-primary text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gold'
            }`}
          >
            Todos
          </button>

          {categories.map((item) => {
            const value = getCategoryValue(item);
            const selected = category === value;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setCategory(value)}
                className={`shrink-0 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                  selected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gold'
                }`}
              >
                {item.nome}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="font-bold text-primary">
            {loading
              ? 'Carregando produtos...'
              : `${filteredProducts.length} produto${
                  filteredProducts.length !== 1 ? 's' : ''
                } encontrado${
                  filteredProducts.length !== 1 ? 's' : ''
                }`}
          </p>

          {selectedCategory && (
            <p className="text-sm text-gray-500 mt-0.5">
              Categoria: {selectedCategory.nome}
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <ArrowDownUp size={17} className="text-gray-400" />

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as SortOption)
            }
            className="input min-w-[210px]"
          >
            {Object.entries(sortLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {search.trim() && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              Busca: {search.trim()}
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Remover busca"
              >
                <X size={15} />
              </button>
            </span>
          )}

          {selectedCategory && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {selectedCategory.nome}
              <button
                type="button"
                onClick={() => setCategory('')}
                aria-label="Remover categoria"
              >
                <X size={15} />
              </button>
            </span>
          )}

          {sort !== 'destaque' && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {sortLabel[sort]}
              <button
                type="button"
                onClick={() => setSort('destaque')}
                aria-label="Remover ordenação"
              >
                <X size={15} />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-bold text-danger px-2 py-2"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : loadError ? (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={28} />
          </div>

          <h2 className="font-display text-xl font-bold text-primary">
            Não foi possível carregar o catálogo
          </h2>

          <p className="text-gray-500 mt-2 mb-5">
            {loadError}
          </p>

          <button
            type="button"
            onClick={loadCatalog}
            className="btn btn-primary"
          >
            <RefreshCw size={18} />
            Tentar novamente
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <PackageSearch size={34} className="text-gray-400" />
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-primary">
            Nenhum produto encontrado
          </h2>

          <p className="text-gray-500 mt-2 mb-6 max-w-md mx-auto">
            Tente mudar a busca, escolher outra categoria ou limpar os filtros.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="btn btn-primary"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}

      <BottomSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filtros do catálogo"
      >
        <div className="space-y-6 py-2">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Categoria
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('')}
                className={`min-h-11 px-3 rounded-xl border text-sm font-bold ${
                  !category
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Todas
              </button>

              {categories.map((item) => {
                const value = getCategoryValue(item);

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setCategory(value)}
                    className={`min-h-11 px-3 rounded-xl border text-sm font-bold ${
                      category === value
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {item.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Ordenar por
            </label>

            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortOption)
              }
              className="input"
            >
              {Object.entries(sortLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <Filter size={17} className="text-primary" />
              <p className="font-bold text-primary">
                Resultado atual
              </p>
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {filteredProducts.length} produto
              {filteredProducts.length !== 1 ? 's' : ''} encontrado
              {filteredProducts.length !== 1 ? 's' : ''}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-outline"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="btn btn-primary"
            >
              Ver resultados
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default Catalogo;