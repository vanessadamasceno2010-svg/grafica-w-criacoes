import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, X, Copy, Layers } from 'lucide-react';
import {
  apiFetch,
  formatMoney,
  normalizeProduct,
  Product,
  ProductVariation,
  slugify
} from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

type Category = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  imagem_url?: string;
  ativo?: boolean;
};

type ProductForm = Product & {
  categoria_id: string;
};

const emptyVariation: ProductVariation = {
  id: '',
  nome: '',
  quantidade: '',
  preco: 0,
  preco_original: null,
  estoque: 0,
  sku: '',
  opcoes: {},
  ativo: true
};

const emptyProduct: ProductForm = {
  id: '',
  categoria_id: '',
  nome: '',
  slug: '',
  sku: '',
  categoria_nome: '',
  descricao: '',
  descricao_longa: '',
  preco: 0,
  preco_original: null,
  estoque: 0,
  tempo_producao: 3,
  imagem_principal: '/assets/chaveiros-personalizados.jpeg',
  imagens_adicionais: [],
  especificacoes: {},
  variacoes: [],
  destaque: false,
  ativo: true
};

function activeVariations(product: ProductForm | Product) {
  return Array.isArray(product.variacoes)
    ? product.variacoes.filter((v) => v && v.ativo !== false && Number(v.preco || 0) > 0)
    : [];
}

function lowestPrice(product: ProductForm | Product) {
  const vars = activeVariations(product);

  if (vars.length === 0) return Number(product.preco || 0);

  return Math.min(...vars.map((v) => Number(v.preco || 0)));
}

function textToOptions(text: string): Record<string, string> {
  const options: Record<string, string> = {};

  String(text || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const [key, ...rest] = item.split(':');
      const value = rest.join(':').trim();

      if (key?.trim() && value) {
        options[key.trim()] = value;
      }
    });

  return options;
}

