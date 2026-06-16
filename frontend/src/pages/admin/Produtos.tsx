import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Copy, X } from 'lucide-react';
import { apiFetch, formatMoney, normalizeProduct, Product, ProductVariation, slugify } from '../../lib/api';
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
  preco_original?: number | null;
  ativo?: boolean;
  variacoes: ProductVariation[];
};

const emptyProduct: ProductForm = {
  id: '',
  categoria_id: '',
  nome: '',
  slug: '',
  sku: '',
  descricao: '',
  descricao_longa: '',
  preco: 0,
  preco_original: null,
  estoque: 0,
  tempo_producao: 3,
  imagem_principal: '/assets/chaveiros-personalizados.jpeg',
  imagens_adicionais: [],
  especificacoes: {},
  destaque: false,
  ativo: true,
  peso: 0,
  dimensoes: {},
  variacoes: []
};

function makeVariation(): ProductVariation {
  return {
    id: String(Date.now() + Math.random()),
    nome: '',
    quantidade: '',
    modelo: '',
    acabamento: '',
    tamanho: '',
    preco: 0,
    estoque: 0,
    ativo: true
  };
}

function normalizeVariations(value: any): ProductVariation[] {
  if (!Array.isArray(value)) return [];

  return value.map((v) => ({
    id: v?.id || String(Date.now() + Math.random()),
    nome: v?.nome || '',
    quantidade: v?.quantidade || '',
    modelo: v?.modelo || '',
    acabamento: v?.acabamento || '',
    tamanho: v?.tamanho || '',
    preco: Number(v?.preco || 0),
    estoque: Number(v?.estoque || 0),
    ativo: v?.ativo !== false
  }));
}

