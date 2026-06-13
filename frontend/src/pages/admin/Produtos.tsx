import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { mockProducts, formatMoney, Product } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const emptyProduct: Product = {
  id: '',
  nome: '',
  slug: '',
  categoria_nome: '',
  descricao: '',
  descricao_completa: '',
  preco: 0,
  estoque: 0,
  tempo_producao: 3,
  imagem_principal: '/assets/chaveiros-personalizados.jpeg',
  imagens_adicionais: [],
  especificacoes: {},
  destaque: false,
  avaliacao_media: 5,
};

export function Produtos() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'new' | null>(null);

  const filtered = products.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria_nome.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingProduct({ ...emptyProduct, id: String(Date.now()) });
    setMode('new');
  };

  const openEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setMode('edit');
  };

  const openView = (product: Product) => {
    setSelectedProduct(product);
    setMode('view');
  };

  const close = () => {
    setSelectedProduct(null);
    setEditingProduct(null);
    setMode(null);
  };

  const saveProduct = () => {
    if (!editingProduct) return;
    const slug = editingProduct.slug || editingProduct.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const saved = { ...editingProduct, slug };

    if (mode === 'new') {
      setProducts((prev) => [saved, ...prev]);
    } else {
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    }

    close();
    alert('Produto salvo com sucesso.');
  };

  const deleteProduct = (product: Product) => {
    if (confirm(`Deseja deletar o produto ${product.nome}?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    }
  };

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Produtos</h1>
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

      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Produto</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Categoria</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Preço</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Estoque</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="text-right px-6 py-4 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.imagem_principal} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                      <span className="font-semibold text-primary">{product.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{product.categoria_nome}</td>
                  <td className="px-6 py-4 font-semibold">{formatMoney(product.preco)}</td>
                  <td className="px-6 py-4 text-gray-600">{product.estoque} un</td>
                  <td className="px-6 py-4"><span className="inline-flex px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-bold">Ativo</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openView(product)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={16} /></button>
                      <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => deleteProduct(product)} className="p-2 rounded-lg hover:bg-red-50 text-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((product) => (
            <div key={product.id} className="p-4 flex gap-4">
              <img src={product.imagem_principal} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-primary truncate">{product.nome}</h3>
                <p className="text-sm text-gray-500 mb-2">{product.categoria_nome}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-primary">{formatMoney(product.preco)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openView(product)} className="p-2.5 rounded-lg bg-gray-100 text-gray-600"><Eye size={17} /></button>
                    <button onClick={() => openEdit(product)} className="p-2.5 rounded-lg bg-blue-50 text-blue-600"><Edit2 size={17} /></button>
                    <button onClick={() => deleteProduct(product)} className="p-2.5 rounded-lg bg-red-50 text-danger"><Trash2 size={17} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomSheet isOpen={mode === 'view'} onClose={close} title={selectedProduct?.nome || 'Produto'}>
        {selectedProduct && (
          <div className="space-y-4">
            <img src={selectedProduct.imagem_principal} alt="" className="w-full h-48 object-cover rounded-xl" />
            <div><p className="text-sm text-gray-500 mb-1">Categoria</p><p className="font-semibold">{selectedProduct.categoria_nome}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500 mb-1">Preço</p><p className="font-bold text-primary text-lg">{formatMoney(selectedProduct.preco)}</p></div>
              <div><p className="text-sm text-gray-500 mb-1">Estoque</p><p className="font-semibold">{selectedProduct.estoque} unidades</p></div>
            </div>
            <div><p className="text-sm text-gray-500 mb-1">Descrição</p><p className="text-gray-700 text-sm leading-relaxed">{selectedProduct.descricao}</p></div>
            <div className="flex gap-3 pt-4">
              <button className="btn btn-outline flex-1" onClick={() => openEdit(selectedProduct)}>Editar</button>
              <button className="btn btn-danger flex-1" onClick={() => deleteProduct(selectedProduct)}>Excluir</button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={mode === 'edit' || mode === 'new'} onClose={close} title={mode === 'new' ? 'Novo Produto' : 'Editar Produto'}>
        {editingProduct && (
          <div className="space-y-4">
            <input className="input" placeholder="Nome do produto" value={editingProduct.nome} onChange={(e) => setEditingProduct({ ...editingProduct, nome: e.target.value })} />
            <input className="input" placeholder="Categoria" value={editingProduct.categoria_nome} onChange={(e) => setEditingProduct({ ...editingProduct, categoria_nome: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Preço" value={editingProduct.preco} onChange={(e) => setEditingProduct({ ...editingProduct, preco: Number(e.target.value) })} />
              <input className="input" placeholder="Estoque" value={editingProduct.estoque} onChange={(e) => setEditingProduct({ ...editingProduct, estoque: Number(e.target.value) })} />
            </div>
            <input className="input" placeholder="URL da imagem" value={editingProduct.imagem_principal} onChange={(e) => setEditingProduct({ ...editingProduct, imagem_principal: e.target.value })} />
            <textarea className="input min-h-28" placeholder="Descrição" value={editingProduct.descricao} onChange={(e) => setEditingProduct({ ...editingProduct, descricao: e.target.value, descricao_completa: e.target.value })} />
            <button className="btn btn-primary w-full" onClick={saveProduct}>Salvar Produto</button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