function optionsToText(options: any) {
  if (!options || typeof options !== 'object') return '';

  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

export function Produtos() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'new' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const [prodRes, cats] = await Promise.all([
        apiFetch<{ data: any[] }>('/produtos?limit=100'),
        apiFetch<Category[]>('/categorias')
      ]);

      setProducts((prodRes.data || []).map((p) => normalizeProduct(p) as ProductForm));
      setCategories(cats || []);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          String(p.nome || '').toLowerCase().includes(search.toLowerCase()) ||
          String(p.categoria_nome || '').toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const openNew = () => {
    setEditingProduct({
      ...emptyProduct,
      categoria_id: categories[0]?.id || '',
      sku: `SKU-${Date.now()}`
    });
    setMode('new');
  };

  const openEdit = (product: ProductForm) => {
    setEditingProduct({
      ...product,
      variacoes: Array.isArray(product.variacoes) ? product.variacoes : []
    });
    setMode('edit');
  };

  const openView = (product: ProductForm) => {
    setSelectedProduct(product);
    setMode('view');
  };

  const close = () => {
    setSelectedProduct(null);
    setEditingProduct(null);
    setMode(null);
  };

  const payloadFromForm = (p: ProductForm) => {
    const variacoes = Array.isArray(p.variacoes)
      ? p.variacoes
          .filter((v) => v.nome || Number(v.preco || 0) > 0)
          .map((v, index) => ({
            id: v.id || String(index + 1),
            nome: v.nome || `Variação ${index + 1}`,
            quantidade: v.quantidade || '',
            preco: Number(v.preco || 0),
            preco_original:
              v.preco_original !== undefined && v.preco_original !== null
                ? Number(v.preco_original)
                : null,
            estoque: Number(v.estoque || 0),
            sku: v.sku || '',
            opcoes: v.opcoes && typeof v.opcoes === 'object' ? v.opcoes : {},
            ativo: v.ativo !== false
          }))
      : [];

    const menorPreco =
      variacoes.filter((v) => v.ativo !== false && v.preco > 0).length > 0
        ? Math.min(...variacoes.filter((v) => v.ativo !== false && v.preco > 0).map((v) => v.preco))
        : Number(p.preco || 0);

    return {
      categoria_id: p.categoria_id || categories[0]?.id,
      nome: p.nome,
      descricao: p.descricao || p.nome,
      descricao_longa: p.descricao_longa || p.descricao || '',
      preco: menorPreco,
      preco_original: Number(p.preco_original || 0) || null,
      estoque: Number(p.estoque || 0),
      imagem_principal: p.imagem_principal || '/assets/chaveiros-personalizados.jpeg',
      imagens_adicionais: Array.isArray(p.imagens_adicionais) ? p.imagens_adicionais : [],
      especificacoes: p.especificacoes && typeof p.especificacoes === 'object' ? p.especificacoes : {},
      variacoes,
      slug: p.slug || slugify(p.nome),
      sku: p.sku || `SKU-${Date.now()}`,
      peso: Number(p.peso || 0),
      dimensoes: p.dimensoes && typeof p.dimensoes === 'object' ? p.dimensoes : {},
      tempo_producao: Number(p.tempo_producao || 3),
      destaque: Boolean(p.destaque),
      ativo: p.ativo !== false
    };
  };

  const saveProduct = async () => {
    if (!editingProduct?.nome) return alert('Informe o nome do produto.');
    if (!editingProduct.categoria_id && !categories[0]?.id) {
      return alert('Cadastre uma categoria antes de salvar produto.');
    }

    if (!confirm('Confirmar alteração neste produto?')) return;

    try {
      const body = payloadFromForm(editingProduct);

      if (mode === 'new') {
        await apiFetch('/produtos', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      } else {
        await apiFetch(`/produtos/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      }

      close();
      await load();
      alert('Produto salvo no Supabase.');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto.');
    }
  };

  const deleteProduct = async (product: ProductForm) => {
    if (!confirm(`Deseja deletar o produto ${product.nome}?`)) return;

    try {
      await apiFetch(`/produtos/${product.id}`, { method: 'DELETE' });
      await load();
      alert('Produto removido.');
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar produto.');
    }
  };

  const addVariation = () => {
    if (!editingProduct) return;

    setEditingProduct({
      ...editingProduct,
      variacoes: [
        ...(editingProduct.variacoes || []),
        {
          ...emptyVariation,
          id: String(Date.now()),
          nome: 'Nova variação'
        }
      ]
    });
  };

  const duplicateVariation = (index: number) => {
    if (!editingProduct) return;

    const current = editingProduct.variacoes || [];
    const selected = current[index];

    setEditingProduct({
      ...editingProduct,
      variacoes: [
        ...current,
        {
          ...selected,
          id: String(Date.now()),
          nome: `${selected?.nome || 'Variação'} cópia`
        }
      ]
    });
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    if (!editingProduct) return;

    const next = [...(editingProduct.variacoes || [])];

    next[index] = {
      ...next[index],
      [field]: value
    };

    setEditingProduct({
      ...editingProduct,
      variacoes: next
    });
  };

  const updateVariationOptions = (index: number, value: string) => {
    if (!editingProduct) return;

    const next = [...(editingProduct.variacoes || [])];

    next[index] = {
      ...next[index],
      opcoes: textToOptions(value)
    };

    setEditingProduct({
      ...editingProduct,
      variacoes: next
    });
  };

  const removeVariation = (index: number) => {
    if (!editingProduct) return;

    const next = [...(editingProduct.variacoes || [])];
    next.splice(index, 1);

    setEditingProduct({
      ...editingProduct,
      variacoes: next
    });
  };

  const renderActions = (product: ProductForm) => (
    <>
      <button
        onClick={() => openView(product)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        title="Ver"
      >
        <Eye size={16} />
      </button>

      <button
        onClick={() => openEdit(product)}
        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
        title="Editar"
      >
        <Edit2 size={16} />
      </button>

      <button
        onClick={() => deleteProduct(product)}
        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
        title="Deletar"
      >
        <Trash2 size={16} />
      </button>
    </>
  );

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
          Gerenciador de Produtos
        </h1>

        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {loading && <div className="card p-4 mb-4">Carregando produtos do Supabase...</div>}

      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4">Produto</th>
                <th className="text-left px-6 py-4">Categoria</th>
                <th className="text-left px-6 py-4">Preço</th>
                <th className="text-left px-6 py-4">Variações</th>
                <th className="text-left px-6 py-4">Estoque</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imagem_principal}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                      />
                      <span className="font-semibold text-primary">{product.nome}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600">{product.categoria_nome}</td>

                  <td className="px-6 py-4 font-semibold">
                    {activeVariations(product).length > 0 ? 'A partir de ' : ''}
                    {formatMoney(lowestPrice(product))}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {activeVariations(product).length}
                  </td>

                  <td className="px-6 py-4 text-gray-600">{product.estoque} un</td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {renderActions(product)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((product) => (
            <div key={product.id} className="p-4">
              <div className="flex gap-3">
                <img
                  src={product.imagem_principal}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-primary truncate">{product.nome}</h3>
                  <p className="text-sm text-gray-500 truncate">{product.categoria_nome}</p>
                  <p className="font-bold text-primary mt-1">
                    {activeVariations(product).length > 0 ? 'A partir de ' : ''}
                    {formatMoney(lowestPrice(product))}
                  </p>
                  <p className="text-xs text-gray-400">
                    {activeVariations(product).length} variação(ões)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <button onClick={() => openView(product)} className="btn btn-outline">
                  <Eye size={16} />
                  Ver
                </button>

                <button onClick={() => openEdit(product)} className="btn btn-outline">
                  <Edit2 size={16} />
                  Editar
                </button>

                <button onClick={() => deleteProduct(product)} className="btn btn-danger">
                  <Trash2 size={16} />
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomSheet isOpen={mode === 'view' && !!selectedProduct} onClose={close} title="Detalhes do Produto">
        {selectedProduct && (
          <div className="space-y-4">
            <img
              src={selectedProduct.imagem_principal}
              className="w-full h-56 object-cover rounded-2xl"
            />

            <div>
              <h3 className="font-display text-xl font-bold text-primary">{selectedProduct.nome}</h3>
              <p className="text-gray-500">{selectedProduct.descricao}</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="card p-4">
                <p className="text-xs text-gray-500">Preço base</p>
                <p className="font-bold text-primary">{formatMoney(selectedProduct.preco)}</p>
              </div>

              <div className="card p-4">
                <p className="text-xs text-gray-500">Estoque</p>
                <p className="font-bold text-primary">{selectedProduct.estoque}</p>
              </div>

              <div className="card p-4">
                <p className="text-xs text-gray-500">Variações</p>
                <p className="font-bold text-primary">{activeVariations(selectedProduct).length}</p>
              </div>
            </div>

            {activeVariations(selectedProduct).length > 0 && (
              <div>
                <h4 className="font-bold text-primary mb-2">Variações cadastradas</h4>

                <div className="space-y-2">
                  {activeVariations(selectedProduct).map((v, index) => (
                    <div key={v.id || index} className="rounded-2xl border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-primary">{v.nome}</p>
                          <p className="text-sm text-gray-500">
                            {v.quantidade || 'Sem quantidade'} • Estoque {v.estoque || 0}
                          </p>
                          {Object.keys(v.opcoes || {}).length > 0 && (
                            <p className="text-xs text-gray-400">{optionsToText(v.opcoes)}</p>
                          )}
                        </div>

                        <p className="font-bold text-primary">{formatMoney(v.preco)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={() => {
                setEditingProduct(selectedProduct);
                setSelectedProduct(null);
                setMode('edit');
              }}
            >
              Editar produto
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={(mode === 'edit' || mode === 'new') && !!editingProduct}
        onClose={close}
        title={mode === 'new' ? 'Novo Produto' : 'Editar Produto'}
      >
        {editingProduct && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <p className="font-bold text-primary">Dados principais</p>
              <p className="text-sm text-gray-600">
                Cadastre o produto base, categoria e depois adicione variações de preço.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-bold text-primary">Nome</span>
                <input
                  className="input mt-1"
                  placeholder="Nome do produto"
                  value={editingProduct.nome}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      nome: e.target.value,
                      slug: editingProduct.slug || slugify(e.target.value)
                    })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Categoria</span>
                <select
                  className="input mt-1"
                  value={editingProduct.categoria_id || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoria_id: e.target.value })}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Slug</span>
                <input
                  className="input mt-1"
                  placeholder="slug-do-produto"
                  value={editingProduct.slug || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">SKU</span>
                <input
                  className="input mt-1"
                  placeholder="SKU"
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary">Descrição curta</span>
              <textarea
                className="input mt-1 min-h-24"
                placeholder="Descrição curta do produto"
                value={editingProduct.descricao || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, descricao: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-primary">Descrição longa</span>
              <textarea
                className="input mt-1 min-h-28"
                placeholder="Descrição completa"
                value={editingProduct.descricao_longa || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, descricao_longa: e.target.value })}
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-3">
              <label>
                <span className="text-sm font-bold text-primary">Preço base</span>
                <input
                  className="input mt-1"
                  placeholder="Preço"
                  type="number"
                  step="0.01"
                  value={editingProduct.preco || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, preco: Number(e.target.value) })}
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Preço original</span>
                <input
                  className="input mt-1"
                  placeholder="Preço original"
                  type="number"
                  step="0.01"
                  value={editingProduct.preco_original || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, preco_original: Number(e.target.value) || null })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Estoque base</span>
                <input
                  className="input mt-1"
                  placeholder="Estoque"
                  type="number"
                  value={editingProduct.estoque || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, estoque: Number(e.target.value) })}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary">URL da imagem principal</span>
              <input
                className="input mt-1"
                placeholder="https://..."
                value={editingProduct.imagem_principal || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, imagem_principal: e.target.value })}
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-bold text-primary">Tempo de produção</span>
                <input
                  className="input mt-1"
                  type="number"
                  value={editingProduct.tempo_producao || 3}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, tempo_producao: Number(e.target.value || 3) })
                  }
                />
              </label>

              <div className="flex flex-col justify-end gap-3">
                <label className="flex items-center gap-2 font-bold text-primary">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.destaque}
                    onChange={(e) => setEditingProduct({ ...editingProduct, destaque: e.target.checked })}
                  />
                  Produto em destaque
                </label>

                <label className="flex items-center gap-2 font-bold text-primary">
                  <input
                    type="checkbox"
                    checked={editingProduct.ativo !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ativo: e.target.checked })}
                  />
                  Produto ativo
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <Layers size={20} />
                    Variações de preço
                  </h3>
                  <p className="text-sm text-gray-500">
                    Use para quantidade, tamanho, acabamento, frente/verso e outros preços.
                  </p>
                </div>

                <button type="button" className="btn btn-outline" onClick={addVariation}>
                  <Plus size={16} />
                  Adicionar variação
                </button>
              </div>

              {(!editingProduct.variacoes || editingProduct.variacoes.length === 0) && (
                <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-4 text-gray-500 text-sm">
                  Nenhuma variação cadastrada. O produto usará apenas o preço base.
                </div>
              )}

              <div className="space-y-4">
                {(editingProduct.variacoes || []).map((v, index) => (
                  <div key={v.id || index} className="rounded-3xl border border-gray-200 p-4 bg-white">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-bold text-primary">Variação {index + 1}</p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-gray-50 text-gray-600"
                          onClick={() => duplicateVariation(index)}
                          title="Duplicar"
                        >
                          <Copy size={16} />
                        </button>

                        <button
                          type="button"
                          className="p-2 rounded-lg bg-red-50 text-red-600"
                          onClick={() => removeVariation(index)}
                          title="Remover"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label>
                        <span className="text-sm font-bold text-primary">Nome da variação</span>
                        <input
                          className="input mt-1"
                          placeholder="Ex: 5 unidades, 10 unidades, 60x90"
                          value={v.nome || ''}
                          onChange={(e) => updateVariation(index, 'nome', e.target.value)}
                        />
                      </label>

                      <label>
                        <span className="text-sm font-bold text-primary">Quantidade</span>
                        <input
                          className="input mt-1"
                          placeholder="Ex: 5 unidades"
                          value={v.quantidade || ''}
                          onChange={(e) => updateVariation(index, 'quantidade', e.target.value)}
                        />
                      </label>

                      <label>
                        <span className="text-sm font-bold text-primary">Preço</span>
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.01"
                          placeholder="Preço"
                          value={v.preco || ''}
                          onChange={(e) => updateVariation(index, 'preco', Number(e.target.value || 0))}
                        />
                      </label>

                      <label>
                        <span className="text-sm font-bold text-primary">Preço original</span>
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.01"
                          placeholder="Opcional"
                          value={v.preco_original || ''}
                          onChange={(e) =>
                            updateVariation(index, 'preco_original', Number(e.target.value || 0) || null)
                          }
                        />
                      </label>

                      <label>
                        <span className="text-sm font-bold text-primary">Estoque</span>
                        <input
                          className="input mt-1"
                          type="number"
                          placeholder="Estoque"
                          value={v.estoque || ''}
                          onChange={(e) => updateVariation(index, 'estoque', Number(e.target.value || 0))}
                        />
                      </label>

                      <label>
                        <span className="text-sm font-bold text-primary">SKU</span>
                        <input
                          className="input mt-1"
                          placeholder="SKU da variação"
                          value={v.sku || ''}
                          onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                        />
                      </label>
                    </div>

                    <label className="block mt-3">
                      <span className="text-sm font-bold text-primary">Opções extras</span>
                      <input
                        className="input mt-1"
                        placeholder="Ex: Modelo: Frente única | Acabamento: Transparente"
                        value={optionsToText(v.opcoes)}
                        onChange={(e) => updateVariationOptions(index, e.target.value)}
                      />
                      <span className="text-xs text-gray-400">
                        Separe com | e use chave: valor.
                      </span>
                    </label>

                    <label className="flex items-center gap-2 mt-3 font-bold text-primary">
                      <input
                        type="checkbox"
                        checked={v.ativo !== false}
                        onChange={(e) => updateVariation(index, 'ativo', e.target.checked)}
                      />
                      Variação ativa
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
              <button className="btn btn-outline" onClick={close}>
                Cancelar
              </button>

              <button className="btn btn-primary" onClick={saveProduct}>
                Salvar no Supabase
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
