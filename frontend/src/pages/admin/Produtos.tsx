import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { apiFetch, formatMoney, normalizeProduct, Product, slugify } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

type Category = { id: string; nome: string; slug: string; descricao?: string; imagem_url?: string; ativo?: boolean };

type ProductForm = any;

const emptyProduct: ProductForm = {
  id: '', categoria_id: '', nome: '', slug: '', sku: '', categoria_nome: '', descricao: '', descricao_longa: '', preco: 0,
  preco_original: 0, estoque: 0, tempo_producao: 3, imagem_principal: '/assets/chaveiros-personalizados.jpeg', destaque: false, ativo: true
};

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
        apiFetch<{ data: any[] }>('/produtos?limit=50'),
        apiFetch<Category[]>('/categorias')
      ]);
      setProducts((prodRes.data || []).map(normalizeProduct));
      setCategories(cats || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => products.filter((p) =>
    String(p.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.categoria_nome || '').toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  const openNew = () => {
    setEditingProduct({ ...emptyProduct, categoria_id: categories[0]?.id || '', sku: `SKU-${Date.now()}` });
    setMode('new');
  };

  const openEdit = (product: ProductForm) => { setEditingProduct({ ...product }); setMode('edit'); };
  const openView = (product: ProductForm) => { setSelectedProduct(product); setMode('view'); };
  const close = () => { setSelectedProduct(null); setEditingProduct(null); setMode(null); };

  const payloadFromForm = (p: ProductForm) => ({
    categoria_id: p.categoria_id || categories[0]?.id,
    nome: p.nome,
    descricao: p.descricao || p.nome,
    descricao_longa: p.descricao_longa || p.descricao || '',
    preco: Number(p.preco || 0),
    preco_original: Number(p.preco_original || 0) || undefined,
    estoque: Number(p.estoque || 0),
    imagem_principal: p.imagem_principal || '/assets/chaveiros-personalizados.jpeg',
    imagens_adicionais: Array.isArray(p.imagens_adicionais) ? p.imagens_adicionais : [],
    especificacoes: p.especificacoes && typeof p.especificacoes === 'object' ? p.especificacoes : {},
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
      if (mode === 'new') await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(body) });
      else await apiFetch(`/produtos/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(body) });
      close();
      await load();
      alert('Produto salvo no Supabase.');
    } catch (err: any) { alert(err.message); }
  };

  const deleteProduct = async (product: ProductForm) => {
    if (!confirm(`Deseja deletar o produto ${product.nome}?`)) return;
    try {
      await apiFetch(`/produtos/${product.id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const renderActions = (product: ProductForm) => (
    <>
      <button onClick={() => openView(product)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={16} /></button>
      <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 size={16} /></button>
      <button onClick={() => deleteProduct(product)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
    </>
  );

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Produtos</h1>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18} />Novo Produto</button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Buscar por nome ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-11" />
      </div>

      {loading && <div className="card p-4 mb-4">Carregando produtos do Supabase...</div>}

      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-6 py-4">Produto</th><th className="text-left px-6 py-4">Categoria</th><th className="text-left px-6 py-4">Preço</th><th className="text-left px-6 py-4">Estoque</th><th className="text-right px-6 py-4">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{filtered.map((product) => <tr key={product.id}><td className="px-6 py-4"><div className="flex items-center gap-3"><img src={product.imagem_principal} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" /><span className="font-semibold text-primary">{product.nome}</span></div></td><td className="px-6 py-4 text-gray-600">{product.categoria_nome}</td><td className="px-6 py-4 font-semibold">{formatMoney(product.preco)}</td><td className="px-6 py-4 text-gray-600">{product.estoque} un</td><td className="px-6 py-4"><div className="flex items-center justify-end gap-2">{renderActions(product)}</div></td></tr>)}</tbody>
          </table>
        </div>
        <div className="sm:hidden divide-y divide-gray-100">{filtered.map((product) => <div key={product.id} className="p-4"><div className="flex gap-3"><img src={product.imagem_principal} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100" /><div className="flex-1 min-w-0"><h3 className="font-bold text-primary truncate">{product.nome}</h3><p className="text-sm text-gray-500 truncate">{product.categoria_nome}</p><p className="font-bold text-primary mt-1">{formatMoney(product.preco)}</p></div></div><div className="grid grid-cols-3 gap-2 mt-4"><button onClick={() => openView(product)} className="btn btn-outline"><Eye size={16}/>Ver</button><button onClick={() => openEdit(product)} className="btn btn-outline"><Edit2 size={16}/>Editar</button><button onClick={() => deleteProduct(product)} className="btn btn-danger"><Trash2 size={16}/>Deletar</button></div></div>)}</div>
      </div>

      <BottomSheet isOpen={mode === 'view' && !!selectedProduct} onClose={close} title="Detalhes do Produto">
        {selectedProduct && <div className="space-y-3"><img src={selectedProduct.imagem_principal} className="w-full h-48 object-cover rounded-2xl"/><h3 className="font-display text-xl font-bold text-primary">{selectedProduct.nome}</h3><p>{selectedProduct.descricao}</p><p><b>Preço:</b> {formatMoney(selectedProduct.preco)}</p><p><b>Estoque:</b> {selectedProduct.estoque}</p><button className="btn btn-primary w-full" onClick={() => { setEditingProduct(selectedProduct); setSelectedProduct(null); setMode('edit'); }}>Editar produto</button></div>}
      </BottomSheet>

      <BottomSheet isOpen={(mode === 'edit' || mode === 'new') && !!editingProduct} onClose={close} title={mode === 'new' ? 'Novo Produto' : 'Editar Produto'}>
        {editingProduct && <div className="space-y-4"><input className="input" placeholder="Nome" value={editingProduct.nome} onChange={(e) => setEditingProduct({...editingProduct, nome: e.target.value})}/><select className="input" value={editingProduct.categoria_id || ''} onChange={(e) => setEditingProduct({...editingProduct, categoria_id: e.target.value})}><option value="">Selecione uma categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select><input className="input" placeholder="Slug" value={editingProduct.slug || ''} onChange={(e) => setEditingProduct({...editingProduct, slug: e.target.value})}/><input className="input" placeholder="SKU" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}/><textarea className="input min-h-24" placeholder="Descrição" value={editingProduct.descricao || ''} onChange={(e) => setEditingProduct({...editingProduct, descricao: e.target.value})}/><input className="input" placeholder="Preço" type="number" value={editingProduct.preco || ''} onChange={(e) => setEditingProduct({...editingProduct, preco: Number(e.target.value)})}/><input className="input" placeholder="Estoque" type="number" value={editingProduct.estoque || ''} onChange={(e) => setEditingProduct({...editingProduct, estoque: Number(e.target.value)})}/><input className="input" placeholder="URL da imagem" value={editingProduct.imagem_principal || ''} onChange={(e) => setEditingProduct({...editingProduct, imagem_principal: e.target.value})}/><label className="flex items-center gap-2"><input type="checkbox" checked={!!editingProduct.destaque} onChange={(e) => setEditingProduct({...editingProduct, destaque: e.target.checked})}/> Produto em destaque</label><button className="btn btn-primary w-full" onClick={saveProduct}>Salvar no Supabase</button></div>}
      </BottomSheet>
    </div>
  );
}
