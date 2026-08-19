import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  WalletCards
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch, formatMoney, normalizeProduct, Product } from '../../lib/api';

type PdvItem = {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  detalhes: string;
};

const etapas = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'arte', label: 'Criação da arte' },
  { value: 'aprovacao', label: 'Aguardando aprovação' },
  { value: 'producao', label: 'Em produção' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'finalizado', label: 'Finalizado' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: unknown) {
  const clean = String(value || '').slice(0, 10);
  if (!clean) return 'A combinar';
  return new Date(`${clean}T12:00:00`).toLocaleDateString('pt-BR');
}

export function PDV() {
  const [tab, setTab] = useState<'venda' | 'producao'>('venda');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<PdvItem[]>([]);
  const [search, setSearch] = useState('');
  const [productionSearch, setProductionSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState({ nome: '', telefone: '', email: '' });
  const [sale, setSale] = useState({
    desconto: '0',
    valor_recebido: '0',
    metodo_pagamento: 'pix',
    tipo_entrega: 'retirada',
    endereco_entrega: '',
    prazo_entrega: today(),
    observacoes: ''
  });

  async function load() {
    setLoading(true);
    try {
      const [productResult, productionResult] = await Promise.all([
        apiFetch<any>('/produtos?limit=100'),
        apiFetch<any[]>('/admin/producao')
      ]);
      const rows = Array.isArray(productResult) ? productResult : productResult?.data || [];
      setProducts(rows.map(normalizeProduct));
      setOrders(Array.isArray(productionResult) ? productionResult : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar o PDV.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const productsMap = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [products]);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => !q || [product.nome, product.sku, product.categoria_nome].join(' ').toLowerCase().includes(q));
  }, [products, search]);
  const filteredOrders = useMemo(() => {
    const q = productionSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !q || [order.numero_pedido, order.cliente_nome, order.cliente_telefone, order.observacoes].join(' ').toLowerCase().includes(q);
      return matchesText && !['cancelado', 'entregue'].includes(String(order.status || ''));
    });
  }, [orders, productionSearch]);

  const subtotal = cart.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0);
  const desconto = Math.max(Number(sale.desconto || 0), 0);
  const total = Math.max(subtotal - desconto, 0);
  const recebido = Math.max(Number(sale.valor_recebido || 0), 0);
  const restante = Math.max(total - recebido, 0);

  function addProduct(product: Product) {
    setCart((current) => {
      const found = current.find((item) => item.produto_id === product.id && !item.detalhes);
      if (found) return current.map((item) => item === found ? { ...item, quantidade: item.quantidade + 1 } : item);
      return [...current, {
        produto_id: product.id,
        nome: product.nome,
        quantidade: 1,
        preco_unitario: Number(product.preco || 0),
        detalhes: ''
      }];
    });
  }

  function updateItem(index: number, changes: Partial<PdvItem>) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  async function finishSale() {
    if (!client.nome.trim()) return alert('Informe o nome do cliente.');
    if (!client.telefone.trim()) return alert('Informe o WhatsApp do cliente.');
    if (!cart.length) return alert('Adicione pelo menos um produto.');
    if (total <= 0) return alert('O valor total da venda precisa ser maior que zero.');
    if (sale.tipo_entrega === 'entrega' && !sale.endereco_entrega.trim()) return alert('Informe o endereço da entrega.');

    setSaving(true);
    try {
      const order = await apiFetch<any>('/admin/pdv/vendas', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nome: client.nome,
          cliente_telefone: client.telefone,
          cliente_email: client.email,
          items: cart.map((item) => ({
            produto_id: item.produto_id,
            nome: item.nome,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            especificacoes: item.detalhes ? { detalhes: item.detalhes } : {}
          })),
          desconto,
          valor_recebido: Math.min(recebido, total),
          metodo_pagamento: sale.metodo_pagamento,
          tipo_entrega: sale.tipo_entrega,
          endereco_entrega: sale.endereco_entrega,
          prazo_entrega: sale.prazo_entrega || null,
          observacoes: sale.observacoes
        })
      });
      setCart([]);
      setClient({ nome: '', telefone: '', email: '' });
      setSale({ desconto: '0', valor_recebido: '0', metodo_pagamento: 'pix', tipo_entrega: 'retirada', endereco_entrega: '', prazo_entrega: today(), observacoes: '' });
      await load();
      alert(`Venda ${order.numero_pedido} registrada com sucesso.`);
      await printOrder(order.id);
    } catch (error: any) {
      alert(error.message || 'Erro ao registrar a venda.');
    } finally {
      setSaving(false);
    }
  }

  async function updateProduction(order: any, changes: Record<string, string>) {
    try {
      await apiFetch(`/admin/producao/${order.id}`, { method: 'PUT', body: JSON.stringify(changes) });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...changes } : item));
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar a produção.');
    }
  }

  async function printOrder(orderId: string) {
    const popup = window.open('', '_blank', 'width=520,height=760');
    if (!popup) return alert('O navegador bloqueou a impressão. Permita pop-ups para este site.');
    popup.document.write('<p style="font-family:Arial;padding:20px">Preparando comanda...</p>');
    try {
      const documentData = await apiFetch<any>(`/admin/pedidos/${orderId}/documento`);
      const order = documentData.pedido;
      const items = Array.isArray(documentData.itens) ? documentData.itens : [];
      const itemRows = items.map((item: any) => {
        const product = productsMap[item.produto_id];
        const specs = item.especificacoes && typeof item.especificacoes === 'object' ? item.especificacoes : {};
        const name = specs.nome_produto || product?.nome || 'Produto';
        const details = Object.entries(specs).filter(([key]) => key !== 'nome_produto').map(([key, value]) => `<div>${escapeHtml(key)}: ${escapeHtml(value)}</div>`).join('');
        return `<div class="item"><b>${item.quantidade}x ${escapeHtml(name)}</b><span>${escapeHtml(formatMoney(Number(item.preco_unitario || 0) * Number(item.quantidade || 0)))}</span>${details ? `<small>${details}</small>` : ''}</div>`;
      }).join('');
      const tracking = `${window.location.origin}/acompanhar?pedido=${encodeURIComponent(order.numero_pedido)}`;
      popup.document.open();
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comanda ${escapeHtml(order.numero_pedido)}</title><style>
        @page{margin:3mm}*{box-sizing:border-box}html,body{width:80mm}body{width:74mm;margin:0 auto;color:#000;font:11px Arial,sans-serif}h1{font-size:17px;margin:0;text-align:center}h2{font-size:13px;margin:4px 0;text-align:center}.center{text-align:center}.line{border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:8px;margin:3px 0}.item{position:relative;padding:5px 0;border-bottom:1px dotted #777}.item>span{float:right}.item small{display:block;clear:both;margin-top:3px}.strong{font-size:14px;font-weight:bold}.note{white-space:pre-wrap;border:1px solid #000;padding:5px;margin-top:5px}.tracking{font-size:9px;word-break:break-all}.no-print{margin:12px 0;padding:10px;width:100%;font-weight:bold}@media print{.no-print{display:none}}
      </style></head><body><button class="no-print" onclick="window.print()">IMPRIMIR COMANDA</button><h1>${escapeHtml(documentData.empresa?.nome || 'Gráfica W Criações')}</h1><h2>ORDEM DE PRODUÇÃO</h2><div class="line"></div><div class="row strong"><span>Pedido</span><span>${escapeHtml(order.numero_pedido)}</span></div><div class="row"><span>Data</span><span>${escapeHtml(new Date(order.created_at).toLocaleString('pt-BR'))}</span></div><div class="row"><span>Prazo</span><span>${escapeHtml(formatDate(order.prazo_entrega || order.data_entrega_estimada))}</span></div><div class="row"><span>Prioridade</span><span>${order.prioridade === 'urgente' ? 'URGENTE' : 'Normal'}</span></div><div class="line"></div><b>CLIENTE</b><div>${escapeHtml(order.cliente_nome)}</div><div>${escapeHtml(order.cliente_telefone)}</div><div>${escapeHtml(order.endereco_entrega)}</div><div class="line"></div><b>ITENS</b>${itemRows || '<div class="item">Descrição não cadastrada nos itens.</div>'}<div class="line"></div><div class="row"><span>Subtotal</span><span>${escapeHtml(formatMoney(order.subtotal))}</span></div><div class="row"><span>Desconto</span><span>${escapeHtml(formatMoney(order.desconto))}</span></div><div class="row strong"><span>Total</span><span>${escapeHtml(formatMoney(order.total))}</span></div><div class="row"><span>Pago</span><span>${escapeHtml(formatMoney(order.valor_entrada))}</span></div><div class="row"><span>Restante</span><span>${escapeHtml(formatMoney(order.valor_restante))}</span></div><div><b>Pagamento:</b> ${escapeHtml(order.metodo_pagamento)}</div><div class="line"></div><b>OBSERVAÇÕES</b><div class="note">${escapeHtml(order.observacoes || 'Sem observações.')}</div><div class="line"></div><div class="center"><b>ACOMPANHAMENTO</b><div class="tracking">${escapeHtml(tracking)}</div></div></body></html>`);
      popup.document.close();
      await apiFetch(`/admin/producao/${orderId}/impressao`, { method: 'POST' }).catch(() => null);
      popup.focus();
      setTimeout(() => popup.print(), 350);
    } catch (error: any) {
      popup.close();
      alert(error.message || 'Erro ao preparar a comanda.');
    }
  }

  return (
    <div className="fade-in p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2"><ShoppingCart /> PDV e Produção</h1><p className="text-gray-500 mt-1">Venda presencial, caixa e comandas em um só lugar.</p></div>
        <div className="flex flex-col sm:flex-row gap-2"><Link className="btn btn-outline" to="/admin/fluxo-caixa"><WalletCards size={18} /> Entradas e saídas</Link><button className="btn btn-outline" onClick={load}><RefreshCw size={18} /> Atualizar</button></div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6 max-w-xl">
        <button className={`btn ${tab === 'venda' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('venda')}><Banknote size={18} /> Nova venda</button>
        <button className={`btn ${tab === 'producao' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('producao')}><ClipboardList size={18} /> Produção</button>
      </div>

      {loading && <div className="card p-5">Carregando dados do PDV...</div>}
      {!loading && tab === 'venda' && <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-5">
        <section className="space-y-5">
          <div className="card p-5"><h2 className="font-bold text-primary text-lg mb-4">1. Cliente</h2><div className="grid md:grid-cols-3 gap-3"><input className="input" placeholder="Nome do cliente *" value={client.nome} onChange={(e) => setClient({ ...client, nome: e.target.value })} /><input className="input" placeholder="WhatsApp *" value={client.telefone} onChange={(e) => setClient({ ...client, telefone: e.target.value })} /><input className="input" placeholder="E-mail (opcional)" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} /></div></div>
          <div className="card p-5"><h2 className="font-bold text-primary text-lg mb-4">2. Produtos</h2><div className="relative mb-4"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input className="input pl-11" placeholder="Buscar produto ou SKU" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[430px] overflow-y-auto pr-1">{filteredProducts.map((product) => <button key={product.id} className="text-left border-2 border-gray-100 hover:border-gold rounded-2xl p-3 transition" onClick={() => addProduct(product)}><img src={product.imagem_principal || '/assets/chaveiros-personalizados.jpeg'} className="w-full h-24 object-cover rounded-xl mb-2" /><b className="text-primary line-clamp-2">{product.nome}</b><span className="block text-sm font-bold text-gold mt-1">{formatMoney(product.preco)}</span><span className="text-xs text-gray-500">Toque para adicionar</span></button>)}</div></div>
        </section>
        <section className="space-y-5">
          <div className="card p-5 xl:sticky xl:top-5"><h2 className="font-bold text-primary text-lg mb-4 flex items-center gap-2"><PackagePlus size={20} /> 3. Itens da venda</h2>{cart.length === 0 && <p className="text-gray-500 py-8 text-center">Adicione produtos para iniciar.</p>}<div className="space-y-3">{cart.map((item, index) => <div key={`${item.produto_id}-${index}`} className="border rounded-2xl p-3"><div className="flex justify-between gap-3"><b className="text-primary">{item.nome}</b><button className="text-red-600" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={18} /></button></div><div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center mt-3"><button className="p-2 rounded-lg bg-gray-100" onClick={() => updateItem(index, { quantidade: Math.max(1, item.quantidade - 1) })}><Minus size={16} /></button><input className="input text-center py-2" type="number" min="1" value={item.quantidade} onChange={(e) => updateItem(index, { quantidade: Math.max(1, Number(e.target.value)) })} /><button className="p-2 rounded-lg bg-gray-100" onClick={() => updateItem(index, { quantidade: item.quantidade + 1 })}><Plus size={16} /></button></div><label className="block text-xs font-bold mt-3">Preço unitário<input className="input py-2 mt-1" type="number" min="0" step="0.01" value={item.preco_unitario} onChange={(e) => updateItem(index, { preco_unitario: Math.max(0, Number(e.target.value)) })} /></label><textarea className="input py-2 mt-2" rows={2} placeholder="Tamanho, material, acabamento, texto..." value={item.detalhes} onChange={(e) => updateItem(index, { detalhes: e.target.value })} /><div className="text-right font-bold text-primary mt-2">{formatMoney(item.quantidade * item.preco_unitario)}</div></div>)}</div>
            {cart.length > 0 && <><div className="line border-t my-4" /><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Desconto<input className="input py-2 mt-1" type="number" min="0" value={sale.desconto} onChange={(e) => setSale({ ...sale, desconto: e.target.value })} /></label><label className="text-xs font-bold">Valor recebido<input className="input py-2 mt-1" type="number" min="0" value={sale.valor_recebido} onChange={(e) => setSale({ ...sale, valor_recebido: e.target.value })} /></label></div><label className="block text-xs font-bold mt-3">Forma de pagamento<select className="input py-2 mt-1" value={sale.metodo_pagamento} onChange={(e) => setSale({ ...sale, metodo_pagamento: e.target.value })}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select></label><div className="grid grid-cols-2 gap-3 mt-3"><label className="text-xs font-bold">Entrega<select className="input py-2 mt-1" value={sale.tipo_entrega} onChange={(e) => setSale({ ...sale, tipo_entrega: e.target.value })}><option value="retirada">Retirada</option><option value="entrega">Entrega</option></select></label><label className="text-xs font-bold">Prazo<input className="input py-2 mt-1" type="date" value={sale.prazo_entrega} onChange={(e) => setSale({ ...sale, prazo_entrega: e.target.value })} /></label></div>{sale.tipo_entrega === 'entrega' && <input className="input py-2 mt-3" placeholder="Endereço completo *" value={sale.endereco_entrega} onChange={(e) => setSale({ ...sale, endereco_entrega: e.target.value })} />}<textarea className="input py-2 mt-3" rows={3} placeholder="Observações gerais da produção" value={sale.observacoes} onChange={(e) => setSale({ ...sale, observacoes: e.target.value })} /><div className="bg-slate-950 text-white rounded-2xl p-4 mt-4 space-y-2"><div className="flex justify-between"><span>Subtotal</span><b>{formatMoney(subtotal)}</b></div><div className="flex justify-between"><span>Desconto</span><b>- {formatMoney(desconto)}</b></div><div className="flex justify-between text-xl text-amber-300"><span>Total</span><b>{formatMoney(total)}</b></div><div className="flex justify-between text-sm"><span>Restante</span><b>{formatMoney(restante)}</b></div></div><button className="btn btn-primary w-full mt-4" disabled={saving} onClick={finishSale}><CheckCircle2 size={20} /> {saving ? 'Registrando...' : 'Finalizar e imprimir'}</button></>}
          </div>
        </section>
      </div>}

      {!loading && tab === 'producao' && <div><div className="card p-4 mb-5"><div className="relative"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input className="input pl-11" placeholder="Buscar pedido, cliente ou telefone" value={productionSearch} onChange={(e) => setProductionSearch(e.target.value)} /></div></div><div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">{filteredOrders.map((order) => <article key={order.id} className={`card p-5 border-l-4 ${order.prioridade === 'urgente' ? 'border-l-red-500' : 'border-l-amber-400'}`}><div className="flex justify-between gap-3"><div><span className="text-xs text-gray-500">{formatDate(order.prazo_entrega)}</span><h2 className="font-bold text-primary text-lg">{order.numero_pedido}</h2><p>{order.cliente_nome || 'Cliente não informado'}</p></div><button className="btn btn-outline px-3 py-2 self-start" onClick={() => printOrder(order.id)}><Printer size={18} /></button></div><div className="my-4 space-y-2">{(order.itens || []).map((item: any) => <div key={item.id} className="text-sm bg-gray-50 rounded-xl p-2"><b>{item.quantidade}x</b> {item.especificacoes?.nome_produto || productsMap[item.produto_id]?.nome || 'Produto'}{item.especificacoes?.detalhes && <div className="text-gray-500">{item.especificacoes.detalhes}</div>}</div>)}</div><div className="grid grid-cols-[1fr_auto] gap-2"><select className="input py-2" value={order.etapa_producao || 'aguardando'} onChange={(e) => updateProduction(order, { etapa_producao: e.target.value })}>{etapas.map((etapa) => <option key={etapa.value} value={etapa.value}>{etapa.label}</option>)}</select><button className={`px-3 rounded-xl font-bold ${order.prioridade === 'urgente' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => updateProduction(order, { prioridade: order.prioridade === 'urgente' ? 'normal' : 'urgente' })}>{order.prioridade === 'urgente' ? 'Urgente' : 'Normal'}</button></div><div className="flex justify-between text-xs text-gray-500 mt-3"><span>{formatMoney(order.total)}</span><span>{Number(order.impressoes || 0)} impressão(ões)</span></div></article>)}</div>{filteredOrders.length === 0 && <div className="card p-10 text-center text-gray-500">Nenhum pedido ativo encontrado.</div>}</div>}
    </div>
  );
}

export default PDV;