function productMinPrice(product: ProductForm) {
  const activeVariations = normalizeVariations(product.variacoes).filter((v) => v.ativo !== false && Number(v.preco || 0) > 0);
  if (activeVariations.length === 0) return Number(product.preco || 0);
  return Math.min(...activeVariations.map((v) => Number(v.preco || 0)));
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

      setProducts((prodRes.data || []).map((p) => ({ ...normalizeProduct(p), variacoes: normalizeVariations(p.variacoes) })) as ProductForm[]);
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

  const filtered = useMemo(() => {
    return products.filter((p) =>
      String(p.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.categoria_nome || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.sku || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const openNew = () => {
    setEditingProduct({
      ...emptyProduct,
      categoria_id: categories[0]?.id || '',
      sku: `SKU-${Date.now()}`,
      variacoes: []
    });
    setMode('new');
  };

  const openEdit = (product: ProductForm) => {
    setEditingProduct({ ...product, variacoes: normalizeVariations(product.variacoes) });
    setMode('edit');
  };

  const openView = (product: ProductForm) => {
    setSelectedProduct({ ...product, variacoes: normalizeVariations(product.variacoes) });
    setMode('view');
  };

  const close = () => {
    setSelectedProduct(null);
    setEditingProduct(null);
    setMode(null);
  };

  const payloadFromForm = (p: ProductForm) => ({
    categoria_id: p.categoria_id || categories[0]?.id,
    nome: p.nome,
    descricao: p.descricao || p.nome,
    descricao_longa: p.descricao_longa || p.descricao || '',
    preco: Number(p.preco || 0),
    preco_original: p.preco_original ? Number(p.preco_original) : null,
    estoque: Number(p.estoque || 0),
    imagem_principal: p.imagem_principal || '/assets/chaveiros-personalizados.jpeg',
    imagens_adicionais: Array.isArray(p.imagens_adicionais) ? p.imagens_adicionais : [],
    especificacoes: p.especificacoes && typeof p.especificacoes === 'object' ? p.especificacoes : {},
    variacoes: normalizeVariations(p.variacoes)
      .filter((v) => String(v.nome || '').trim() || Number(v.preco || 0) > 0)
      .map((v) => ({
        id: v.id || String(Date.now() + Math.random()),
        nome: v.nome || v.quantidade || v.modelo || 'Variação',
        quantidade: v.quantidade || '',
        modelo: v.modelo || '',
        acabamento: v.acabamento || '',
        tamanho: v.tamanho || '',
        preco: Number(v.preco || 0),
        estoque: Number(v.estoque || 0),
        ativo: v.ativo !== false
      })),
    slug: p.slug || slugify(p.nome),
    sku: p.sku || `SKU-${Date.now()}`,
    peso: Number(p.peso || 0),
    dimensoes: p.dimensoes && typeof p.dimensoes === 'object' ? p.dimensoes : {},
    tempo_producao: Number(p.tempo_producao || 3),
    destaque: Boolean(p.destaque),
    ativo: p.ativo !== false
  });

  const saveProduct = async () => {
    if (!editingProduct?.nome) return alert('Informe o nome do produto.');
    if (!editingProduct.categoria_id && !categories[0]?.id) return alert('Cadastre uma categoria antes de salvar produto.');

    try {
      const body = payloadFromForm(editingProduct);

      if (mode === 'new') {
        await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiFetch(`/produtos/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(body) });
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
      alert('Produto excluído.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
    }
  };

  const duplicateProduct = async (product: ProductForm) => {
    if (!confirm(`Deseja duplicar o produto ${product.nome}?`)) return;

    try {
      const body = payloadFromForm({
        ...product,
        id: '',
        nome: `${product.nome} - Cópia`,
        slug: `${slugify(product.nome)}-copia-${Date.now()}`,
        sku: `${product.sku || 'SKU'}-COPIA-${Date.now()}`,
        destaque: false,
        variacoes: normalizeVariations(product.variacoes).map((v, index) => ({
          ...v,
          id: `VAR-${Date.now()}-${index}`
        }))
      });

      await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(body) });
      await load();
      alert('Produto duplicado com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar produto.');
    }
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    if (!editingProduct) return;

    const next = normalizeVariations(editingProduct.variacoes);
    next[index] = {
      ...next[index],
      [field]: field === 'preco' || field === 'estoque' ? Number(value || 0) : value
    };

    setEditingProduct({ ...editingProduct, variacoes: next });
  };

  const addVariation = () => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, variacoes: [...normalizeVariations(editingProduct.variacoes), makeVariation()] });
  };

  const removeVariation = (index: number) => {
    if (!editingProduct) return;
    const next = normalizeVariations(editingProduct.variacoes).filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, variacoes: next });
  };

  const renderActions = (product: ProductForm) => (
    <>
      <button
        onClick={(event) => {
          event.stopPropagation();
          duplicateProduct(product);
        }}
        className="p-2 rounded-lg hover:bg-amber-50 text-amber-700"
        title="Duplicar"
      >
        <Copy size={16} />
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          deleteProduct(product);
        }}
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
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Produtos</h1>
          <p className="text-gray-500 mt-1">Clique no produto para editar. Use Duplicar para criar uma cópia.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome, SKU ou categoria..."
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
                <th className="text-left px-6 py-4">Estoque</th>
                <th className="text-left px-6 py-4">Variações</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => {
                const qtdVariacoes = normalizeVariations(product.variacoes).length;
                return (
                  <tr key={product.id} onClick={() => openEdit(product)} className="cursor-pointer hover:bg-amber-50/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.imagem_principal} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        <span className="font-semibold text-primary">{product.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.categoria_nome}</td>
                    <td className="px-6 py-4 font-semibold">
                      {qtdVariacoes > 0 ? `A partir de ${formatMoney(productMinPrice(product))}` : formatMoney(product.preco)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.estoque} un</td>
                    <td className="px-6 py-4 text-gray-600">{qtdVariacoes}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">{renderActions(product)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((product) => {
            const qtdVariacoes = normalizeVariations(product.variacoes).length;
            return (
              <div key={product.id} className="p-4 cursor-pointer active:bg-amber-50" onClick={() => openEdit(product)}>
                <div className="flex gap-3">
                  <img src={product.imagem_principal} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary truncate">{product.nome}</h3>
                    <p className="text-sm text-gray-500 truncate">{product.categoria_nome}</p>
                    <p className="font-bold text-primary mt-1">
                      {qtdVariacoes > 0 ? `A partir de ${formatMoney(productMinPrice(product))}` : formatMoney(product.preco)}
                    </p>
                    <p className="text-xs text-gray-500">{qtdVariacoes} variação(ões)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => duplicateProduct(product)} className="btn btn-outline px-2"><Copy size={16} />Duplicar</button>
                  <button onClick={() => deleteProduct(product)} className="btn btn-danger px-2"><Trash2 size={16} />Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomSheet isOpen={mode === 'view' && !!selectedProduct} onClose={close} title="Detalhes do Produto">
        {selectedProduct && (
          <div className="space-y-4">
            <img src={selectedProduct.imagem_principal} className="w-full h-56 object-cover rounded-2xl" />
            <div>
              <h3 className="font-display text-xl font-bold text-primary">{selectedProduct.nome}</h3>
              <p className="text-gray-600">{selectedProduct.descricao}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="card p-4 shadow-none"><p className="text-sm text-gray-500">Preço base</p><p className="font-bold text-primary">{formatMoney(selectedProduct.preco)}</p></div>
              <div className="card p-4 shadow-none"><p className="text-sm text-gray-500">Estoque</p><p className="font-bold text-primary">{selectedProduct.estoque}</p></div>
              <div className="card p-4 shadow-none"><p className="text-sm text-gray-500">Variações</p><p className="font-bold text-primary">{normalizeVariations(selectedProduct.variacoes).length}</p></div>
            </div>
            {normalizeVariations(selectedProduct.variacoes).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-primary">Variações</h4>
                {normalizeVariations(selectedProduct.variacoes).map((v) => (
                  <div key={v.id} className="rounded-2xl border border-gray-100 p-3">
                    <p className="font-bold text-primary">{v.nome}</p>
                    <p className="text-sm text-gray-500">Qtd: {v.quantidade || '-'} • Modelo: {v.modelo || '-'} • Acabamento: {v.acabamento || '-'}</p>
                    <p className="font-bold text-primary">{formatMoney(v.preco)}</p>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary w-full" onClick={() => openEdit(selectedProduct)}>Editar produto</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={(mode === 'edit' || mode === 'new') && !!editingProduct} onClose={close} title={mode === 'new' ? 'Novo Produto' : 'Editar Produto'}>
        {editingProduct && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary">Nome</span>
                <input className="input" placeholder="Nome" value={editingProduct.nome} onChange={(e) => setEditingProduct({ ...editingProduct, nome: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-primary">Categoria</span>
                <select className="input" value={editingProduct.categoria_id || ''} onChange={(e) => setEditingProduct({ ...editingProduct, categoria_id: e.target.value })}>
                  <option value="">Selecione uma categoria</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary">Slug</span>
                <input className="input" placeholder="Slug" value={editingProduct.slug || ''} onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-primary">SKU</span>
                <input className="input" placeholder="SKU" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary">Descrição curta</span>
              <textarea className="input min-h-24" placeholder="Descrição" value={editingProduct.descricao || ''} onChange={(e) => setEditingProduct({ ...editingProduct, descricao: e.target.value })} />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-primary">Descrição completa</span>
              <textarea className="input min-h-28" placeholder="Descrição longa" value={editingProduct.descricao_longa || ''} onChange={(e) => setEditingProduct({ ...editingProduct, descricao_longa: e.target.value })} />
            </label>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block"><span className="text-sm font-bold text-primary">Preço base</span><input className="input" placeholder="Preço" type="number" value={editingProduct.preco || ''} onChange={(e) => setEditingProduct({ ...editingProduct, preco: Number(e.target.value) })} /></label>
              <label className="block"><span className="text-sm font-bold text-primary">Preço original</span><input className="input" placeholder="Preço original" type="number" value={editingProduct.preco_original || ''} onChange={(e) => setEditingProduct({ ...editingProduct, preco_original: Number(e.target.value) })} /></label>
              <label className="block"><span className="text-sm font-bold text-primary">Estoque</span><input className="input" placeholder="Estoque" type="number" value={editingProduct.estoque || ''} onChange={(e) => setEditingProduct({ ...editingProduct, estoque: Number(e.target.value) })} /></label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary">URL da imagem principal</span>
              <input className="input" placeholder="URL da imagem" value={editingProduct.imagem_principal || ''} onChange={(e) => setEditingProduct({ ...editingProduct, imagem_principal: e.target.value })} />
            </label>

            <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-primary">Variações de preço</h3>
                  <p className="text-sm text-gray-500">Use para quantidades, modelos, acabamentos ou tamanhos com preços diferentes.</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={addVariation}><Plus size={16} />Adicionar</button>
              </div>

              {normalizeVariations(editingProduct.variacoes).length === 0 && (
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">Nenhuma variação cadastrada. O produto usará o preço base.</p>
              )}

              <div className="space-y-3">
                {normalizeVariations(editingProduct.variacoes).map((variation, index) => (
                  <div key={variation.id || index} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-primary">Variação {index + 1}</p>
                      <button type="button" className="rounded-lg bg-red-50 p-2 text-red-600" onClick={() => removeVariation(index)}><X size={16} /></button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input className="input" placeholder="Nome da variação. Ex: 5 unidades" value={variation.nome || ''} onChange={(e) => updateVariation(index, 'nome', e.target.value)} />
                      <input className="input" placeholder="Quantidade. Ex: 5 unidades" value={variation.quantidade || ''} onChange={(e) => updateVariation(index, 'quantidade', e.target.value)} />
                      <input className="input" placeholder="Modelo. Ex: Frente única" value={variation.modelo || ''} onChange={(e) => updateVariation(index, 'modelo', e.target.value)} />
                      <input className="input" placeholder="Acabamento. Ex: Transparente" value={variation.acabamento || ''} onChange={(e) => updateVariation(index, 'acabamento', e.target.value)} />
                      <input className="input" placeholder="Tamanho. Ex: 5x5 cm" value={variation.tamanho || ''} onChange={(e) => updateVariation(index, 'tamanho', e.target.value)} />
                      <input className="input" placeholder="Preço da variação" type="number" value={variation.preco || ''} onChange={(e) => updateVariation(index, 'preco', e.target.value)} />
                      <input className="input" placeholder="Estoque da variação" type="number" value={variation.estoque || ''} onChange={(e) => updateVariation(index, 'estoque', e.target.value)} />
                      <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-primary"><input type="checkbox" checked={variation.ativo !== false} onChange={(e) => updateVariation(index, 'ativo', e.target.checked)} /> Ativa</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-3"><input type="checkbox" checked={!!editingProduct.destaque} onChange={(e) => setEditingProduct({ ...editingProduct, destaque: e.target.checked })} /> Destaque</label>
              <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-3"><input type="checkbox" checked={editingProduct.ativo !== false} onChange={(e) => setEditingProduct({ ...editingProduct, ativo: e.target.checked })} /> Ativo</label>
              <label className="block"><span className="text-sm font-bold text-primary">Produção em dias</span><input className="input" type="number" value={editingProduct.tempo_producao || 3} onChange={(e) => setEditingProduct({ ...editingProduct, tempo_producao: Number(e.target.value) })} /></label>
            </div>

            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveProduct}>Salvar no Supabase</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
